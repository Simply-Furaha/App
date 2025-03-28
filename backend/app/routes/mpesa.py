from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.loan import Loan, LoanPayment
from ..models.contribution import Contribution
from ..services.daraja_service import initiate_stk_push, process_callback
from datetime import datetime

mpesa_bp = Blueprint('mpesa', __name__)

@mpesa_bp.route('/initiate-contribution', methods=['POST'])
@jwt_required()
def initiate_contribution():
    """Initiate M-Pesa STK push for monthly contribution"""
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    if not data.get('amount'):
        return jsonify({"error": "Contribution amount is required"}), 400
    
    try:
        amount = float(data['amount'])
    except ValueError:
        return jsonify({"error": "Amount must be a number"}), 400
    
    if amount <= 0:
        return jsonify({"error": "Amount must be greater than zero"}), 400
    
    # Get user
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Initialize STK push
    stk_response = initiate_stk_push(
        phone_number=user.phone_number,
        amount=amount,
        account_reference="Monthly Contribution",
        transaction_desc=f"Monthly contribution for {user.first_name} {user.last_name}"
    )
    
    if stk_response.get('error'):
        return jsonify({"error": stk_response['error']}), 400
    
    # Return the STK push response to frontend
    return jsonify({
        "message": "Payment initiated. Please check your phone to complete the transaction.",
        "mpesa_response": stk_response
    }), 200

@mpesa_bp.route('/callback', methods=['POST'])
def mpesa_callback():
    """Callback endpoint for M-Pesa payment notifications"""
    # Process the callback data
    callback_data = request.get_json()
    
    result = process_callback(callback_data)
    
    if not result['success']:
        # Log the error but return success to M-Pesa
        print(f"Error processing M-Pesa callback: {result['message']}")
        return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
    
    # Extract transaction details
    transaction = result['transaction']
    receipt_number = transaction.get('receipt_number')
    amount = transaction.get('amount')
    phone_number = transaction.get('phone_number')
    
    # Find user by phone number
    # Strip any country code prefix for matching
    if phone_number.startswith('254'):
        phone_number = '0' + phone_number[3:]
    
    user = User.query.filter(User.phone_number.like(f"%{phone_number[-9:]}")).first()
    
    if not user:
        print(f"No user found with phone number: {phone_number}")
        return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
    
    # Check if this is a loan repayment or a contribution
    # This would typically be determined by the account reference or metadata
    # For now, we'll use a simple approach based on the callback metadata
    
    # Extract MerchantRequestID to match with the one stored during initiation
    merchant_request_id = callback_data.get('Body', {}).get('stkCallback', {}).get('MerchantRequestID')
    
    # In a real system, you would store the MerchantRequestID during initiation
    # and associate it with either a loan repayment or contribution
    # For this example, we'll assume a simple logic:
    
    # Check if there's an ongoing loan that needs repayment
    active_loan = user.loans.filter_by(status='approved').first()
    
    if active_loan:
        # Process as loan repayment
        active_loan.make_payment(amount, transaction_id=receipt_number)
        return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200
    else:
        # Process as monthly contribution
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
        
        return jsonify({"ResponseCode": "0", "ResponseDesc": "Accepted"}), 200