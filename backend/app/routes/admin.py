# app/routes/admin.py
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.loan import Loan, LoanPayment
from ..models.investment import ExternalInvestment
from ..models.contribution import Contribution
from ..utils.decorators import admin_required
from datetime import datetime

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    """Get all users (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        users = User.query.all()
        
        return jsonify({
            "users": [user.to_dict() for user in users]
        }), 200
    except Exception as e:
        import traceback
        print(f"Error getting all users: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    """Create a new user (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all([
            data.get('username'),
            data.get('email'),
            data.get('password'),
            data.get('first_name'),
            data.get('last_name'),
            data.get('phone_number')
        ]):
            return jsonify({"error": "All fields are required"}), 400
            
        # Check if username or email already exists
        if User.query.filter_by(username=data['username']).first():
            return jsonify({"error": "Username already taken"}), 400
            
        if User.query.filter_by(email=data['email']).first():
            return jsonify({"error": "Email already registered"}), 400
        
        # Create new user
        new_user = User(
            username=data['username'],
            email=data['email'],
            first_name=data['first_name'],
            last_name=data['last_name'],
            phone_number=data['phone_number'],
            is_admin=data.get('is_admin', False),
            is_verified=True  # Admin created users are verified by default
        )
        new_user.password = data['password']
        
        db.session.add(new_user)
        db.session.commit()
        
        return jsonify({
            "message": "User created successfully",
            "user": new_user.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error creating user: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        admin_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # Get the user to delete
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Prevent self-deletion
        if user_id == admin_id:
            return jsonify({"error": "Cannot delete your own account"}), 400
            
        # Delete the user
        db.session.delete(user)
        db.session.commit()
        
        return jsonify({
            "message": f"User {user.username} deleted successfully"
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error deleting user: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/contributions', methods=['POST'])
@jwt_required()
@admin_required
def add_contribution():
    """Add contribution manually for a user (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not all([
            data.get('user_id'),
            data.get('amount'),
            data.get('month')
        ]):
            return jsonify({"error": "User ID, amount and month are required"}), 400
            
        # Get the user
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        # Create the contribution
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({"error": "Amount must be greater than zero"}), 400
        except ValueError:
            return jsonify({"error": "Amount must be a number"}), 400
            
        # Parse the month (expecting ISO format like '2024-05-01')
        try:
            month_date = datetime.fromisoformat(data['month'].split('T')[0])
        except ValueError:
            return jsonify({"error": "Invalid date format. Use ISO format (e.g., 2024-05-01)"}), 400
        
        # Create new contribution
        contribution = Contribution(
            user_id=user.id,
            amount=amount,
            month=month_date,
            payment_method=data.get('payment_method', 'manual'),
            transaction_id=data.get('transaction_id', f"MANUAL-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        )
        
        db.session.add(contribution)
        db.session.commit()
        
        return jsonify({
            "message": "Contribution added successfully",
            "contribution": contribution.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error adding contribution: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/loans/<int:loan_id>/payment', methods=['POST'])
@jwt_required()
@admin_required
def add_loan_payment(loan_id):
    """Add manual loan payment (admin only)"""
    try:
        data = request.get_json()
        
        # Validate required fields
        if not data.get('amount'):
            return jsonify({"error": "Payment amount is required"}), 400
            
        # Get the loan
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
            
        # Create the payment
        try:
            amount = float(data['amount'])
            if amount <= 0:
                return jsonify({"error": "Amount must be greater than zero"}), 400
        except ValueError:
            return jsonify({"error": "Amount must be a number"}), 400
            
        # Add payment
        payment_date = datetime.now()
        if data.get('payment_date'):
            try:
                payment_date = datetime.fromisoformat(data['payment_date'].split('T')[0])
            except ValueError:
                return jsonify({"error": "Invalid date format. Use ISO format (e.g., 2024-05-01)"}), 400
                
        # Create payment record
        payment = LoanPayment(
            loan_id=loan.id,
            amount=amount,
            payment_date=payment_date,
            payment_method=data.get('payment_method', 'manual'),
            transaction_id=data.get('transaction_id', f"MANUAL-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        )
        
        # Update loan with payment
        loan.paid_amount += amount
        loan.unpaid_balance = max(0, loan.amount_due - loan.paid_amount)
        
        # Update status if fully paid
        if loan.unpaid_balance == 0:
            loan.status = 'paid'
            loan.paid_date = datetime.now()
        
        db.session.add(payment)
        db.session.commit()
        
        return jsonify({
            "message": "Loan payment added successfully",
            "payment": payment.to_dict(),
            "loan": loan.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error adding loan payment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/loans', methods=['GET'])
@jwt_required()
@admin_required
def get_all_loans():
    """Get all loans (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        loans = Loan.query.all()
        
        return jsonify({
            "loans": [loan.to_dict() for loan in loans]
        }), 200
    except Exception as e:
        import traceback
        print(f"Error getting all loans: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/loans/pending', methods=['GET'])
@jwt_required()
@admin_required
def get_all_pending_loans():
    """Get all pending loans (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        pending_loans = Loan.query.filter_by(status='pending').all()
        
        # Include user details with each loan
        loans_with_users = []
        for loan in pending_loans:
            loan_dict = loan.to_dict()
            user = User.query.get(loan.user_id)
            loan_dict['user'] = {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'email': user.email,
                'phone_number': user.phone_number
            }
            loans_with_users.append(loan_dict)
        
        return jsonify({
            "pending_loans": loans_with_users
        }), 200
    except Exception as e:
        import traceback
        print(f"Error getting pending loans: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/loans/<int:loan_id>/approve', methods=['PUT'])
@jwt_required()
@admin_required
def approve_loan(loan_id):
    """Approve a pending loan (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
        
        if loan.status != 'pending':
            return jsonify({"error": "Only pending loans can be approved"}), 400
        
        # Approve the loan
        loan.approve_loan()
        db.session.commit()
        
        return jsonify({
            "message": "Loan approved successfully",
            "loan": loan.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error approving loan: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/investments', methods=['POST'])
@jwt_required()
@admin_required
def create_investment():
    """Create a new external investment (admin only)"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        admin_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        if not all([
            data.get('amount'),
            data.get('description')
        ]):
            return jsonify({"error": "Amount and description are required"}), 400
        
        try:
            amount = float(data['amount'])
        except ValueError:
            return jsonify({"error": "Amount must be a number"}), 400
        
        if amount <= 0:
            return jsonify({"error": "Amount must be greater than zero"}), 400
        
        # Create new investment
        investment = ExternalInvestment(
            amount=amount,
            description=data['description'],
            admin_id=admin_id,
            expected_return=data.get('expected_return'),
            expected_return_date=data.get('expected_return_date')
        )
        
        db.session.add(investment)
        db.session.commit()
        
        return jsonify({
            "message": "Investment created successfully",
            "investment": investment.to_dict()
        }), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error creating investment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/investments', methods=['GET'])
@jwt_required()
@admin_required
def get_investments():
    """Get all external investments (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        investments = ExternalInvestment.query.all()
        
        return jsonify({
            "investments": [investment.to_dict() for investment in investments]
        }), 200
    except Exception as e:
        import traceback
        print(f"Error getting investments: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/investments/<int:investment_id>', methods=['PUT'])
@jwt_required()
@admin_required
def update_investment(investment_id):
    """Update an external investment (admin only)"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        investment = ExternalInvestment.query.get(investment_id)
        if not investment:
            return jsonify({"error": "Investment not found"}), 404
        
        # Update fields if provided
        if data.get('description'):
            investment.description = data['description']
        if data.get('expected_return'):
            investment.expected_return = float(data['expected_return'])
        if data.get('expected_return_date'):
            investment.expected_return_date = data['expected_return_date']
        if data.get('status'):
            if data['status'] in ['active', 'completed', 'cancelled']:
                investment.status = data['status']
            else:
                return jsonify({"error": "Invalid status"}), 400
        
        db.session.commit()
        
        return jsonify({
            "message": "Investment updated successfully",
            "investment": investment.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error updating investment: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@admin_required
def get_admin_dashboard():
    """Get admin dashboard data"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        # User statistics
        total_users = User.query.count()
        active_users = User.query.filter_by(is_verified=True).count()
        
        # Loan statistics
        total_loans = Loan.query.count()
        pending_loans = Loan.query.filter_by(status='pending').count()
        approved_loans = Loan.query.filter_by(status='approved').count()
        paid_loans = Loan.query.filter_by(status='paid').count()
        
        # Calculate total loan amount
        total_loan_amount = sum(loan.amount for loan in Loan.query.filter_by(status='approved').all())
        
        # Investment statistics
        investments = ExternalInvestment.query.all()
        total_investment = sum(inv.amount for inv in investments)
        active_investments = sum(inv.amount for inv in investments if inv.status == 'active')
        completed_investments = sum(inv.amount for inv in investments if inv.status == 'completed')
        
        # Get recent pending loans for approval
        recent_pending_loans = Loan.query.filter_by(status='pending').order_by(Loan.created_at.desc()).limit(5).all()
        pending_loans_data = []
        
        for loan in recent_pending_loans:
            user = User.query.get(loan.user_id)
            loan_dict = loan.to_dict()
            loan_dict['user'] = {
                'id': user.id,
                'username': user.username,
                'first_name': user.first_name,
                'last_name': user.last_name
            }
            pending_loans_data.append(loan_dict)
        
        return jsonify({
            "users": {
                "total": total_users,
                "active": active_users
            },
            "loans": {
                "total": total_loans,
                "pending": pending_loans,
                "approved": approved_loans,
                "paid": paid_loans,
                "total_amount": total_loan_amount,
                "pending_loans": pending_loans_data
            },
            "investments": {
                "total": total_investment,
                "active": active_investments,
                "completed": completed_investments
            }
        }), 200
    except Exception as e:
        import traceback
        print(f"Error getting admin dashboard: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500
    
# app/routes/admin.py (add this new route)

@admin_bp.route('/loans/<int:loan_id>/reject', methods=['PUT'])
@jwt_required()
@admin_required
def reject_loan(loan_id):
    """Reject a pending loan (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
        
        if loan.status != 'pending':
            return jsonify({"error": "Only pending loans can be rejected"}), 400
        
        # Reject the loan
        loan.status = 'rejected'
        db.session.commit()
        
        return jsonify({
            "message": "Loan rejected successfully",
            "loan": loan.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error rejecting loan: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500