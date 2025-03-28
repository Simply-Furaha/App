import requests
import base64
import json
from datetime import datetime
from flask import current_app
import logging

logger = logging.getLogger(__name__)

def get_auth_token():
    """Get OAuth token from Safaricom"""
    consumer_key = current_app.config['MPESA_CONSUMER_KEY']
    consumer_secret = current_app.config['MPESA_CONSUMER_SECRET']
    
    url = "https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials"
    
    # Create the auth string and encode it to base64
    auth_string = f"{consumer_key}:{consumer_secret}"
    encoded_auth = base64.b64encode(auth_string.encode()).decode('utf-8')
    
    headers = {
        "Authorization": f"Basic {encoded_auth}"
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status()  # Raise exception for HTTP errors
        
        result = response.json()
        token = result.get('access_token')
        return token
    except requests.exceptions.RequestException as e:
        logger.error(f"Error getting auth token: {e}")
        return None

def initiate_stk_push(phone_number, amount, account_reference, transaction_desc):
    """
    Initiate STK push to customer's phone
    
    Args:
        phone_number: Customer's phone number (format: 254XXXXXXXXX)
        amount: Amount to charge
        account_reference: Reference for the transaction (e.g. 'Contribution', 'Loan Repayment')
        transaction_desc: Description of the transaction
        
    Returns:
        dict: Response from M-Pesa API
    """
    token = get_auth_token()
    if not token:
        return {"error": "Could not get authentication token"}
    
    # Format timestamp for the API
    timestamp = datetime.now().strftime('%Y%m%d%H%M%S')
    
    # Prepare the password
    shortcode = current_app.config['MPESA_SHORTCODE']
    passkey = current_app.config['MPESA_PASSKEY']
    password = base64.b64encode(f"{shortcode}{passkey}{timestamp}".encode()).decode('utf-8')
    
    # Prepare the request
    url = "https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    # Format phone number (ensure it starts with 2547)
    if phone_number.startswith('+'):
        phone_number = phone_number[1:]
    if phone_number.startswith('0'):
        phone_number = '254' + phone_number[1:]
    if not phone_number.startswith('254'):
        phone_number = '254' + phone_number
    
    payload = {
        "BusinessShortCode": shortcode,
        "Password": password,
        "Timestamp": timestamp,
        "TransactionType": "CustomerPayBillOnline",
        "Amount": int(amount),
        "PartyA": phone_number,
        "PartyB": shortcode,
        "PhoneNumber": phone_number,
        "CallBackURL": current_app.config['MPESA_CALLBACK_URL'],
        "AccountReference": account_reference,
        "TransactionDesc": transaction_desc
    }
    
    try:
        response = requests.post(url, json=payload, headers=headers)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.RequestException as e:
        logger.error(f"Error initiating STK push: {e}")
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
        # Extract the relevant information from the callback
        body = callback_data.get('Body', {})
        stkCallback = body.get('stkCallback', {})
        
        result_code = stkCallback.get('ResultCode')
        
        # Check if transaction was successful
        if result_code != 0:
            return {
                'success': False,
                'message': stkCallback.get('ResultDesc', 'Transaction failed')
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
            
        return {
            'success': True,
            'transaction': transaction_details
        }
    except Exception as e:
        logger.error(f"Error processing callback: {e}")
        return {'success': False, 'message': str(e)}