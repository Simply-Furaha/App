import requests
import base64
import json
from datetime import datetime
from flask import current_app
import logging
import traceback
import time
import hashlib

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
            logger.info("Using cached Daraja auth token")
            return _token_cache['token']
        
        consumer_key = current_app.config['MPESA_CONSUMER_KEY']
        consumer_secret = current_app.config['MPESA_CONSUMER_SECRET']
        
        if not consumer_key or not consumer_secret:
            logger.error("Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET in configuration")
            return None
        
        # Use the URL from config
        url = current_app.config['MPESA_AUTH_URL']
        logger.info(f"Getting Daraja auth token from: {url}")
        
        # Create the auth string and encode it to base64
        auth_string = f"{consumer_key}:{consumer_secret}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode('utf-8')
        
        headers = {
            "Authorization": f"Basic {encoded_auth}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(url, headers=headers, timeout=30)
        response.raise_for_status()
        
        result = response.json()
        token = result.get('access_token')
        expires_in = result.get('expires_in', 3599)  # Default to ~1 hour
        
        if not token:
            logger.error(f"Invalid token response: {result}")
            return None
        
        # Cache the token (subtract 60 seconds for safety margin)
        _token_cache['token'] = token
        _token_cache['expires_at'] = datetime.now().timestamp() + expires_in - 60
        
        logger.info("Successfully obtained and cached Daraja auth token")
        return token
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error getting auth token: {str(e)}")
        return None
    except Exception as e:
        logger.error(f"Error getting auth token: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def format_phone_number(phone_number):
    """Format phone number to 254XXXXXXXXX format with validation"""
    try:
        # Remove any whitespace and special characters
        phone = str(phone_number).strip().replace(' ', '').replace('-', '').replace('(', '').replace(')', '')
        
        # Remove the plus sign if present
        if phone.startswith('+'):
            phone = phone[1:]
        
        # If it starts with 0, replace with 254
        if phone.startswith('0'):
            phone = '254' + phone[1:]
        
        # If it doesn't start with 254, add it (assuming Kenya)
        if not phone.startswith('254'):
            phone = '254' + phone
        
        # Validate format - should be exactly 12 digits for Kenya
        if not phone.isdigit() or len(phone) != 12:
            logger.warning(f"Invalid phone number format: {phone}")
            raise ValueError(f"Invalid phone number format: {phone}")
        
        # Additional validation - check if it's a valid Kenyan mobile number
        valid_prefixes = ['254701', '254702', '254703', '254704', '254705', '254706', '254707', '254708', '254709',
                         '254710', '254711', '254712', '254713', '254714', '254715', '254716', '254717', '254718', '254719',
                         '254720', '254721', '254722', '254723', '254724', '254725', '254726', '254727', '254728', '254729',
                         '254730', '254731', '254732', '254733', '254734', '254735', '254736', '254737', '254738', '254739',
                         '254740', '254741', '254742', '254743', '254744', '254745', '254746', '254747', '254748', '254749',
                         '254750', '254751', '254752', '254753', '254754', '254755', '254756', '254757', '254758', '254759',
                         '254768', '254769', '254790', '254791', '254792', '254793', '254794', '254795', '254796', '254797', '254798', '254799']
        
        if not any(phone.startswith(prefix) for prefix in valid_prefixes):
            logger.warning(f"Phone number may not be a valid Kenyan mobile number: {phone}")
        
        logger.info(f"Formatted phone number: {phone}")
        return phone
        
    except Exception as e:
        logger.error(f"Error formatting phone number {phone_number}: {str(e)}")
        raise ValueError(f"Invalid phone number: {phone_number}")

def generate_password(shortcode, passkey, timestamp):
    """Generate the M-PESA password"""
    try:
        password_string = f"{shortcode}{passkey}{timestamp}"
        password = base64.b64encode(password_string.encode()).decode('utf-8')
        return password
    except Exception as e:
        logger.error(f"Error generating password: {str(e)}")
        raise

def initiate_stk_push(phone_number, amount, account_reference, transaction_desc, transaction_type="contribution"):
    """
    Initiate STK push to customer's phone
    
    Args:
        phone_number: Customer's phone number
        amount: Amount to charge (will be converted to int)
        account_reference: Reference for the transaction
        transaction_desc: Description of the transaction
        transaction_type: Type of transaction (contribution, loan_repayment)
        
    Returns:
        dict: Response from M-Pesa API
    """
    try:
        logger.info(f"🚀 Initiating STK push: Phone={phone_number}, Amount={amount}, Type={transaction_type}")
        
        token = get_auth_token()
        if not token:
            return {"error": "Could not get authentication token"}
        
        # Get configuration values
        shortcode = current_app.config['MPESA_SHORTCODE']
        passkey = current_app.config['MPESA_PASSKEY']
        callback_url = current_app.config['MPESA_CALLBACK_URL']
        
        if not all([shortcode, passkey, callback_url]):
            logger.error("Missing required MPESA configuration")
            return {"error": "Missing required MPESA configuration"}
        
        # Format timestamp for the API (YYYYMMDDHHmmss)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Generate password
        password = generate_password(shortcode, passkey, timestamp)
        
        # Format the phone number and validate
        try:
            formatted_phone = format_phone_number(phone_number)
        except ValueError as e:
            return {"error": str(e)}
        
        # Ensure amount is integer and within limits
        try:
            amount_int = int(float(amount))
            if amount_int < 1:
                return {"error": "Minimum amount is KES 1"}
            if amount_int > 70000:
                return {"error": "Maximum amount is KES 70,000"}
        except (ValueError, TypeError):
            return {"error": "Invalid amount format"}
        
        # Select the appropriate URL
        url = current_app.config['MPESA_STK_PUSH_URL']
        
        logger.info(f"📱 STK Push Details:")
        logger.info(f"   URL: {url}")
        logger.info(f"   Phone: {formatted_phone}")
        logger.info(f"   Amount: {amount_int}")
        logger.info(f"   Reference: {account_reference}")
        
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
        
        # Make the request with retry logic
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = requests.post(url, json=payload, headers=headers, timeout=60)
                
                logger.info(f"📥 STK push response (attempt {attempt + 1}):")
                logger.info(f"   Status: {response.status_code}")
                logger.info(f"   Response: {response.text}")
                
                if response.status_code == 200:
                    result = response.json()
                    
                    # Check if the response indicates success
                    if result.get('ResponseCode') == '0':
                        logger.info("✅ STK push initiated successfully")
                        return result
                    else:
                        error_msg = result.get('ResponseDescription', 'STK push failed')
                        logger.error(f"❌ STK push failed: {error_msg}")
                        return {"error": error_msg}
                
                elif response.status_code == 401:
                    logger.warning("🔄 Token expired, clearing cache and retrying...")
                    _token_cache['token'] = None
                    _token_cache['expires_at'] = None
                    
                    if attempt < max_retries - 1:
                        time.sleep(2)
                        continue
                    else:
                        return {"error": "Authentication failed"}
                
                else:
                    error_msg = f"Request failed with status {response.status_code}: {response.text}"
                    logger.error(f"❌ {error_msg}")
                    return {"error": error_msg}
                
            except requests.exceptions.Timeout:
                logger.warning(f"⏰ Request timeout (attempt {attempt + 1})")
                if attempt < max_retries - 1:
                    time.sleep(5)
                    continue
                else:
                    return {"error": "Request timeout. Please try again."}
            
            except requests.exceptions.RequestException as e:
                logger.error(f"🌐 Network error (attempt {attempt + 1}): {str(e)}")
                if attempt < max_retries - 1:
                    time.sleep(3)
                    continue
                else:
                    return {"error": f"Network error: {str(e)}"}
        
        return {"error": "Maximum retries exceeded"}
        
    except Exception as e:
        logger.error(f"❌ Unexpected error in STK push: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": "An unexpected error occurred"}

def check_stk_push_status(checkout_request_id):
    """
    Check the status of an STK push transaction
    
    Args:
        checkout_request_id: The CheckoutRequestID from the STK push response
        
    Returns:
        dict: Response with transaction status
    """
    try:
        logger.info(f"🔍 Checking STK push status for: {checkout_request_id}")
        
        token = get_auth_token()
        if not token:
            return {"error": "Could not get authentication token"}
        
        # Get configuration values
        shortcode = current_app.config['MPESA_SHORTCODE']
        passkey = current_app.config['MPESA_PASSKEY']
        
        # Format timestamp for the API
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Generate password
        password = generate_password(shortcode, passkey, timestamp)
        
        # Select the appropriate URL
        url = current_app.config['MPESA_STK_QUERY_URL']
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "BusinessShortCode": shortcode,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id
        }
        
        logger.info(f"📤 Status check payload: {json.dumps(payload, indent=2)}")
        
        response = requests.post(url, json=payload, headers=headers, timeout=30)
        
        logger.info(f"📥 Status check response:")
        logger.info(f"   Status: {response.status_code}")
        logger.info(f"   Response: {response.text}")
        
        if response.status_code == 200:
            result = response.json()
            logger.info("✅ Status check completed successfully")
            return result
        else:
            error_msg = f"Status check failed with status {response.status_code}: {response.text}"
            logger.error(f"❌ {error_msg}")
            return {"error": error_msg}
        
    except Exception as e:
        logger.error(f"❌ Error checking STK push status: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}

def process_callback(callback_data):
    """
    Process callback data from M-Pesa with enhanced validation
    
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
        
        # Check if transaction was successful
        if result_code != 0:
            error_messages = {
                1032: "Transaction cancelled by user",
                1037: "Transaction timed out",
                1025: "Transaction failed - insufficient balance",
                1001: "Transaction failed - invalid phone number",
                1: "Transaction failed - general error"
            }
            
            error_msg = error_messages.get(result_code, result_desc or "Transaction failed")
            logger.error(f"❌ Transaction failed: {error_msg}")
            
            return {
                'success': False,
                'message': error_msg,
                'result_code': result_code,
                'merchant_request_id': merchant_request_id,
                'checkout_request_id': checkout_request_id
            }
        
        # Extract transaction details from successful transaction
        metadata = stkCallback.get('CallbackMetadata', {})
        items = metadata.get('Item', [])
        
        transaction_details = {
            'result_code': result_code,
            'merchant_request_id': merchant_request_id,
            'checkout_request_id': checkout_request_id
        }
        
        for item in items:
            name = item.get('Name')
            value = item.get('Value')
            
            if name == 'MpesaReceiptNumber':
                transaction_details['receipt_number'] = str(value)
            elif name == 'Amount':
                transaction_details['amount'] = float(value)
            elif name == 'TransactionDate':
                transaction_details['transaction_date'] = value
                # Parse the transaction date
                try:
                    # M-PESA date format: 20231201143045 (YYYYMMDDHHmmss)
                    if isinstance(value, (int, str)) and len(str(value)) == 14:
                        date_str = str(value)
                        parsed_date = datetime.strptime(date_str, '%Y%m%d%H%M%S')
                        transaction_details['parsed_date'] = parsed_date
                except Exception as date_error:
                    logger.warning(f"Could not parse transaction date {value}: {date_error}")
            elif name == 'PhoneNumber':
                transaction_details['phone_number'] = str(value)
        
        logger.info(f"💰 Processed transaction details: {json.dumps(transaction_details, indent=2, default=str)}")
        
        # Validate that we have the essential details
        required_fields = ['receipt_number', 'amount', 'phone_number']
        missing_fields = [field for field in required_fields if field not in transaction_details]
        
        if missing_fields:
            logger.error(f"❌ Missing required transaction fields: {missing_fields}")
            return {
                'success': False,
                'message': f"Incomplete transaction data: missing {', '.join(missing_fields)}"
            }
        
        return {
            'success': True,
            'transaction': transaction_details
        }
        
    except Exception as e:
        logger.error(f"❌ Error processing callback: {str(e)}")
        logger.error(traceback.format_exc())
        return {'success': False, 'message': str(e)}

def validate_callback_security(request):
    """
    Validate M-PESA callback security (basic validation)
    In production, implement proper signature validation
    """
    try:
        # Basic validation - check if request comes from expected source
        # In production, implement proper signature validation with Safaricom's public key
        
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
                            {"Name": "TransactionDate", "Value": int(datetime.now().strftime('%Y%m%d%H%M%S'))},
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