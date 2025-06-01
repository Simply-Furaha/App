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

# Replace the delete_user function in app/routes/admin.py with this clean version

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Delete a user (admin only) - with cascade delete support"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        admin_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        print(f"Admin {admin_id} attempting to delete user {user_id}")
        
        # Get the user to delete
        user = User.query.get(user_id)
        if not user:
            print(f"User {user_id} not found")
            return jsonify({"error": "User not found"}), 404
            
        # Prevent self-deletion
        if user_id == admin_id:
            print(f"Admin {admin_id} tried to delete themselves")
            return jsonify({"error": "Cannot delete your own account"}), 400
        
        username = user.username  # Store username before deletion
        user_stats = {
            'contributions': user.contributions.count(),
            'loans': user.loans.count(),
            'otps': user.otps.count()
        }
        
        print(f"Deleting user: {username}")
        print(f"User has {user_stats['contributions']} contributions, {user_stats['loans']} loans, {user_stats['otps']} OTPs")
        
        # Delete the user - cascade will automatically handle all related records
        db.session.delete(user)
        db.session.commit()
        
        print(f"✓ Successfully deleted user {username} and all related records")
        
        return jsonify({
            "message": f"User {username} deleted successfully along with all related data",
            "deleted_records": user_stats
        }), 200
            
    except Exception as e:
        db.session.rollback()
        import traceback
        error_msg = str(e)
        print(f"Error deleting user: {error_msg}")
        print(traceback.format_exc())
        
        # Provide more specific error messages
        if "FOREIGN KEY constraint failed" in error_msg:
            return jsonify({
                "error": "Cannot delete user due to foreign key constraints. Please run the cascade delete migration."
            }), 500
        else:
            return jsonify({"error": f"Failed to delete user: {error_msg}"}), 500

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

# Replace the get_all_loans function in app/routes/admin.py

@admin_bp.route('/loans', methods=['GET'])
@jwt_required()
@admin_required
def get_all_loans():
    """Get all loans with user details (admin only)"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        loans = Loan.query.all()
        
        # Include user details with each loan
        loans_with_users = []
        for loan in loans:
            loan_dict = loan.to_dict()
            user = User.query.get(loan.user_id)
            if user:  # Check if user exists
                loan_dict['user'] = {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'email': user.email,
                    'phone_number': user.phone_number
                }
            else:
                loan_dict['user'] = None
            loans_with_users.append(loan_dict)
        
        return jsonify({
            "loans": loans_with_users
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
        
        # Parse expected_return_date if provided
        expected_return_date = None
        if data.get('expected_return_date'):
            try:
                expected_return_date = datetime.fromisoformat(data['expected_return_date'])
            except ValueError:
                return jsonify({"error": "Invalid expected return date format. Use YYYY-MM-DD"}), 400
        
        # Parse expected_return if provided
        expected_return = None
        if data.get('expected_return'):
            try:
                expected_return = float(data['expected_return'])
            except ValueError:
                return jsonify({"error": "Expected return must be a number"}), 400
        
        # Create new investment
        investment = ExternalInvestment(
            amount=amount,
            description=data['description'],
            admin_id=admin_id,
            expected_return=expected_return,
            expected_return_date=expected_return_date
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
            try:
                investment.expected_return = float(data['expected_return'])
            except ValueError:
                return jsonify({"error": "Expected return must be a number"}), 400
                
        if data.get('expected_return_date'):
            try:
                investment.expected_return_date = datetime.fromisoformat(data['expected_return_date'])
            except ValueError:
                return jsonify({"error": "Invalid expected return date format. Use YYYY-MM-DD"}), 400
                
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

# Replace the get_admin_dashboard function in app/routes/admin.py

@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@admin_required
def get_admin_dashboard():
    """Get admin dashboard data"""
    try:
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        user_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        print("🔢 Calculating admin dashboard data...")
        
        # User statistics
        total_users = User.query.count()
        active_users = User.query.filter_by(is_verified=True).count()
        print(f"Users: {total_users} total, {active_users} active")
        
        # Calculate total account balance - FIXED CALCULATION
        print("💰 Calculating total account balance...")
        
        # Method 1: Get all contributions
        all_contributions = Contribution.query.all()
        total_contributions = sum(contribution.amount for contribution in all_contributions)
        print(f"Total contributions: {total_contributions}")
        
        # Method 2: Get all loan repayments (paid amounts)
        all_loans = Loan.query.all()
        total_loan_repayments = 0
        total_interest_earned = 0
        
        for loan in all_loans:
            if loan.paid_amount and loan.paid_amount > 0:
                total_loan_repayments += loan.paid_amount
                print(f"Loan {loan.id}: paid_amount = {loan.paid_amount}")
                
                # Calculate interest portion of payments
                if loan.amount_due and loan.amount and loan.amount_due > loan.amount:
                    total_interest_for_loan = loan.amount_due - loan.amount
                    if loan.amount_due > 0:
                        payment_ratio = loan.paid_amount / loan.amount_due
                        interest_earned_from_loan = total_interest_for_loan * payment_ratio
                        total_interest_earned += interest_earned_from_loan
                        print(f"Interest from loan {loan.id}: {interest_earned_from_loan}")
        
        print(f"Total loan repayments: {total_loan_repayments}")
        print(f"Total interest earned: {total_interest_earned}")
        
        # Total account balance = all money that came into the system
        total_account_balance = total_contributions + total_loan_repayments
        print(f"CALCULATED TOTAL ACCOUNT BALANCE: {total_account_balance}")
        
        # Alternative calculation method for verification
        print("🔍 Alternative calculation for verification...")
        
        # Sum all contributions using raw SQL for verification
        try:
            with db.engine.connect() as conn:
                result = conn.execute(text('SELECT COALESCE(SUM(amount), 0) FROM contributions'))
                contrib_sum = result.fetchone()[0]
                print(f"Contributions (SQL): {contrib_sum}")
                
                result = conn.execute(text('SELECT COALESCE(SUM(paid_amount), 0) FROM loans WHERE paid_amount > 0'))
                repayment_sum = result.fetchone()[0]
                print(f"Loan repayments (SQL): {repayment_sum}")
                
                # Use SQL calculation if SQLAlchemy calculation failed
                if total_account_balance == 0 and (contrib_sum > 0 or repayment_sum > 0):
                    total_account_balance = contrib_sum + repayment_sum
                    print(f"Using SQL calculation: {total_account_balance}")
                    
        except Exception as sql_error:
            print(f"SQL verification failed: {str(sql_error)}")
        
        # Loan statistics
        total_loans = Loan.query.count()
        pending_loans = Loan.query.filter_by(status='pending').count()
        approved_loans = Loan.query.filter_by(status='approved').count()
        paid_loans = Loan.query.filter_by(status='paid').count()
        
        # Calculate total loan amount (approved loans only)
        approved_loans_list = Loan.query.filter_by(status='approved').all()
        total_loan_amount = sum(loan.amount for loan in approved_loans_list)
        print(f"Total loan amount (approved): {total_loan_amount}")
        
        # Investment statistics
        investments = ExternalInvestment.query.all()
        total_investment = sum(inv.amount for inv in investments) if investments else 0
        active_investments = sum(inv.amount for inv in investments if inv.status == 'active') if investments else 0
        completed_investments = sum(inv.amount for inv in investments if inv.status == 'completed') if investments else 0
        
        print(f"Investments: total={total_investment}, active={active_investments}, completed={completed_investments}")
        
        # Get recent pending loans for approval
        recent_pending_loans = Loan.query.filter_by(status='pending').order_by(Loan.created_at.desc()).limit(5).all()
        pending_loans_data = []
        
        for loan in recent_pending_loans:
            user = User.query.get(loan.user_id)
            if user:  # Check if user exists
                loan_dict = loan.to_dict()
                loan_dict['user'] = {
                    'id': user.id,
                    'username': user.username,
                    'first_name': user.first_name,
                    'last_name': user.last_name
                }
                pending_loans_data.append(loan_dict)
        
        # Prepare response data
        response_data = {
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
            },
            "total_account_balance": total_account_balance,
            "financial_breakdown": {
                "total_contributions": total_contributions,
                "total_loan_repayments": total_loan_repayments,
                "total_interest_earned": total_interest_earned
            }
        }
        
        print(f"📊 Final response - Total Account Balance: {total_account_balance}")
        
        return jsonify(response_data), 200
        
    except Exception as e:
        import traceback
        print(f"Error getting admin dashboard: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

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

# Add this suspend route to your app/routes/admin.py

@admin_bp.route('/users/<int:user_id>/suspend', methods=['PUT'])
@jwt_required()
@admin_required
def suspend_user(user_id):
    """Suspend or unsuspend a user (admin only)"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        # Convert to integer if it's a string
        admin_id = int(current_user_id) if isinstance(current_user_id, str) else current_user_id
        
        print(f"Admin {admin_id} attempting to suspend/unsuspend user {user_id}")
        
        # Get the user to suspend/unsuspend
        user = User.query.get(user_id)
        if not user:
            print(f"User {user_id} not found")
            return jsonify({"error": "User not found"}), 404
            
        # Prevent self-suspension
        if user_id == admin_id:
            print(f"Admin {admin_id} tried to suspend themselves")
            return jsonify({"error": "Cannot suspend your own account"}), 400
            
        # Get suspend status from request data
        suspend = data.get('suspend', False)
        
        # Update user suspension status
        user.is_suspended = suspend
        db.session.commit()
        
        action = "suspended" if suspend else "unsuspended"
        print(f"✓ User {user.username} {action} by admin {admin_id}")
        
        return jsonify({
            "message": f"User {user.username} {action} successfully",
            "user": user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error suspending/unsuspending user: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500