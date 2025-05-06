import requests
import base64
import json
from datetime import datetime
from flask import current_app
import logging
import traceback

logger = logging.getLogger(__name__)

def get_auth_token():
    """Get OAuth token from Safaricom"""
    try:
        consumer_key = current_app.config['MPESA_CONSUMER_KEY']
        consumer_secret = current_app.config['MPESA_CONSUMER_SECRET']
        
        if not consumer_key or not consumer_secret:
            logger.error("Missing MPESA_CONSUMER_KEY or MPESA_CONSUMER_SECRET in configuration")
            return None
            
        # Safaricom OAuth URL - use sandbox or production based on configuration
        is_prod = current_app.config.get('MPESA_PRODUCTION', False)
        url = "https://api.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        
        if not is_prod:
            url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
        
        logger.info(f"Getting Daraja auth token from: {url}")
        
        # Create the auth string and encode it to base64
        auth_string = f"{consumer_key}:{consumer_secret}"
        encoded_auth = base64.b64encode(auth_string.encode()).decode('utf-8')
        
        headers = {
            "Authorization": f"Basic {encoded_auth}"
        }
        
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        result = response.json()
        token = result.get('access_token')
        if not token:
            logger.error(f"Invalid token response: {result}")
            return None
            
        logger.info("Successfully obtained Daraja auth token")
        return token
    except Exception as e:
        logger.error(f"Error getting auth token: {str(e)}")
        logger.error(traceback.format_exc())
        return None

def format_phone_number(phone_number):
    """Format phone number to 254XXXXXXXXX format"""
    try:
        # Remove any whitespace
        phone = phone_number.strip()
        
        # Remove the plus sign if present
        if phone.startswith('+'):
            phone = phone[1:]
            
        # If it starts with 0, replace with 254
        if phone.startswith('0'):
            phone = '254' + phone[1:]
            
        # If it doesn't start with 254, add it
        if not phone.startswith('254'):
            phone = '254' + phone
            
        # Ensure it's a valid phone number (should be 12 digits for Kenya)
        if not phone.isdigit() or len(phone) != 12:
            logger.warning(f"Potentially invalid phone number format: {phone}")
            
        return phone
    except Exception as e:
        logger.error(f"Error formatting phone number: {str(e)}")
        return phone_number  # Return original if there's an error

def initiate_stk_push(phone_number, amount, account_reference, transaction_desc):
    """
    Initiate STK push to customer's phone
    
    Args:
        phone_number: Customer's phone number (will be formatted to 254XXXXXXXXX)
        amount: Amount to charge
        account_reference: Reference for the transaction (e.g. 'Contribution', 'Loan Repayment')
        transaction_desc: Description of the transaction
        
    Returns:
        dict: Response from M-Pesa API
    """
    try:
        token = get_auth_token()
        if not token:
            return {"error": "Could not get authentication token"}
        
        # Get configuration values
        is_prod = current_app.config.get('MPESA_PRODUCTION', False)
        shortcode = current_app.config['MPESA_SHORTCODE']
        passkey = current_app.config['MPESA_PASSKEY']
        callback_url = current_app.config['MPESA_CALLBACK_URL']
        
        if not all([shortcode, passkey, callback_url]):
            logger.error("Missing required MPESA configuration")
            return {"error": "Missing required MPESA configuration"}
        
        # Format timestamp for the API (YYYYMMDDHHmmss)
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Prepare the password (shortcode + passkey + timestamp)
        password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode('utf-8')
        
        # Format the phone number
        formatted_phone = format_phone_number(phone_number)
        
        # Select the appropriate URL based on environment
        url = "https://api.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        if not is_prod:
            url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
        
        logger.info(f"Initiating STK push to phone: {formatted_phone}, amount: {amount}")
        
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
            "Amount": int(amount),  # Amount must be an integer
            "PartyA": formatted_phone,
            "PartyB": shortcode,
            "PhoneNumber": formatted_phone,
            "CallBackURL": callback_url,
            "AccountReference": account_reference if account_reference else "NineFund",
            "TransactionDesc": transaction_desc if transaction_desc else "Payment to NineFund"
        }
        
        logger.info(f"STK push payload: {json.dumps(payload)}")
        
        response = requests.post(url, json=payload, headers=headers)
        
        # Log the response for debugging
        logger.info(f"STK push response status: {response.status_code}")
        logger.info(f"STK push response: {response.text}")
        
        if response.status_code != 200:
            logger.error(f"STK push failed with status {response.status_code}: {response.text}")
            return {"error": f"Request failed with status code {response.status_code}"}
        
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Network error during STK push: {str(e)}")
        return {"error": f"Network error: {str(e)}"}
    except Exception as e:
        logger.error(f"Error initiating STK push: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}

def check_stk_push_status(checkout_request_id):
    """
    Check the status of an STK push transaction
    
    Args:
        checkout_request_id: The CheckoutRequestID from the STK push response
        
    Returns:
        dict: Response with transaction status
    """
    try:
        token = get_auth_token()
        if not token:
            return {"error": "Could not get authentication token"}
        
        # Get configuration values
        is_prod = current_app.config.get('MPESA_PRODUCTION', False)
        shortcode = current_app.config['MPESA_SHORTCODE']
        passkey = current_app.config['MPESA_PASSKEY']
        
        # Format timestamp for the API
        timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
        
        # Prepare the password
        password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode('utf-8')
        
        # Select the appropriate URL based on environment
        url = "https://api.safaricom.co.ke/mpesa/stkpushquery/v1/query"
        if not is_prod:
            url = "https://sandbox.safaricom.co.ke/mpesa/stkpushquery/v1/query"
        
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
        
        logger.info(f"Checking STK push status for request ID: {checkout_request_id}")
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"STK status check failed: {response.text}")
            return {"error": f"Request failed with status code {response.status_code}"}
        
        return response.json()
    except Exception as e:
        logger.error(f"Error checking STK push status: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}

def process_callback(callback_data):
    """
    Process callback data from M-Pesa
    
    Args:
        callback_data: JSON data from M-Pesa callback
        
    Returns:
        dict: Processed transaction details
    """
    try:
        logger.info("Processing M-PESA callback data")
        logger.info(f"Callback data: {json.dumps(callback_data)}")
        
        # Extract the relevant information from the callback
        body = callback_data.get('Body', {})
        stkCallback = body.get('stkCallback', {})
        
        result_code = stkCallback.get('ResultCode')
        result_desc = stkCallback.get('ResultDesc', '')
        
        # Check if transaction was successful
        if result_code != 0:
            logger.error(f"Transaction failed: {result_desc}")
            return {
                'success': False,
                'message': result_desc
            }
        
        # Extract transaction details
        metadata = stkCallback.get('CallbackMetadata', {})
        items = metadata.get('Item', [])
        
        transaction_details = {}
        
        for item in items:
            name = item.get('Name')
            value = item.get('Value')
            
            if name == 'MpesaReceiptNumber':
                transaction_details['receipt_number'] = value
            elif name == 'Amount':
                transaction_details['amount'] = value
            elif name == 'TransactionDate':
                transaction_details['transaction_date'] = value
            elif name == 'PhoneNumber':
                transaction_details['phone_number'] = value
            
        logger.info(f"Processed transaction details: {transaction_details}")
        
        return {
            'success': True,
            'transaction': transaction_details
        }
    except Exception as e:
        logger.error(f"Error processing callback: {str(e)}")
        logger.error(traceback.format_exc())
        return {'success': False, 'message': str(e)}

def register_c2b_urls():
    """
    Register validation and confirmation URLs for C2B transactions
    Only needs to be run once during setup
    
    Returns:
        dict: Response from M-Pesa API
    """
    try:
        token = get_auth_token()
        if not token:
            return {"error": "Could not get authentication token"}
        
        is_prod = current_app.config.get('MPESA_PRODUCTION', False)
        shortcode = current_app.config['MPESA_SHORTCODE']
        
        validation_url = current_app.config.get('MPESA_VALIDATION_URL')
        confirmation_url = current_app.config.get('MPESA_CONFIRMATION_URL')
        
        if not all([shortcode, validation_url, confirmation_url]):
            return {"error": "Missing required configuration"}
        
        # Select the appropriate URL based on environment
        url = "https://api.safaricom.co.ke/mpesa/c2b/v1/registerurl"
        if not is_prod:
            url = "https://sandbox.safaricom.co.ke/mpesa/c2b/v1/registerurl"
        
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        payload = {
            "ShortCode": shortcode,
            "ResponseType": "Completed",
            "ConfirmationURL": confirmation_url,
            "ValidationURL": validation_url
        }
        
        logger.info(f"Registering C2B URLs for shortcode {shortcode}")
        
        response = requests.post(url, json=payload, headers=headers)
        
        if response.status_code != 200:
            logger.error(f"C2B URL registration failed: {response.text}")
            return {"error": f"Request failed with status code {response.status_code}"}
        
        return response.json()
    except Exception as e:
        logger.error(f"Error registering C2B URLs: {str(e)}")
        logger.error(traceback.format_exc())
        return {"error": str(e)}