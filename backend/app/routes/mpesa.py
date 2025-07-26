# app/routes/mpesa.py - COMPLETE ENHANCED VERSION (Replace your existing file)
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.contribution import Contribution
from ..models.loan import Loan, LoanPayment
from ..models.payment_status import PaymentStatus
from ..services.daraja_service import initiate_stk_push, process_callback, validate_callback_security, simulate_callback_response
from datetime import datetime, date
import traceback
import logging
import json

logger = logging.getLogger(__name__)
mpesa_bp = Blueprint('mpesa', __name__)

# ============= STK PUSH ENDPOINTS =============

@mpesa_bp.route('/initiate-contribution', methods=['POST'])
@jwt_required()
def initiate_contribution():
    """Initiate M-PESA STK push for monthly contribution - ENHANCED"""
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
        
        # Check for duplicate contribution this month (optional check)
        today = date.today()
        current_month = today.replace(day=1)  # First day of current month
        
        existing_contribution = Contribution.query.filter_by(
            user_id=user.id,
            month=current_month
        ).first()
        
        # Allow multiple contributions per month, but warn
        if existing_contribution:
            logger.info(f"⚠️ User already has contribution for {current_month.strftime('%B %Y')}: {existing_contribution.amount}")
        
        # Generate unique account reference
        month_str = data.get('month', current_month.strftime('%Y-%m'))
        account_reference = f"CONTRIB-{user_id}-{month_str}"
        transaction_desc = f"Contribution {month_str}"
        
        logger.info(f"🚀 Initiating STK push for contribution:")
        logger.info(f"   User: {user.username}")
        logger.info(f"   Amount: {amount}")
        logger.info(f"   Phone: {phone_number}")
        logger.info(f"   Reference: {account_reference}")
        
        # Initiate STK push using enhanced service
        result = initiate_stk_push(
            phone_number=phone_number,
            amount=amount,
            account_reference=account_reference,
            transaction_desc=transaction_desc,
            transaction_type="contribution",
            user_id=user_id
        )
        
        if result.get('success'):
            logger.info("✅ STK push initiated successfully")
            return jsonify({
                "success": True,
                "message": "Payment request sent to your phone. Please enter your M-PESA PIN to complete the transaction.",
                "checkout_request_id": result.get('checkout_request_id'),
                "merchant_request_id": result.get('merchant_request_id'),
                "amount": amount,
                "phone_number": phone_number
            }), 200
        else:
            logger.error(f"❌ STK push failed: {result}")
            return jsonify({
                "success": False,
                "error": result.get('error', 'Payment initiation failed')
            }), 400
            
    except Exception as e:
        error_details = str(e)
        stack_trace = traceback.format_exc()
        
        logger.error(f"❌ Error initiating contribution: {error_details}")
        logger.error(f"Stack trace: {stack_trace}")
        
        return jsonify({
            "error": "An error occurred while processing your request. Please try again."
        }), 500

@mpesa_bp.route('/contribute', methods=['POST'])
@jwt_required()
def initiate_contribution_v2():
    """Alternative endpoint for contribution payments"""
    return initiate_contribution()

@mpesa_bp.route('/initiate-loan-repayment', methods=['POST'])
@jwt_required()
def initiate_loan_repayment():
    """Initiate M-PESA STK push for loan repayment - ENHANCED"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        logger.info(f"🏦 M-PESA loan repayment request from user ID: {user_id}")
        logger.info(f"Request data: {data}")
        
        # Validate required fields
        if not all([data.get('loan_id'), data.get('amount')]):
            return jsonify({"error": "Loan ID and amount are required"}), 400
        
        try:
            loan_id = int(data['loan_id'])
            amount = float(data['amount'])
        except (ValueError, TypeError):
            return jsonify({"error": "Invalid loan ID or amount"}), 400
        
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400
            
        if amount < 1:
            return jsonify({"error": "Minimum payment amount is KES 1"}), 400
            
        if amount > 70000:
            return jsonify({"error": "Maximum payment amount is KES 70,000"}), 400
        
        # Get and validate loan
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
            
        if loan.user_id != user_id:
            return jsonify({"error": "Unauthorized access to loan"}), 403
            
        if loan.status != 'approved':
            return jsonify({"error": "Loan is not approved for repayment"}), 400
        
        # Get user
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        phone_number = data.get('phone_number', user.phone_number)
        if not phone_number:
            return jsonify({"error": "Phone number is required"}), 400
        
        # Check remaining balance
        remaining_balance = loan.unpaid_balance or (loan.amount_due - loan.paid_amount)
        if remaining_balance <= 0:
            return jsonify({"error": "Loan is already fully paid"}), 400
        
        # Generate unique account reference
        account_reference = f"LOAN-{loan_id}-{user_id}"
        transaction_desc = f"Loan #{loan_id} payment"
        
        logger.info(f"🚀 Initiating STK push for loan repayment:")
        logger.info(f"   User: {user.username}")
        logger.info(f"   Loan ID: {loan_id}")
        logger.info(f"   Amount: {amount}")
        logger.info(f"   Remaining Balance: {remaining_balance}")
        logger.info(f"   Phone: {phone_number}")
        
        # Initiate STK push using enhanced service
        result = initiate_stk_push(
            phone_number=phone_number,
            amount=amount,
            account_reference=account_reference,
            transaction_desc=transaction_desc,
            transaction_type="loan_repayment",
            user_id=user_id
        )
        
        # Update payment status with loan_id for tracking
        if result.get('success') and result.get('checkout_request_id'):
            payment_status = PaymentStatus.query.filter_by(
                checkout_request_id=result['checkout_request_id']
            ).first()
            if payment_status:
                payment_status.loan_id = loan_id
                db.session.commit()
        
        if result.get('success'):
            logger.info("✅ Loan repayment STK push initiated successfully")
            return jsonify({
                "success": True,
                "message": "Payment request sent to your phone. Please enter your M-PESA PIN to complete the transaction.",
                "checkout_request_id": result.get('checkout_request_id'),
                "merchant_request_id": result.get('merchant_request_id'),
                "amount": amount,
                "remaining_balance": remaining_balance,
                "loan_id": loan_id
            }), 200
        else:
            logger.error(f"❌ Loan repayment STK push failed: {result}")
            return jsonify({
                "success": False,
                "error": result.get('error', 'Payment initiation failed')
            }), 400
            
    except Exception as e:
        error_details = str(e)
        stack_trace = traceback.format_exc()
        
        logger.error(f"❌ Error initiating loan repayment: {error_details}")
        logger.error(f"Stack trace: {stack_trace}")
        
        return jsonify({
            "error": "An error occurred while processing your request. Please try again."
        }), 500

@mpesa_bp.route('/repay-loan', methods=['POST'])
@jwt_required()
def initiate_loan_repayment_v2():
    """Alternative endpoint for loan repayment"""
    return initiate_loan_repayment()

# ============= CALLBACK ENDPOINTS =============

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
        logger.info(f"📥 Callback data received: {json.dumps(callback_data, indent=2)}")
        
        if not callback_data:
            logger.error("❌ Empty callback data received")
            return jsonify({
                "ResultCode": 1,
                "ResultDesc": "Invalid callback data"
            }), 200
        
        # Process the callback using enhanced service
        result = process_callback(callback_data)
        
        if result.get('success'):
            logger.info("✅ Callback processed successfully")
            return jsonify({
                "ResultCode": 0,
                "ResultDesc": "Success"
            }), 200
        else:
            logger.error(f"❌ Callback processing failed: {result.get('error')}")
            return jsonify({
                "ResultCode": 1,
                "ResultDesc": "Processing failed"
            }), 200
            
    except Exception as e:
        logger.error(f"❌ Critical error in callback processing: {str(e)}")
        logger.error(traceback.format_exc())
        return jsonify({
            "ResultCode": 1,
            "ResultDesc": "Internal error"
        }), 200

@mpesa_bp.route('/validation', methods=['POST'])
def mpesa_validation():
    """M-PESA validation endpoint - validates incoming transactions"""
    try:
        logger.info("🔍 M-PESA validation request received")
        validation_data = request.get_json()
        logger.info(f"📥 Validation data: {json.dumps(validation_data, indent=2)}")
        
        # Extract validation data
        trans_type = validation_data.get('TransType')
        trans_id = validation_data.get('TransID')
        trans_time = validation_data.get('TransTime')
        trans_amount = validation_data.get('TransAmount', 0)
        business_short_code = validation_data.get('BusinessShortCode')
        bill_ref_number = validation_data.get('BillRefNumber', '')
        invoice_number = validation_data.get('InvoiceNumber', '')
        org_account_balance = validation_data.get('OrgAccountBalance')
        third_party_trans_id = validation_data.get('ThirdPartyTransID', '')
        msisdn = validation_data.get('MSISDN', '')
        first_name = validation_data.get('FirstName', '')
        middle_name = validation_data.get('MiddleName', '')
        last_name = validation_data.get('LastName', '')
        
        logger.info(f"🔍 Validation details:")
        logger.info(f"   Type: {trans_type}")
        logger.info(f"   Amount: {trans_amount}")
        logger.info(f"   Phone: {msisdn}")
        logger.info(f"   Reference: {bill_ref_number}")
        
        # Basic validation checks
        if not trans_amount or float(trans_amount) <= 0:
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
        
        # Additional validation can be added here
        # For now, accept all valid transactions
        
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

# ============= STATUS AND QUERY ENDPOINTS =============

@mpesa_bp.route('/payment-status/<checkout_request_id>', methods=['GET'])
@jwt_required()
def get_payment_status(checkout_request_id):
    """Get payment status for a specific checkout request"""
    try:
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Find payment status
        payment_status = PaymentStatus.query.filter_by(
            checkout_request_id=checkout_request_id,
            user_id=user_id
        ).first()
        
        if not payment_status:
            return jsonify({"error": "Payment status not found"}), 404
        
        return jsonify({
            "success": True,
            "payment_status": payment_status.to_dict()
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting payment status: {str(e)}")
        return jsonify({"error": str(e)}), 500

@mpesa_bp.route('/payment-history', methods=['GET'])
@jwt_required()
def get_payment_history():
    """Get user's M-PESA payment history"""
    try:
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Get query parameters for pagination and filtering
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 10, type=int)
        transaction_type = request.args.get('type')  # contribution or loan_repayment
        status = request.args.get('status')  # pending, success, failed
        
        # Build query
        query = PaymentStatus.query.filter_by(user_id=user_id)
        
        if transaction_type:
            query = query.filter_by(transaction_type=transaction_type)
        if status:
            query = query.filter_by(status=status)
        
        # Order by most recent first
        query = query.order_by(PaymentStatus.created_at.desc())
        
        # Paginate
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        return jsonify({
            "success": True,
            "payments": [payment.to_dict() for payment in pagination.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting payment history: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

@mpesa_bp.route('/user-payments', methods=['GET'])
@jwt_required()
def get_user_payments():
    """Get all pending payments for current user"""
    try:
        current_user_id = get_jwt_identity()
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Get pending payments
        pending_payments = PaymentStatus.query.filter_by(
            user_id=user_id,
            status='pending'
        ).all()
        
        return jsonify({
            "pending_payments": [payment.to_dict() for payment in pending_payments]
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting user payments: {str(e)}")
        return jsonify({"error": str(e)}), 500

# ============= ADMIN ENDPOINTS =============

@mpesa_bp.route('/admin/payment-status', methods=['GET'])
@jwt_required()
def admin_get_all_payments():
    """Get all M-PESA payments (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Check if user is admin
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        
        # Get query parameters
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        status = request.args.get('status')
        transaction_type = request.args.get('type')
        
        # Build query
        query = PaymentStatus.query
        
        if status:
            query = query.filter_by(status=status)
        if transaction_type:
            query = query.filter_by(transaction_type=transaction_type)
        
        # Order by most recent first
        query = query.order_by(PaymentStatus.created_at.desc())
        
        # Paginate
        pagination = query.paginate(
            page=page,
            per_page=per_page,
            error_out=False
        )
        
        # Include user information in response
        payments_data = []
        for payment in pagination.items:
            payment_dict = payment.to_dict()
            if payment.user:
                payment_dict['user'] = {
                    'id': payment.user.id,
                    'username': payment.user.username,
                    'first_name': payment.user.first_name,
                    'last_name': payment.user.last_name
                }
            payments_data.append(payment_dict)
        
        return jsonify({
            "success": True,
            "payments": payments_data,
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting admin payments: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ============= TESTING AND DEBUG ENDPOINTS =============

@mpesa_bp.route('/test-payment', methods=['POST'])
@jwt_required()
def test_payment():
    """Test M-PESA payment in test mode"""
    try:
        if not current_app.config.get('MPESA_TEST_MODE'):
            return jsonify({"error": "Test mode not enabled"}), 400
        
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Validate input
        transaction_type = data.get('type', 'contribution')  # contribution or loan_repayment
        amount = data.get('amount', 100)
        
        if transaction_type not in ['contribution', 'loan_repayment']:
            return jsonify({"error": "Invalid transaction type"}), 400
        
        user = User.query.get(current_user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        logger.info(f"🧪 Test payment: User={user.username}, Type={transaction_type}, Amount={amount}")
        
        if transaction_type == 'contribution':
            account_reference = f"TEST-CONTRIB-{current_user_id}"
            transaction_desc = "Test contribution"
        else:
            # For loan repayment test, use the first approved loan
            loan = Loan.query.filter_by(user_id=current_user_id, status='approved').first()
            if not loan:
                return jsonify({"error": "No approved loans found for testing"}), 400
            
            account_reference = f"TEST-LOAN-{loan.id}"
            transaction_desc = f"Test loan payment"
        
        result = initiate_stk_push(
            phone_number=user.phone_number,
            amount=amount,
            account_reference=account_reference,
            transaction_desc=transaction_desc,
            transaction_type=transaction_type,
            user_id=current_user_id
        )
        
        return jsonify(result), 200 if result.get('success') else 400
        
    except Exception as e:
        logger.error(f"❌ Error in test payment: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

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
        callback_data = simulate_callback_response(
            success=True, 
            amount=amount, 
            phone=user.phone_number
        )
        
        # Process the simulated callback
        result = process_callback(callback_data)
        
        if result['success']:
            return jsonify({
                "message": "Test contribution created successfully",
                "test_mode": True,
                "transaction": result,
                "amount": amount
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
        
        loan_id = data.get('loan_id')
        amount = float(data.get('amount', 1000))
        
        if loan_id:
            loan = Loan.query.get(loan_id)
            if not loan or loan.user_id != user_id:
                return jsonify({"error": "Invalid loan"}), 400
        else:
            # Use first approved loan
            loan = Loan.query.filter_by(user_id=user_id, status='approved').first()
            if not loan:
                return jsonify({"error": "No approved loans found"}), 400
        
        # Simulate successful callback
        callback_data = simulate_callback_response(
            success=True, 
            amount=amount, 
            phone=user.phone_number
        )
        
        # Process the simulated callback
        result = process_callback(callback_data)
        
        if result['success']:
            return jsonify({
                "message": "Test loan repayment created successfully",
                "test_mode": True,
                "transaction": result,
                "loan_id": loan.id,
                "amount": amount
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
        current_user_id = int(get_jwt_identity())
        
        # Check if user is admin
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Admin access required"}), 403
        
        days = request.json.get('days', 7) if request.json else 7
        
        # Delete old payment records
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        old_payments = PaymentStatus.query.filter(
            PaymentStatus.created_at < cutoff_date,
            PaymentStatus.status.in_(['failed', 'timeout'])
        ).all()
        
        count = len(old_payments)
        for payment in old_payments:
            db.session.delete(payment)
        
        db.session.commit()
        
        return jsonify({
            "message": f"Cleaned up {count} old payment records older than {days} days"
        }), 200
        
    except Exception as e:
        logger.error(f"❌ Cleanup error: {str(e)}")
        return jsonify({"error": str(e)}), 500

@mpesa_bp.route('/config-status', methods=['GET'])
def mpesa_config_status():
    """Get M-PESA configuration status"""
    try:
        config_status = {
            "mpesa_configured": bool(current_app.config.get('MPESA_CONSUMER_KEY')),
            "environment": "production" if current_app.config.get('MPESA_PRODUCTION') else "sandbox",
            "test_mode": current_app.config.get('MPESA_TEST_MODE', False),
            "shortcode": current_app.config.get('MPESA_SHORTCODE'),
            "callback_url_configured": bool(current_app.config.get('MPESA_CALLBACK_URL')) and 'example.com' not in current_app.config.get('MPESA_CALLBACK_URL', ''),
            "ngrok_detected": 'ngrok' in current_app.config.get('MPESA_CALLBACK_URL', ''),
            "auth_url": current_app.config.get('MPESA_AUTH_URL'),
            "stk_push_url": current_app.config.get('MPESA_STK_PUSH_URL')
        }
        
        return jsonify(config_status), 200
        
    except Exception as e:
        logger.error(f"❌ Error getting config status: {str(e)}")
        return jsonify({"error": "Internal server error"}), 500

# ============= LEGACY ENDPOINTS (for backward compatibility) =============

@mpesa_bp.route('/status', methods=['GET'])
def mpesa_status():
    """Legacy status endpoint - redirects to config-status"""
    return mpesa_config_status()

# ============= UTILITY FUNCTIONS =============

def process_contribution_payment(user, amount, receipt_number, transaction_details):
    """
    Process contribution payment and handle overpayments
    Legacy function for backward compatibility
    """
    try:
        logger.info(f"💰 Processing contribution payment: User={user.username}, Amount={amount}")
        
        # Expected contribution amount (configurable)
        expected_amount = 3000
        
        # Check for overpayment
        if amount > expected_amount:
            overpayment_amount = amount - expected_amount
            
            # Create overpayment record
            from ..models.overpayment import Overpayment
            overpayment = Overpayment(
                user_id=user.id,
                original_payment_type='contribution',
                expected_amount=expected_amount,
                actual_amount=amount,
                overpayment_amount=overpayment_amount,
                remaining_amount=overpayment_amount
            )
            db.session.add(overpayment)
            
            # Use only expected amount for contribution
            contribution_amount = expected_amount
            logger.info(f"⚠️ Overpayment detected: {overpayment_amount} KES")
        else:
            contribution_amount = amount
        
        # Create contribution record
        contribution = Contribution(
            user_id=user.id,
            amount=contribution_amount,
            month=datetime.now().date().replace(day=1),
            payment_method='mpesa',
            transaction_id=receipt_number
        )
        
        db.session.add(contribution)
        db.session.commit()
        
        logger.info(f"✅ Contribution processed: User={user.username}, Amount={contribution_amount}")
        
        return True, contribution.id
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error processing contribution: {str(e)}")
        return False, None

def process_loan_payment(user, loan_id, amount, receipt_number, transaction_details):
    """
    Process loan payment and handle overpayments
    Legacy function for backward compatibility
    """
    try:
        logger.info(f"🏦 Processing loan payment: User={user.username}, Loan={loan_id}, Amount={amount}")
        
        loan = Loan.query.get(loan_id)
        if not loan or loan.user_id != user.id:
            logger.error(f"❌ Invalid loan: {loan_id} for user {user.id}")
            return False, None
        
        # Calculate remaining balance
        remaining_balance = loan.unpaid_balance or (loan.amount_due - loan.paid_amount)
        
        # Check for overpayment
        if amount > remaining_balance:
            overpayment_amount = amount - remaining_balance
            
            # Create overpayment record
            from ..models.overpayment import Overpayment
            overpayment = Overpayment(
                user_id=user.id,
                original_payment_type='loan_payment',
                expected_amount=remaining_balance,
                actual_amount=amount,
                overpayment_amount=overpayment_amount,
                remaining_amount=overpayment_amount
            )
            db.session.add(overpayment)
            
            # Use only remaining balance for loan payment
            payment_amount = remaining_balance
            logger.info(f"⚠️ Loan overpayment detected: {overpayment_amount} KES")
        else:
            payment_amount = amount
        
        # Create loan payment record
        loan_payment = LoanPayment(
            loan_id=loan.id,
            amount=payment_amount,
            payment_method='mpesa',
            transaction_id=receipt_number
        )
        
        db.session.add(loan_payment)
        
        # Update loan
        loan.paid_amount += payment_amount
        loan.unpaid_balance = max(0, loan.unpaid_balance - payment_amount)
        
        if loan.unpaid_balance <= 0:
            loan.status = 'paid'
            loan.paid_date = datetime.utcnow()
        
        db.session.commit()
        
        logger.info(f"✅ Loan payment processed: User={user.username}, Loan={loan.id}, Amount={payment_amount}")
        
        return True, loan_payment.id
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error processing loan payment: {str(e)}")
        return False, None