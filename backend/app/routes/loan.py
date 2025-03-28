from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.loan import Loan
from ..services.daraja_service import initiate_stk_push

loan_bp = Blueprint('loan', __name__)

@loan_bp.route('', methods=['POST'])
@jwt_required()
def apply_for_loan():
    """Apply for a new loan"""
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    if not data.get('amount'):
        return jsonify({"error": "Loan amount is required"}), 400
    
    try:
        amount = float(data['amount'])
    except ValueError:
        return jsonify({"error": "Loan amount must be a number"}), 400
    
    if amount <= 0:
        return jsonify({"error": "Loan amount must be greater than zero"}), 400
    
    # Get user and check eligibility
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Check if user has any pending loan applications
    pending_loans = user.loans.filter_by(status='pending').first()
    if pending_loans:
        return jsonify({"error": "You already have a pending loan application"}), 400
    
    # Check available loan limit
    available_limit = user.available_loan_limit()
    if amount > available_limit:
        return jsonify({
            "error": f"Requested amount exceeds your available loan limit of {available_limit}"
        }), 400
    
    # Create new loan application
    loan = Loan(
        user_id=user.id,
        amount=amount,
        status='pending'
    )
    
    db.session.add(loan)
    db.session.commit()
    
    return jsonify({
        "message": "Loan application submitted successfully",
        "loan": loan.to_dict()
    }), 201

@loan_bp.route('', methods=['GET'])
@jwt_required()
def get_user_loans():
    """Get all loans for the current user"""
    current_user_id = get_jwt_identity()
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get all loans for the user
    loans = user.loans.all()
    
    return jsonify({
        "loans": [loan.to_dict() for loan in loans]
    }), 200

@loan_bp.route('/<int:loan_id>', methods=['GET'])
@jwt_required()
def get_loan_details(loan_id):
    """Get details for a specific loan"""
    current_user_id = get_jwt_identity()
    
    # Get the loan
    loan = Loan.query.get(loan_id)
    if not loan:
        return jsonify({"error": "Loan not found"}), 404
    
    # Check if the loan belongs to the current user
    if loan.user_id != current_user_id:
        # Allow admins to view any loan
        user = User.query.get(current_user_id)
        if not user or not user.is_admin:
            return jsonify({"error": "Access denied"}), 403
    
    # Get loan payments
    payments = [payment.to_dict() for payment in loan.payments]
    
    return jsonify({
        "loan": loan.to_dict(),
        "payments": payments
    }), 200

@loan_bp.route('/pending', methods=['GET'])
@jwt_required()
def get_pending_loans():
    """Get pending loan applications for the current user"""
    current_user_id = get_jwt_identity()
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get pending loans
    pending_loans = user.loans.filter_by(status='pending').all()
    
    return jsonify({
        "pending_loans": [loan.to_dict() for loan in pending_loans]
    }), 200

@loan_bp.route('/approved', methods=['GET'])
@jwt_required()
def get_approved_loans():
    """Get approved loan applications for the current user"""
    current_user_id = get_jwt_identity()
    
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Get approved loans
    approved_loans = user.loans.filter_by(status='approved').all()
    
    return jsonify({
        "approved_loans": [loan.to_dict() for loan in approved_loans]
    }), 200

@loan_bp.route('/<int:loan_id>/repay', methods=['POST'])
@jwt_required()
def repay_loan(loan_id):
    """Initiate loan repayment"""
    data = request.get_json()
    current_user_id = get_jwt_identity()
    
    if not data.get('amount'):
        return jsonify({"error": "Payment amount is required"}), 400
    
    try:
        amount = float(data['amount'])
    except ValueError:
        return jsonify({"error": "Payment amount must be a number"}), 400
    
    if amount <= 0:
        return jsonify({"error": "Payment amount must be greater than zero"}), 400
    
    # Get the loan
    loan = Loan.query.get(loan_id)
    if not loan:
        return jsonify({"error": "Loan not found"}), 404
    
    # Check if the loan belongs to the current user
    if loan.user_id != current_user_id:
        return jsonify({"error": "Access denied"}), 403
    
    # Check if loan is approved
    if loan.status != 'approved':
        return jsonify({"error": "Only approved loans can be repaid"}), 400
    
    # Get user
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({"error": "User not found"}), 404
    
    # Initiate STK push for payment
    stk_response = initiate_stk_push(
        phone_number=user.phone_number,
        amount=amount,
        account_reference=f"Loan Repayment #{loan.id}",
        transaction_desc=f"Repayment for loan #{loan.id}"
    )
    
    if stk_response.get('error'):
        return jsonify({"error": stk_response['error']}), 400
    
    # Return the STK push response to frontend
    return jsonify({
        "message": "Payment initiated. Please check your phone to complete the transaction.",
        "mpesa_response": stk_response
    }), 200