from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.loan import Loan, LoanPayment
from ..models.contribution import Contribution
from ..services.daraja_service import initiate_stk_push, process_callback
from datetime import datetime
import traceback
import logging

logger = logging.getLogger(__name__)
mpesa_bp = Blueprint('mpesa', __name__)

@mpesa_bp.route('/initiate-contribution', methods=['POST'])
@jwt_required()
def initiate_contribution():
    """Initiate M-Pesa STK push for monthly contribution"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Debug info
        print(f"Initiating contribution for user ID: {user_id}")
        print(f"Request data: {data}")
        
        if not data.get('amount'):
            return jsonify({"error": "Contribution amount is required"}), 400
        
        try:
            amount = float(data['amount'])
        except ValueError:
            return jsonify({"error": "Amount must be a number"}), 400
        
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400
        
        # Get user
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Use provided phone number or fall back to user's phone number
        phone_number = data.get('phone_number', user.phone_number)
        
        print(f"Using phone number: {phone_number}")
        
        # For development/testing, you can bypass actual M-PESA call and simulate success
        use_test_mode = current_app.config.get('MPESA_TEST_MODE', False)
        
        if use_test_mode:
            # Skip actual M-PESA call and return a simulated success response
            print("Using test mode - simulating M-PESA success")
            return jsonify({
                "message": "Payment initiated (TEST MODE). Simulating successful transaction.",
                "mpesa_response": {
                    "MerchantRequestID": "test-123",
                    "CheckoutRequestID": "test-456",
                    "ResponseCode": "0",
                    "ResponseDescription": "Success. Request accepted for processing",
                    "CustomerMessage": "Success. Request accepted for processing"
                }
            }), 200
        
        # Normal M-PESA flow
        # Initialize STK push
        stk_response = initiate_stk_push(
            phone_number=phone_number,
            amount=amount,
            account_reference="NineFund Contribution",
            transaction_desc=f"Monthly contribution for {user.first_name} {user.last_name}"
        )
        
        print(f"STK push response: {stk_response}")
        
        if stk_response.get('error'):
            return jsonify({"error": stk_response['error']}), 400
            
        # Return the STK push response to frontend
        return jsonify({
            "message": "Payment initiated. Please check your phone to complete the transaction.",
            "mpesa_response": stk_response
        }), 200
    except Exception as e:
        error_details = str(e)
        stack_trace = traceback.format_exc()
        
        print(f"Error initiating contribution: {error_details}")
        print(f"Stack trace: {stack_trace}")
        
        return jsonify({"error": "An error occurred while processing your request"}), 500

@mpesa_bp.route('/callback', methods=['POST'])
def mpesa_callback():
    """Callback endpoint for M-Pesa payment notifications"""
    try:
        # Log the entire request for debugging
        print("Received M-PESA callback")
        print(f"Headers: {request.headers}")
        print(f"Data: {request.get_data(as_text=True)}")
        
        # Process the callback data
        callback_data = request.get_json()
        
        # Basic validation to ensure it's a valid callback
        if not callback_data or not isinstance(callback_data, dict):
            print("Invalid callback data - not a JSON object")
            return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
        
        # Process the callback (simplified version)
        try:
            # Extract basic information from callback
            body = callback_data.get('Body', {})
            stkCallback = body.get('stkCallback', {})
            result_code = stkCallback.get('ResultCode')
            
            print(f"Processing STK callback with result code: {result_code}")
            
            # If transaction was successful
            if result_code == 0:
                # Extract metadata
                metadata = stkCallback.get('CallbackMetadata', {})
                items = metadata.get('Item', [])
                
                # Extract transaction details
                receipt_number = None
                amount = None
                phone_number = None
                
                for item in items:
                    name = item.get('Name')
                    value = item.get('Value')
                    
                    if name == 'MpesaReceiptNumber':
                        receipt_number = value
                    elif name == 'Amount':
                        amount = value
                    elif name == 'PhoneNumber':
                        phone_number = value
                
                print(f"Transaction details - Receipt: {receipt_number}, Amount: {amount}, Phone: {phone_number}")
                
                # Find user by phone
                if phone_number:
                    # Format phone number for matching
                    formatted_phone = str(phone_number)
                    if formatted_phone.startswith('254'):
                        formatted_phone = '0' + formatted_phone[3:]
                    
                    # Look for user with this phone
                    user = User.query.filter(User.phone_number.like(f"%{formatted_phone[-9:]}")).first()
                    
                    if user:
                        print(f"Found user: {user.username}")
                        
                        # Create contribution record
                        today = datetime.today()
                        first_day_of_month = today.replace(day=1)
                        
                        # Create new contribution
                        contribution = Contribution(
                            user_id=user.id,
                            amount=amount,
                            month=first_day_of_month,
                            payment_method='mpesa',
                            transaction_id=receipt_number
                        )
                        
                        db.session.add(contribution)
                        db.session.commit()
                        print(f"Created contribution record: {contribution.id}")
            
        except Exception as inner_e:
            print(f"Error processing callback data: {str(inner_e)}")
            print(traceback.format_exc())
        
        # Always return success to M-PESA
        return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
    except Exception as e:
        print(f"Error in MPESA callback: {str(e)}")
        print(traceback.format_exc())
        
        # Always return success to M-PESA even if we have errors
        return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200