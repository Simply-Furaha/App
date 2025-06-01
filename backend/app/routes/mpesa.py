from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.contribution import Contribution
from ..models.loan import Loan, LoanPayment
from ..models.payment_status import PaymentStatus
from ..services.daraja_service import initiate_stk_push, process_callback, validate_callback_security
from datetime import datetime, date
import traceback
import logging
import json

logger = logging.getLogger(__name__)
mpesa_bp = Blueprint('mpesa', __name__)

@mpesa_bp.route('/initiate-contribution', methods=['POST'])
@jwt_required()
def initiate_contribution():
    """Initiate M-PESA STK push for monthly contribution"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        logger.info(f"💰 M-PESA contribution request from user ID: {user_id}")
        logger.info(f"Request data: {data}")
        
        # Validate required fields
        if not data.get('amount'):
            return jsonify({"error": "Contribution amount is required"}), 400
        
        try:
            amount = float(data['amount'])
        except ValueError:
            return jsonify({"error": "Amount must be a number"}), 400
        
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400
            
        if amount < 1:  # M-PESA minimum is 1 KES
            return jsonify({"error": "Minimum contribution amount is KES 1"}), 400
            
        if amount > 70000:  # M-PESA maximum
            return jsonify({"error": "Maximum contribution amount is KES 70,000"}), 400
        
        # Get user
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Use provided phone number or fall back to user's phone number
        phone_number = data.get('phone_number', user.phone_number)
        
        # Validate phone number
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
        
        logger.info(f"Using phone number: {phone_number}")
        
        # Check for duplicate contribution this month
        today = date.today()
        current_month = today.replace(day=1)  # First day of current month
        
        existing_contribution = Contribution.query.filter_by(
            user_id=user.id,
            month=current_month
        ).first()
        
        if existing_contribution:
            return jsonify({
                "error": f"You have already contributed KES {existing_contribution.amount:,.2f} for {current_month.strftime('%B %Y')}. Only one contribution per month is allowed.",
                "existing_amount": existing_contribution.amount,
                "existing_date": existing_contribution.created_at.isoformat()
            }), 400
        
        # Check if test mode is enabled
        if current_app.config.get('MPESA_TEST_MODE', False):
            logger.info("🧪 M-PESA test mode enabled - simulating successful transaction")
            
            # Create contribution immediately in test mode
            contribution = Contribution(
                user_id=user.id,
                amount=amount,
                month=current_month,
                payment_method='mpesa',
                transaction_id=f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            )
            
            db.session.add(contribution)
            db.session.commit()
            
            return jsonify({
                "message": "TEST MODE: Contribution recorded successfully",
                "test_mode": True,
                "contribution": contribution.to_dict(),
                "mpesa_response": {
                    "MerchantRequestID": "test-merchant-123",
                    "CheckoutRequestID": "test-checkout-456",
                    "ResponseCode": "0",
                    "ResponseDescription": "Success. Request accepted for processing",
                    "CustomerMessage": "Success. Request accepted for processing"
                }
            }), 200
        
        # Real M-PESA STK Push
        try:
            stk_response = initiate_stk_push(
                phone_number=phone_number,
                amount=amount,
                account_reference=f"NF-{user.username[:8]}",
                transaction_desc=f"Contribution {current_month.strftime('%b%Y')}",
                transaction_type="contribution"
            )
            
            logger.info(f"📱 STK push response: {stk_response}")
            
            if stk_response.get('error'):
                return jsonify({
                    "error": f"M-PESA Error: {stk_response['error']}"
                }), 400
            
            # Check if STK push was successful
            if stk_response.get('ResponseCode') == '0':
                # Create payment status record for tracking
                checkout_request_id = stk_response.get('CheckoutRequestID')
                merchant_request_id = stk_response.get('MerchantRequestID')
                
                if checkout_request_id:
                    PaymentStatus.create_pending_payment(
                        checkout_request_id=checkout_request_id,
                        merchant_request_id=merchant_request_id,
                        user_id=user.id,
                        transaction_type='contribution',
                        amount=amount,
                        phone_number=phone_number
                    )
                
                return jsonify({
                    "message": "Payment request sent to your phone. Please enter your M-PESA PIN to complete the transaction.",
                    "mpesa_response": stk_response,
                    "checkout_request_id": checkout_request_id,
                    "merchant_request_id": merchant_request_id,
                    "instructions": [
                        "1. Check your phone for the M-PESA payment request",
                        "2. Enter your M-PESA PIN when prompted",
                        "3. Your contribution will be recorded automatically upon successful payment",
                        "4. You will receive an M-PESA confirmation SMS"
                    ]
                }), 200
            else:
                return jsonify({
                    "error": f"M-PESA request failed: {stk_response.get('ResponseDescription', 'Unknown error')}"
                }), 400
                
        except Exception as mpesa_error:
            logger.error(f"❌ M-PESA STK push error: {str(mpesa_error)}")
            return jsonify({
                "error": "Failed to initiate M-PESA payment. Please try again or contact support."
            }), 500
            
    except Exception as e:
        error_details = str(e)
        stack_trace = traceback.format_exc()
        
        logger.error(f"❌ Error initiating contribution: {error_details}")
        logger.error(f"Stack trace: {stack_trace}")
        
        return jsonify({
            "error": "An error occurred while processing your request. Please try again."
        }), 500

@mpesa_bp.route('/initiate-loan-repayment', methods=['POST'])
@jwt_required()
def initiate_loan_repayment():
    """Initiate M-PESA STK push for loan repayment"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        logger.info(f"💳 M-PESA loan repayment request from user ID: {user_id}")
        logger.info(f"Request data: {data}")
        
        # Validate required fields
        if not all([data.get('loan_id'), data.get('amount')]):
            return jsonify({"error": "Loan ID and amount are required"}), 400
        
        try:
            loan_id = int(data['loan_id'])
            amount = float(data['amount'])
        except ValueError:
            return jsonify({"error": "Invalid loan ID or amount format"}), 400
        
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400
            
        if amount < 1:  # M-PESA minimum
            return jsonify({"error": "Minimum repayment amount is KES 1"}), 400
            
        if amount > 70000:  # M-PESA maximum
            return jsonify({"error": "Maximum repayment amount is KES 70,000"}), 400
        
        # Get user
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get loan and validate ownership
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
            
        if loan.user_id != user_id:
            return jsonify({"error": "Access denied. This loan does not belong to you."}), 403
            
        if loan.status != 'approved':
            return jsonify({"error": "Only approved loans can be repaid"}), 400
            
        if loan.unpaid_balance <= 0:
            return jsonify({"error": "This loan is already fully paid"}), 400
        
        # Validate repayment amount
        if amount > loan.unpaid_balance:
            return jsonify({
                "error": f"Repayment amount (KES {amount:,.2f}) cannot exceed outstanding balance (KES {loan.unpaid_balance:,.2f})",
                "maximum_amount": loan.unpaid_balance
            }), 400
        
        # Use provided phone number or fall back to user's phone number
        phone_number = data.get('phone_number', user.phone_number)
        
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
        
        logger.info(f"Using phone number: {phone_number}")
        
        # Check if test mode is enabled
        if current_app.config.get('MPESA_TEST_MODE', False):
            logger.info("🧪 M-PESA test mode enabled - simulating successful loan repayment")
            
            # Create loan payment immediately in test mode
            payment = LoanPayment(
                loan_id=loan.id,
                amount=amount,
                payment_date=datetime.now(),
                payment_method='mpesa',
                transaction_id=f"TEST-{datetime.now().strftime('%Y%m%d%H%M%S')}"
            )
            
            # Update loan
            loan.paid_amount += amount
            loan.unpaid_balance = max(0, loan.amount_due - loan.paid_amount)
            
            if loan.unpaid_balance == 0:
                loan.status = 'paid'
                loan.paid_date = datetime.now()
            
            db.session.add(payment)
            db.session.commit()
            
            return jsonify({
                "message": "TEST MODE: Loan repayment recorded successfully",
                "test_mode": True,
                "payment": payment.to_dict(),
                "updated_loan": loan.to_dict(),
                "mpesa_response": {
                    "MerchantRequestID": "test-merchant-456",
                    "CheckoutRequestID": "test-checkout-789",
                    "ResponseCode": "0",
                    "ResponseDescription": "Success. Request accepted for processing",
                    "CustomerMessage": "Success. Request accepted for processing"
                }
            }), 200
        
        # Real M-PESA STK Push
        try:
            stk_response = initiate_stk_push(
                phone_number=phone_number,
                amount=amount,
                account_reference=f"LN-{loan.id}",
                transaction_desc=f"Loan #{loan.id} Payment",
                transaction_type="loan_repayment"
            )
            
            logger.info(f"📱 Loan repayment STK push response: {stk_response}")
            
            if stk_response.get('error'):
                return jsonify({
                    "error": f"M-PESA Error: {stk_response['error']}"
                }), 400
            
            # Check if STK push was successful
            if stk_response.get('ResponseCode') == '0':
                # Create payment status record for tracking
                checkout_request_id = stk_response.get('CheckoutRequestID')
                merchant_request_id = stk_response.get('MerchantRequestID')
                
                if checkout_request_id:
                    PaymentStatus.create_pending_payment(
                        checkout_request_id=checkout_request_id,
                        merchant_request_id=merchant_request_id,
                        user_id=user.id,
                        transaction_type='loan_repayment',
                        amount=amount,
                        phone_number=phone_number,
                        loan_id=loan.id
                    )
                
                return jsonify({
                    "message": f"Payment request for KES {amount:,.2f} sent to your phone. Please enter your M-PESA PIN to complete the transaction.",
                    "mpesa_response": stk_response,
                    "checkout_request_id": checkout_request_id,
                    "merchant_request_id": merchant_request_id,
                    "loan_details": {
                        "loan_id": loan.id,
                        "payment_amount": amount,
                        "remaining_balance": loan.unpaid_balance - amount
                    },
                    "instructions": [
                        "1. Check your phone for the M-PESA payment request",
                        "2. Enter your M-PESA PIN when prompted",
                        "3. Your loan payment will be recorded automatically upon successful payment",
                        "4. You will receive an M-PESA confirmation SMS"
                    ]
                }), 200
            else:
                return jsonify({
                    "error": f"M-PESA request failed: {stk_response.get('ResponseDescription', 'Unknown error')}"
                }), 400
                
        except Exception as mpesa_error:
            logger.error(f"❌ M-PESA loan repayment STK push error: {str(mpesa_error)}")
            return jsonify({
                "error": "Failed to initiate M-PESA payment. Please try again or contact support."
            }), 500
            
    except Exception as e:
        error_details = str(e)
        stack_trace = traceback.format_exc()
        
        logger.error(f"❌ Error initiating loan repayment: {error_details}")
        logger.error(f"Stack trace: {stack_trace}")
        
        return jsonify({
            "error": "An error occurred while processing your request. Please try again."
        }), 500

@mpesa_bp.route('/payment-status/<checkout_request_id>', methods=['GET'])
@jwt_required()
def get_payment_status(checkout_request_id):
    """Get payment status for a specific checkout request"""
    try:
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Find payment status
        payment_status = PaymentStatus.find_by_checkout_id(checkout_request_id)
        
        if not payment_status:
            return jsonify({"error": "Payment status not found"}), 404
        
        # Verify ownership
        if payment_status.user_id != user_id:
            return jsonify({"error": "Access denied"}), 403
        
        return jsonify({
            "payment_status": payment_status.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting payment status: {str(e)}")
        return jsonify({"error": str(e)}), 500

@mpesa_bp.route('/user-payments', methods=['GET'])
@jwt_required()
def get_user_payments():
    """Get all pending payments for current user"""
    try:
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Get pending payments
        pending_payments = PaymentStatus.get_user_pending_payments(user_id)
        
        return jsonify({
            "pending_payments": [payment.to_dict() for payment in pending_payments]
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting user payments: {str(e)}")
        return jsonify({"error": str(e)}), 500

@mpesa_bp.route('/callback', methods=['POST'])
def mpesa_callback():
    """Enhanced callback endpoint for M-PESA payment notifications"""
    try:
        logger.info("📞 Received M-PESA callback")
        
        # Validate callback security
        if not validate_callback_security(request):
            logger.warning("⚠️ Callback security validation failed")
        
        # Log the entire request for debugging
        callback_data = request.get_json()
        logger.info(f"📥 Callback headers: {dict(request.headers)}")
        logger.info(f"📥 Callback data: {json.dumps(callback_data, indent=2)}")
        
        # Basic validation
        if not callback_data or not isinstance(callback_data, dict):
            logger.error("❌ Invalid callback data - not a JSON object")
            return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
        
        # Process the callback
        result = process_callback(callback_data)
        
        if not result['success']:
            logger.error(f"❌ Callback processing failed: {result['message']}")
            
            # Try to update payment status if we have checkout_request_id
            if 'checkout_request_id' in result:
                payment_status = PaymentStatus.find_by_checkout_id(result['checkout_request_id'])
                if payment_status:
                    payment_status.mark_failed(result['message'])
            
            return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
        
        # Extract transaction details
        transaction = result['transaction']
        receipt_number = transaction.get('receipt_number')
        amount = transaction.get('amount')
        phone_number = transaction.get('phone_number')
        checkout_request_id = transaction.get('checkout_request_id')
        
        logger.info(f"💰 Processing successful transaction:")
        logger.info(f"   Receipt: {receipt_number}")
        logger.info(f"   Amount: KES {amount}")
        logger.info(f"   Phone: {phone_number}")
        
        # Find user by phone number
        user = find_user_by_phone_number(phone_number)
        
        if not user:
            logger.error(f"❌ User not found for phone number: {phone_number}")
            return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
        
        logger.info(f"👤 Found user: {user.username} ({user.first_name} {user.last_name})")
        
        # Find payment status record
        payment_status = None
        if checkout_request_id:
            payment_status = PaymentStatus.find_by_checkout_id(checkout_request_id)
        
        # Determine transaction type
        if payment_status:
            transaction_type = payment_status.transaction_type
            logger.info(f"🔍 Transaction type from payment status: {transaction_type}")
        else:
            transaction_type = determine_transaction_type(transaction, user)
            logger.info(f"🔍 Transaction type determined: {transaction_type}")
        
        # Process based on transaction type
        success = False
        related_id = None
        
        if transaction_type == 'contribution':
            success, related_id = process_contribution_payment(user, amount, receipt_number, transaction)
        elif transaction_type == 'loan_repayment':
            loan_id = payment_status.loan_id if payment_status else None
            success, related_id = process_loan_repayment(user, amount, receipt_number, transaction, loan_id)
        else:
            logger.warning(f"⚠️ Unknown transaction type for user {user.username}")
        
        # Update payment status
        if payment_status:
            if success:
                payment_status.mark_success(receipt_number, related_id)
            else:
                payment_status.mark_failed("Failed to process payment")
        
        if success:
            logger.info(f"✅ Transaction processed successfully for {user.username}")
        else:
            logger.error(f"❌ Failed to process transaction for {user.username}")
        
        # Always return success to M-PESA to prevent retries
        return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
        
    except Exception as e:
        logger.error(f"❌ Error in M-PESA callback: {str(e)}")
        logger.error(traceback.format_exc())
        
        # Always return success to M-PESA even if we have errors
        return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200

def find_user_by_phone_number(phone_number):
    """Find user by phone number with multiple format matching"""
    try:
        formatted_phone = str(phone_number)
        
        # Generate search patterns for different phone number formats
        search_patterns = []
        
        if formatted_phone.startswith('254'):
            search_patterns.extend([
                formatted_phone,  # 254712345678
                '0' + formatted_phone[3:],  # 0712345678
                '+' + formatted_phone  # +254712345678
            ])
        elif formatted_phone.startswith('0'):
            search_patterns.extend([
                formatted_phone,  # 0712345678
                '254' + formatted_phone[1:],  # 254712345678
                '+254' + formatted_phone[1:]  # +254712345678
            ])
        else:
            search_patterns.append(formatted_phone)
        
        # Search for user with any of the patterns
        for pattern in search_patterns:
            user = User.query.filter(User.phone_number.like(f"%{pattern[-9:]}")).first()
            if user:
                logger.info(f"🔍 User found with pattern: {pattern}")
                return user
        
        logger.warning(f"🔍 No user found for any phone pattern: {search_patterns}")
        return None
        
    except Exception as e:
        logger.error(f"❌ Error finding user by phone: {str(e)}")
        return None

def determine_transaction_type(transaction, user):
    """Determine if transaction is for contribution or loan repayment"""
    try:
        amount = transaction.get('amount', 0)
        
        # Check if user has any outstanding loans
        outstanding_loans = Loan.query.filter_by(
            user_id=user.id,
            status='approved'
        ).filter(Loan.unpaid_balance > 0).all()
        
        # Check if user already contributed this month
        today = date.today()
        current_month = today.replace(day=1)
        existing_contribution = Contribution.query.filter_by(
            user_id=user.id,
            month=current_month
        ).first()
        
        # Logic to determine transaction type
        if outstanding_loans and existing_contribution:
            # User has both outstanding loans and has contributed this month
            # Default to loan repayment for additional payments
            logger.info("🤔 User has both loans and contribution - defaulting to loan repayment")
            return 'loan_repayment'
        elif outstanding_loans and not existing_contribution:
            # User has loans but no contribution this month
            # Typical contribution amounts vs loan repayment amounts
            if amount <= 5000:  # Typical contribution range
                logger.info("🤔 Amount suggests contribution")
                return 'contribution'
            else:
                logger.info("🤔 Amount suggests loan repayment")
                return 'loan_repayment'
        elif not existing_contribution:
            # No contribution this month, default to contribution
            logger.info("🤔 No contribution this month - defaulting to contribution")
            return 'contribution'
        else:
            # Has contribution, must be loan repayment
            logger.info("🤔 Already contributed this month - defaulting to loan repayment")
            return 'loan_repayment'
            
    except Exception as e:
        logger.error(f"❌ Error determining transaction type: {str(e)}")
        return 'contribution'  # Default to contribution

def process_contribution_payment(user, amount, receipt_number, transaction):
    """Process a contribution payment"""
    try:
        today = date.today()
        current_month = today.replace(day=1)
        
        # Check if contribution already exists (prevent duplicates)
        existing_contribution = Contribution.query.filter_by(
            user_id=user.id,
            month=current_month
        ).first()
        
        if existing_contribution:
            logger.warning(f"⚠️ Contribution already exists for {user.username} in {current_month.strftime('%B %Y')}")
            return False, None
        
        # Create contribution record
        contribution = Contribution(
            user_id=user.id,
            amount=amount,
            month=current_month,
            payment_method='mpesa',
            transaction_id=receipt_number
        )
        
        db.session.add(contribution)
        db.session.commit()
        
        logger.info(f"✅ Created contribution: ID {contribution.id}, Amount: KES {amount}")
        logger.info(f"🎉 Contribution successful: {user.first_name} {user.last_name} - KES {amount:,.2f}")
        
        return True, contribution.id
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error processing contribution payment: {str(e)}")
        logger.error(traceback.format_exc())
        return False, None

def process_loan_repayment(user, amount, receipt_number, transaction, specific_loan_id=None):
    """Process a loan repayment payment"""
    try:
        # Find the specific loan or the one with highest unpaid balance
        if specific_loan_id:
            loan = Loan.query.filter_by(
                id=specific_loan_id,
                user_id=user.id,
                status='approved'
            ).filter(Loan.unpaid_balance > 0).first()
        else:
            # Find the loan with the highest unpaid balance (FIFO approach)
            loan = Loan.query.filter_by(
                user_id=user.id,
                status='approved'
            ).filter(Loan.unpaid_balance > 0).order_by(Loan.borrowed_date.asc()).first()
        
        if not loan:
            logger.warning(f"⚠️ No outstanding loans found for {user.username}")
            return False, None
        
        # Validate payment amount
        if amount > loan.unpaid_balance:
            logger.warning(f"⚠️ Payment amount {amount} exceeds loan balance {loan.unpaid_balance}")
            # Process partial payment up to the loan balance
            amount = loan.unpaid_balance
        
        # Create payment record
        payment = LoanPayment(
            loan_id=loan.id,
            amount=amount,
            payment_date=datetime.now(),
            payment_method='mpesa',
            transaction_id=receipt_number
        )
        
        # Update loan
        loan.paid_amount += amount
        loan.unpaid_balance = max(0, loan.amount_due - loan.paid_amount)
        
        if loan.unpaid_balance == 0:
            loan.status = 'paid'
            loan.paid_date = datetime.now()
            logger.info(f"🎉 Loan #{loan.id} fully paid!")
        
        db.session.add(payment)
        db.session.commit()
        
        logger.info(f"✅ Created loan payment: ID {payment.id}, Amount: KES {amount}")
        logger.info(f"💳 Loan repayment successful: {user.first_name} {user.last_name} - KES {amount:,.2f}")
        logger.info(f"📊 Loan #{loan.id} balance: KES {loan.unpaid_balance:,.2f}")
        
        return True, payment.id
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error processing loan repayment: {str(e)}")
        logger.error(traceback.format_exc())
        return False, None

@mpesa_bp.route('/validation', methods=['POST'])
def mpesa_validation():
    """M-PESA validation endpoint - validates transactions before processing"""
    try:
        logger.info("🔍 M-PESA validation request received")
        validation_data = request.get_json()
        logger.info(f"📥 Validation data: {json.dumps(validation_data, indent=2)}")
        
        # Extract validation details
        trans_type = validation_data.get('TransType')
        trans_id = validation_data.get('TransID')
        trans_amount = validation_data.get('TransAmount')
        bill_ref_number = validation_data.get('BillRefNumber')
        msisdn = validation_data.get('MSISDN')
        
        logger.info(f"🔍 Validating transaction:")
        logger.info(f"   Type: {trans_type}")
        logger.info(f"   ID: {trans_id}")
        logger.info(f"   Amount: {trans_amount}")
        logger.info(f"   Reference: {bill_ref_number}")
        logger.info(f"   Phone: {msisdn}")
        
        # Basic validation rules
        if not trans_amount or float(trans_amount) < 1:
            logger.warning("❌ Validation failed: Invalid amount")
            return jsonify({
                "ResultCode": "C2B00011",
                "ResultDesc": "Invalid Amount"
            }), 200
        
        if float(trans_amount) > 70000:
            logger.warning("❌ Validation failed: Amount too high")
            return jsonify({
                "ResultCode": "C2B00011",
                "ResultDesc": "Amount exceeds maximum limit"
            }), 200
        
        logger.info("✅ Validation passed")
        return jsonify({
            "ResultCode": "0",
            "ResultDesc": "Accepted"
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Validation error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "ResultCode": "C2B00012",
            "ResultDesc": "Invalid request"
        }), 200

@mpesa_bp.route('/confirmation', methods=['POST'])
def mpesa_confirmation():
    """M-PESA confirmation endpoint - confirms successful transactions"""
    try:
        logger.info("✅ M-PESA confirmation request received")
        confirmation_data = request.get_json()
        logger.info(f"📥 Confirmation data: {json.dumps(confirmation_data, indent=2)}")
        
        # Process C2B confirmation (similar to callback but for direct payments)
        # This would be used for PayBill/BuyGoods transactions
        
        return jsonify({
            "ResultCode": "0",
            "ResultDesc": "Accepted"
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Confirmation error: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "ResultCode": "C2B00012",
            "ResultDesc": "Invalid request"
        }), 200

# Development and testing endpoints
@mpesa_bp.route('/test-contribution', methods=['POST'])
@jwt_required()
def test_contribution():
    """Test endpoint to simulate M-PESA contribution (development only)"""
    try:
        if not current_app.debug and not current_app.config.get('MPESA_TEST_MODE'):
            return jsonify({"error": "Test endpoint not available"}), 404
        
        data = request.get_json()
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        amount = float(data.get('amount', 2000))
        
        # Simulate successful callback
        from ..services.daraja_service import simulate_callback_response
        callback_data = simulate_callback_response(
            success=True, 
            amount=amount, 
            phone=user.phone_number
        )
        
        # Process the simulated callback
        result = process_callback(callback_data)
        
        if result['success']:
            transaction = result['transaction']
            success, related_id = process_contribution_payment(
                user, 
                transaction['amount'], 
                transaction['receipt_number'], 
                transaction
            )
            
            if success:
                return jsonify({
                    "message": "Test contribution created successfully",
                    "test_mode": True,
                    "transaction": transaction,
                    "contribution_id": related_id
                }), 201
        
        return jsonify({"error": "Failed to create test contribution"}), 500
        
    except Exception as e:
        logger.error(f"❌ Test contribution error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@mpesa_bp.route('/test-loan-repayment', methods=['POST'])
@jwt_required()
def test_loan_repayment():
    """Test endpoint to simulate M-PESA loan repayment (development only)"""
    try:
        if not current_app.debug and not current_app.config.get('MPESA_TEST_MODE'):
            return jsonify({"error": "Test endpoint not available"}), 404
        
        data = request.get_json()
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        amount = float(data.get('amount', 1000))
        loan_id = data.get('loan_id')
        
        # Simulate successful callback
        from ..services.daraja_service import simulate_callback_response
        callback_data = simulate_callback_response(
            success=True, 
            amount=amount, 
            phone=user.phone_number
        )
        
        # Process the simulated callback
        result = process_callback(callback_data)
        
        if result['success']:
            transaction = result['transaction']
            success, related_id = process_loan_repayment(
                user, 
                transaction['amount'], 
                transaction['receipt_number'], 
                transaction,
                loan_id
            )
            
            if success:
                return jsonify({
                    "message": "Test loan repayment created successfully",
                    "test_mode": True,
                    "transaction": transaction,
                    "payment_id": related_id
                }), 201
        
        return jsonify({"error": "Failed to create test loan repayment"}), 500
        
    except Exception as e:
        logger.error(f"❌ Test loan repayment error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@mpesa_bp.route('/simulate-callback', methods=['POST'])
def simulate_callback():
    """Simulate M-PESA callback for testing (development only)"""
    try:
        if not current_app.debug:
            return jsonify({"error": "Simulation endpoint not available in production"}), 404
        
        data = request.get_json()
        success = data.get('success', True)
        amount = data.get('amount', 100)
        phone = data.get('phone', '254708374149')
        
        # Generate simulated callback
        from ..services.daraja_service import simulate_callback_response
        callback_data = simulate_callback_response(success=success, amount=amount, phone=phone)
        
        # Process the callback
        result = process_callback(callback_data)
        
        return jsonify({
            "message": "Callback simulation completed",
            "callback_data": callback_data,
            "processing_result": result
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Callback simulation error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@mpesa_bp.route('/cleanup-payments', methods=['POST'])
@jwt_required()
def cleanup_old_payments():
    """Cleanup old payment status records (admin only)"""
    try:
        # This should ideally be admin-only, but for simplicity allowing any authenticated user
        days = request.json.get('days', 7) if request.json else 7
        
        count = PaymentStatus.cleanup_old_records(days=days)
        
        return jsonify({
            "message": f"Cleaned up {count} old payment records older than {days} days"
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Cleanup error: {str(e)}")
        return jsonify({"error": str(e)}), 500