# app/services/daraja_service.py - ENHANCED VERSION (Replace your existing file)
import requests
import base64
import json
from datetime import datetime
from flask import current_app
import logging
import traceback
import time
import hashlib
from ..models import db
from ..models.user import User
from ..models.contribution import Contribution
from ..models.loan import Loan, LoanPayment
from ..models.payment_status import PaymentStatus
from ..models.overpayment import Overpayment

logger = logging.getLogger(__name__)

# Cache for auth tokens to avoid frequent API calls
_token_cache = {
    'token': None,
    'expires_at': None
}

def get_auth_token():
    """Get OAuth token from Safaricom with caching"""
    try:
        # Check if we have a valid cached token
        if (_token_cache['token'] and 
            _token_cache['expires_at'] and 
            datetime.now().timestamp() < _token_cache['expires_at']):
            logger.info("✅ Using cached Daraja auth token")
            return _token_cache['token']
        
        consumer_key = current_app.config['MPESA_CONSUMER_KEY']
        consumer_secret = current_app.config['MPESA_CONSUMER_SECRET']
        
        if not consumer_key or not consumer_secret:
            logger.error("❌ Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET")
            return None
        
        url = current_app.config['MPESA_AUTH_URL']
        logger.info(f"🔑 Getting Daraja auth token from: {url}")
        
        # Create the auth string and encode it to base64
        auth_string = f"{consumer_key}:{consumer_secret}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode('utf-8')
        
        headers = {
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/json"
        }
        
        # Check for test mode
        if current_app.config.get('MPESA_TEST_MODE'):
            logger.info("🧪 M-PESA Test Mode: Simulating auth token")
            _token_cache['token'] = "test_token_12345"
            _token_cache['expires_at'] = datetime.now().timestamp() + 3600
            return _token_cache['token']
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        token = result.get('access_token')
        expires_in = result.get('expires_in', 3599)
        
        if not token:
            logger.error(f"❌ Invalid token response: {result}")
            return None
        
        # Cache the token (subtract 60 seconds for safety margin)
        _token_cache['token'] = token
        _token_cache['expires_at'] = datetime.now().timestamp() + expires_in - 60
        
        logger.info("✅ Successfully obtained Daraja auth token")
        return token
        
    except requests.RequestException as e:
        logger.error(f"❌ Network error getting auth token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"❌ Error getting auth token: {str(e)}")
        return None

def format_phone_number(phone_number):
    """Format phone number to 254XXXXXXXXX format"""
    try:
        # Remove any non-digit characters
        phone = ''.join(filter(str.isdigit, str(phone_number)))
        
        # Handle different input formats
        if phone.startswith('254'):
            phone = phone
        elif phone.startswith('0'):
            phone = '254' + phone[1:]
        elif phone.startswith('7') or phone.startswith('1'):
            phone = '254' + phone
        else:
            raise ValueError(f"Invalid phone number format: {phone_number}")
        
        # Validate length (should be 12 digits for Kenyan numbers)
        if len(phone) != 12:
            raise ValueError(f"Invalid phone number length: {phone}")
        
        # Validate Kenyan mobile prefixes
        valid_prefixes = ['254701', '254702', '254703', '254704', '254705', '254706', '254707', '254708', '254709',
                         '254710', '254711', '254712', '254713', '254714', '254715', '254716', '254717', '254718', '254719',
                         '254720', '254721', '254722', '254723', '254724', '254725', '254726', '254727', '254728', '254729',
                         '254730', '254731', '254732', '254733', '254734', '254735', '254736', '254737', '254738', '254739',
                         '254740', '254741', '254742', '254743', '254744', '254745', '254746', '254747', '254748', '254749',
                         '254750', '254751', '254752', '254753', '254754', '254755', '254756', '254757', '254758', '254759',
                         '254768', '254769', '254790', '254791', '254792', '254793', '254794', '254795', '254796', '254797', '254798', '254799']
        
        if not any(phone.startswith(prefix) for prefix in valid_prefixes):
            logger.warning(f"⚠️ Phone number may not be a valid Kenyan mobile: {phone}")
        
        logger.info(f"📱 Formatted phone number: {phone}")
        return phone
        
    except Exception as e:
        logger.error(f"❌ Error formatting phone number {phone_number}: {str(e)}")
        raise ValueError(f"Invalid phone number: {phone_number}")

def generate_password(shortcode, passkey, timestamp):
    """Generate the M-PESA password"""
    try:
        password_string = f"{shortcode}{passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode('utf-8')
        return password
    except Exception as e:
        logger.error(f"❌ Error generating password: {str(e)}")
        raise

def initiate_stk_push(phone_number, amount, account_reference, transaction_desc, transaction_type="contribution", user_id=None):
    """
    Initiate STK push to customer's phone - ENHANCED VERSION
    
    Args:
        phone_number: Customer's phone number
        amount: Amount to charge (will be converted to int)
        account_reference: Reference for the transaction
        transaction_desc: Description of the transaction
        transaction_type: Type of transaction (contribution, loan_repayment)
        user_id: User ID for tracking
        
    Returns:
        dict: Response from M-Pesa API
    """
    try:
        logger.info(f"🚀 Initiating STK push: Phone={phone_number}, Amount={amount}, Type={transaction_type}")
        
        token = get_auth_token()
        if not token:
            return {"success": False, "error": "Could not get authentication token"}
        
        # Get configuration values
        shortcode = current_app.config['MPESA_SHORTCODE']
        passkey = current_app.config['MPESA_PASSKEY']
        callback_url = current_app.config['MPESA_CALLBACK_URL']
        
        if not all([shortcode, passkey, callback_url]):
            logger.error("❌ Missing required MPESA configuration")
            return {"success": False, "error": "Missing required MPESA configuration"}
        
        # Format timestamp for the API (YYYYMMDDHHmmss)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Generate password
        password = generate_password(shortcode, passkey, timestamp)
        
        # Format the phone number and validate
        try:
            formatted_phone = format_phone_number(phone_number)
        except ValueError as e:
            return {"success": False, "error": str(e)}
        
        # Ensure amount is integer and within limits
        try:
            amount_int = int(float(amount))
            if amount_int < 1:
                return {"success": False, "error": "Minimum amount is KES 1"}
            if amount_int > 70000:
                return {"success": False, "error": "Maximum amount is KES 70,000"}
        except (ValueError, TypeError):
            return {"success": False, "error": "Invalid amount format"}
        
        # Generate unique checkout request ID
        checkout_request_id = f"NINEFUND-{transaction_type.upper()}-{int(time.time())}"
        if user_id:
            checkout_request_id += f"-{user_id}"
        
        # Create payment status record for tracking
        if user_id:
            payment_status = PaymentStatus(
                checkout_request_id=checkout_request_id,
                user_id=user_id,
                transaction_type=transaction_type,
                amount=amount_int,
                phone_number=formatted_phone,
                status='pending'
            )
            db.session.add(payment_status)
            db.session.commit()
        
        # Check for test mode
        if current_app.config.get('MPESA_TEST_MODE'):
            logger.info("🧪 M-PESA Test Mode: Simulating STK push")
            return {
                "success": True,
                "checkout_request_id": checkout_request_id,
                "merchant_request_id": f"test-merchant-{int(time.time())}",
                "message": "STK push initiated successfully (TEST MODE)"
            }
        
        # Select the appropriate URL
        url = current_app.config['MPESA_STK_PUSH_URL']
        
        logger.info(f"📱 STK Push Details:")
        logger.info(f"   URL: {url}")
        logger.info(f"   Phone: {formatted_phone}")
        logger.info(f"   Amount: {amount_int}")
        logger.info(f"   Reference: {account_reference}")
        logger.info(f"   Type: {transaction_type}")
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Prepare the request payload
        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount_int,
            "PartyA": formatted_phone,
            "PartyB": shortcode,
            "PhoneNumber": formatted_phone,
            "CallBackURL": callback_url,
            "AccountReference": account_reference[:12],  # M-PESA limit
            "TransactionDesc": transaction_desc[:20]     # M-PESA limit
        }
        
        logger.info(f"📤 STK push payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        logger.info(f"📥 STK push response: {json.dumps(result, indent=2)}")
        
        # Check if the request was successful
        response_code = result.get('ResponseCode', '1')
        if response_code == '0':
            # Update payment status with response details
            if user_id and payment_status:
                payment_status.merchant_request_id = result.get('MerchantRequestID')
                db.session.commit()
            
            logger.info("✅ STK push initiated successfully")
            return {
                "success": True,
                "checkout_request_id": result.get('CheckoutRequestID'),
                "merchant_request_id": result.get('MerchantRequestID'),
                "message": result.get('ResponseDescription', 'STK push initiated successfully')
            }
        else:
            # Update payment status to failed
            if user_id and payment_status:
                payment_status.status = 'failed'
                payment_status.failure_reason = result.get('ResponseDescription', 'STK push failed')
                db.session.commit()
            
            logger.error(f"❌ STK push failed: {result}")
            return {
                "success": False,
                "error": result.get('ResponseDescription', 'STK push failed')
            }
            
    except requests.RequestException as e:
        logger.error(f"❌ Network error during STK push: {str(e)}")
        return {"success": False, "error": "Network error occurred"}
    except Exception as e:
        logger.error(f"❌ Error during STK push: {str(e)}")
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e)}

def process_callback(callback_data):
    """
    Process callback data from M-Pesa with enhanced database integration
    
    Args:
        callback_data: JSON data from M-Pesa callback
        
    Returns:
        dict: Processed transaction details
    """
    try:
        logger.info("📞 Processing M-PESA callback data")
        logger.info(f"📤 Raw callback data: {json.dumps(callback_data, indent=2)}")
        
        # Extract the relevant information from the callback
        body = callback_data.get('Body', {})
        stkCallback = body.get('stkCallback', {})
        
        result_code = stkCallback.get('ResultCode')
        result_desc = stkCallback.get('ResultDesc', '')
        merchant_request_id = stkCallback.get('MerchantRequestID')
        checkout_request_id = stkCallback.get('CheckoutRequestID')
        
        logger.info(f"📊 Callback summary:")
        logger.info(f"   Result Code: {result_code}")
        logger.info(f"   Description: {result_desc}")
        logger.info(f"   Merchant ID: {merchant_request_id}")
        logger.info(f"   Checkout ID: {checkout_request_id}")
        
        if not checkout_request_id:
            logger.error("❌ Missing CheckoutRequestID in callback")
            return {"success": False, "error": "Missing CheckoutRequestID"}
        
        # Find the payment status record
        payment_status = PaymentStatus.query.filter_by(
            checkout_request_id=checkout_request_id
        ).first()
        
        if not payment_status:
            logger.error(f"❌ Payment status not found for checkout ID: {checkout_request_id}")
            return {"success": False, "error": "Payment record not found"}
        
        # Update payment status
        payment_status.merchant_request_id = merchant_request_id
        payment_status.completed_at = datetime.utcnow()
        
        # Check if transaction was successful
        if result_code == 0:
            return process_successful_payment(payment_status, stkCallback)
        else:
            return process_failed_payment(payment_status, result_desc)
            
    except Exception as e:
        logger.error(f"❌ Error processing callback: {str(e)}")
        logger.error(traceback.format_exc())
        return {"success": False, "error": str(e)}

def process_successful_payment(payment_status, stk_callback):
    """Process successful payment and update database"""
    try:
        # Extract payment details from callback
        callback_metadata = stk_callback.get('CallbackMetadata', {}).get('Item', [])
        payment_details = {}
        
        for item in callback_metadata:
            name = item.get('Name')
            value = item.get('Value')
            if name and value is not None:
                payment_details[name] = value
        
        amount = payment_details.get('Amount')
        mpesa_receipt = payment_details.get('MpesaReceiptNumber')
        transaction_date = payment_details.get('TransactionDate')
        phone_number = payment_details.get('PhoneNumber')
        
        logger.info(f"💰 Payment successful: Amount={amount}, Receipt={mpesa_receipt}")
        
        # Update payment status
        payment_status.status = 'success'
        payment_status.mpesa_receipt_number = mpesa_receipt
        
        # Process based on transaction type
        if payment_status.transaction_type == 'contribution':
            return process_contribution_payment(payment_status, amount, mpesa_receipt)
        elif payment_status.transaction_type == 'loan_repayment':
            return process_loan_repayment_payment(payment_status, amount, mpesa_receipt)
        else:
            logger.error(f"❌ Unknown transaction type: {payment_status.transaction_type}")
            return {"success": False, "error": "Unknown transaction type"}
            
    except Exception as e:
        logger.error(f"❌ Error processing successful payment: {str(e)}")
        return {"success": False, "error": str(e)}

def process_contribution_payment(payment_status, amount, mpesa_receipt):
    """Process contribution payment with overpayment handling"""
    try:
        user = User.query.get(payment_status.user_id)
        if not user:
            logger.error(f"❌ User not found: {payment_status.user_id}")
            return {"success": False, "error": "User not found"}
        
        # Expected contribution amount (configurable)
        expected_amount = 3000  # You can make this configurable
        
        # Check for overpayment
        if amount > expected_amount:
            overpayment_amount = amount - expected_amount
            
            # Create overpayment record
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
            month=datetime.now().date().replace(day=1),  # First day of current month
            payment_method='mpesa',
            transaction_id=mpesa_receipt
        )
        
        db.session.add(contribution)
        
        # Link contribution to payment status
        payment_status.contribution_id = contribution.id
        
        db.session.commit()
        
        logger.info(f"✅ Contribution processed: User={user.username}, Amount={contribution_amount}")
        
        result = {
            "success": True,
            "message": f"Contribution of KES {contribution_amount} processed successfully",
            "contribution_id": contribution.id
        }
        
        if amount > expected_amount:
            result["overpayment_amount"] = overpayment_amount
            result["message"] += f". Overpayment of KES {overpayment_amount} recorded."
        
        return result
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error processing contribution: {str(e)}")
        return {"success": False, "error": str(e)}

def process_loan_repayment_payment(payment_status, amount, mpesa_receipt):
    """Process loan repayment with overpayment handling"""
    try:
        loan = Loan.query.get(payment_status.loan_id)
        if not loan:
            logger.error(f"❌ Loan not found: {payment_status.loan_id}")
            return {"success": False, "error": "Loan not found"}
        
        user = User.query.get(payment_status.user_id)
        if not user:
            logger.error(f"❌ User not found: {payment_status.user_id}")
            return {"success": False, "error": "User not found"}
        
        # Calculate remaining balance
        remaining_balance = loan.unpaid_balance or (loan.amount_due - loan.paid_amount)
        
        # Check for overpayment
        if amount > remaining_balance:
            overpayment_amount = amount - remaining_balance
            
            # Create overpayment record
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
            transaction_id=mpesa_receipt
        )
        
        db.session.add(loan_payment)
        
        # Update loan
        loan.paid_amount += payment_amount
        loan.unpaid_balance = max(0, loan.unpaid_balance - payment_amount)
        
        if loan.unpaid_balance <= 0:
            loan.status = 'paid'
            loan.paid_date = datetime.utcnow()
        
        # Link payment to payment status
        payment_status.loan_payment_id = loan_payment.id
        
        db.session.commit()
        
        logger.info(f"✅ Loan payment processed: User={user.username}, Loan={loan.id}, Amount={payment_amount}")
        
        result = {
            "success": True,
            "message": f"Loan payment of KES {payment_amount} processed successfully",
            "loan_payment_id": loan_payment.id,
            "remaining_balance": loan.unpaid_balance,
            "loan_status": loan.status
        }
        
        if amount > remaining_balance:
            result["overpayment_amount"] = overpayment_amount
            result["message"] += f". Overpayment of KES {overpayment_amount} recorded."
        
        return result
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"❌ Error processing loan payment: {str(e)}")
        return {"success": False, "error": str(e)}

def process_failed_payment(payment_status, result_desc):
    """Process failed payment"""
    try:
        payment_status.status = 'failed'
        payment_status.failure_reason = result_desc
        db.session.commit()
        
        logger.info(f"❌ Payment failed: {result_desc}")
        
        return {
            "success": False,
            "error": f"Payment failed: {result_desc}"
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing failed payment: {str(e)}")
        return {"success": False, "error": str(e)}

def validate_callback_security(request):
    """
    Validate M-PESA callback security (basic validation)
    In production, implement proper signature validation
    """
    try:
        # Basic validation - check if request comes from expected source
        user_agent = request.headers.get('User-Agent', '')
        if 'Apache-HttpClient' not in user_agent:
            logger.warning(f"⚠️ Unexpected User-Agent in callback: {user_agent}")
        
        # Log request details for security monitoring
        logger.info(f"🔒 Callback security check:")
        logger.info(f"   IP: {request.remote_addr}")
        logger.info(f"   User-Agent: {user_agent}")
        logger.info(f"   Content-Type: {request.content_type}")
        
        return True
        
    except Exception as e:
        logger.error(f"❌ Callback security validation error: {str(e)}")
        return False

# Utility functions for testing
def simulate_callback_response(success=True, amount=100, phone="254708374149"):
    """Generate a simulated M-PESA callback response for testing"""
    if success:
        return {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "test-merchant-123",
                    "CheckoutRequestID": "test-checkout-456",
                    "ResultCode": 0,
                    "ResultDesc": "The service request is processed successfully.",
                    "CallbackMetadata": {
                        "Item": [
                            {"Name": "Amount", "Value": amount},
                            {"Name": "MpesaReceiptNumber", "Value": f"TEST{int(time.time())}"},
                            {"Name": "TransactionDate", "Value": int(time.time())},
                            {"Name": "PhoneNumber", "Value": phone}
                        ]
                    }
                }
            }
        }
    else:
        return {
            "Body": {
                "stkCallback": {
                    "MerchantRequestID": "test-merchant-123",
                    "CheckoutRequestID": "test-checkout-456",
                    "ResultCode": 1032,
                    "ResultDesc": "Request cancelled by user"
                }
            }
        }