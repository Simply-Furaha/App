from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.loan import Loan
import traceback

loan_bp = Blueprint('loan', __name__)

@loan_bp.route('', methods=['POST'])
@jwt_required()
def apply_for_loan():
    """Apply for a new loan"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Debug output to help diagnose issues
        print(f"Loan application request from user {user_id}")
        print(f"Request data: {data}")
        
        if not data.get('amount'):
            return jsonify({"error": "Loan amount is required"}), 400
        
        try:
            amount = float(data['amount'])
        except ValueError:
            return jsonify({"error": "Loan amount must be a number"}), 400
        
        if amount <= 0:
            return jsonify({"error": "Loan amount must be greater than zero"}), 400
        
        # Get user and check eligibility
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        print(f"User found: {user.username}")
        
        # Check if user has any pending loan applications
        pending_loans = user.loans.filter_by(status='pending').first()
        if pending_loans:
            return jsonify({"error": "You already have a pending loan application"}), 400
        
        # Check available loan limit
        available_limit = user.available_loan_limit()
        print(f"User's available loan limit: {available_limit}")
        
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
        
        print(f"Loan application created successfully: ID {loan.id}, Amount {amount}")
        
        return jsonify({
            "message": "Loan application submitted successfully",
            "loan": loan.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        error_details = str(e)
        stack_trace = traceback.format_exc()
        
        print(f"Error applying for loan: {error_details}")
        print(f"Stack trace: {stack_trace}")
        
        return jsonify({"error": "An error occurred processing your loan application"}), 500

@loan_bp.route('', methods=['GET'])
@jwt_required()
def get_user_loans():
    """Get all loans for the current user"""
    try:
        current_user_id = get_jwt_identity()
        
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get all loans for the user
        loans = user.loans.all()
        
        return jsonify({
            "loans": [loan.to_dict() for loan in loans]
        }), 200
    except Exception as e:
        print(f"Error getting user loans: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@loan_bp.route('/<int:loan_id>', methods=['GET'])
@jwt_required()
def get_loan_details(loan_id):
    """Get details for a specific loan"""
    try:
        current_user_id = get_jwt_identity()
        
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Get the loan
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
        
        # Check if the loan belongs to the current user
        if loan.user_id != user_id:
            # Allow admins to view any loan
            user = User.query.get(user_id)
            if not user or not user.is_admin:
                return jsonify({"error": "Access denied"}), 403
        
        # Get loan payments
        payments = [payment.to_dict() for payment in loan.payments]
        
        return jsonify({
            "loan": loan.to_dict(),
            "payments": payments
        }), 200
    except Exception as e:
        print(f"Error getting loan details: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500