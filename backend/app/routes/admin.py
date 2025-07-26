# app/routes/admin.py - Enhanced with activity logging and overpayment management
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.loan import Loan, LoanPayment
from ..models.investment import ExternalInvestment
from ..models.contribution import Contribution
from ..models.admin_log import AdminActivityLog
from ..models.overpayment import Overpayment
from ..utils.decorators import admin_required
from ..utils.admin_logging import log_admin_activity, AdminActions, get_user_display_name, get_loan_display_name, format_values_for_log
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta
import json

admin_bp = Blueprint('admin', __name__)

# ============= DASHBOARD =============
@admin_bp.route('/dashboard', methods=['GET'])
@jwt_required()
@admin_required
def get_admin_dashboard():
    """Get admin dashboard data"""
    try:
        # Get all basic stats
        total_users = User.query.count()
        total_admins = User.query.filter_by(is_admin=True).count()
        total_members = total_users - total_admins
        
        # Get contribution stats
        total_contributions = db.session.query(db.func.sum(Contribution.amount)).scalar() or 0
        this_month_contributions = db.session.query(db.func.sum(Contribution.amount)).filter(
            Contribution.created_at >= datetime.now().replace(day=1)
        ).scalar() or 0
        
        # Get loan stats
        total_loans = Loan.query.count()
        pending_loans = Loan.query.filter_by(status='pending').count()
        approved_loans = Loan.query.filter_by(status='approved').count()
        total_loan_amount = db.session.query(db.func.sum(Loan.amount)).filter(
            Loan.status.in_(['approved', 'paid'])
        ).scalar() or 0
        
        # Get investment stats
        total_investments = db.session.query(db.func.sum(ExternalInvestment.amount)).filter_by(status='active').scalar() or 0
        
        # Get overpayment stats
        pending_overpayments = Overpayment.query.filter_by(status='pending').count()
        total_overpayment_amount = db.session.query(db.func.sum(Overpayment.remaining_amount)).filter_by(status='pending').scalar() or 0
        
        # Get recent activity logs (last 10)
        recent_activities = AdminActivityLog.query.order_by(AdminActivityLog.created_at.desc()).limit(10).all()
        
        dashboard_data = {
            "stats": {
                "total_users": total_users,
                "total_admins": total_admins,
                "total_members": total_members,
                "total_contributions": total_contributions,
                "this_month_contributions": this_month_contributions,
                "total_loans": total_loans,
                "pending_loans": pending_loans,
                "approved_loans": approved_loans,
                "total_loan_amount": total_loan_amount,
                "total_investments": total_investments,
                "pending_overpayments": pending_overpayments,
                "total_overpayment_amount": total_overpayment_amount
            },
            "recent_activities": [activity.to_dict() for activity in recent_activities]
        }
        
        return jsonify(dashboard_data), 200
        
    except Exception as e:
        import traceback
        print(f"Error getting admin dashboard: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

# ============= USER MANAGEMENT =============
@admin_bp.route('/users', methods=['GET'])
@jwt_required()
@admin_required
def get_all_users():
    """Get all users (admin only)"""
    try:
        users = User.query.all()
        return jsonify({
            "users": [user.to_dict() for user in users]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users', methods=['POST'])
@jwt_required()
@admin_required
def create_user():
    """Create a new user (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Validate required fields
        required_fields = ['username', 'email', 'password', 'first_name', 'last_name', 'phone_number']
        if not all(data.get(field) for field in required_fields):
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
            is_verified=True
        )
        new_user.password = data['password']
        
        db.session.add(new_user)
        db.session.commit()
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.USER_CREATED,
            target_type='user',
            target_id=new_user.id,
            target_name=get_user_display_name(new_user),
            description=f"Created new {'admin' if new_user.is_admin else 'user'} account",
            new_values=format_values_for_log({
                'username': new_user.username,
                'email': new_user.email,
                'first_name': new_user.first_name,
                'last_name': new_user.last_name,
                'is_admin': new_user.is_admin
            })
        )
        
        return jsonify({
            "message": "User created successfully",
            "user": new_user.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
@admin_required
def delete_user(user_id):
    """Delete a user (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        
        # Prevent self-deletion
        if user_id == current_user_id:
            return jsonify({"error": "Cannot delete your own account"}), 400
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        user_name = get_user_display_name(user)
        old_values = format_values_for_log(user.to_dict())
        
        db.session.delete(user)
        db.session.commit()
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.USER_DELETED,
            target_type='user',
            target_id=user_id,
            target_name=user_name,
            description=f"Deleted user account and all associated data",
            old_values=old_values
        )
        
        return jsonify({"message": f"User {user_name} deleted successfully"}), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/users/<int:user_id>/suspend', methods=['PUT'])
@jwt_required()
@admin_required
def suspend_user(user_id):
    """Suspend or unsuspend a user (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Prevent self-suspension
        if user_id == current_user_id:
            return jsonify({"error": "Cannot suspend your own account"}), 400
            
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
            
        suspend = data.get('suspend', False)
        old_status = user.is_suspended
        
        user.is_suspended = suspend
        db.session.commit()
        
        action = AdminActions.USER_SUSPENDED if suspend else AdminActions.USER_UNSUSPENDED
        action_description = "suspended" if suspend else "unsuspended"
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=action,
            target_type='user',
            target_id=user.id,
            target_name=get_user_display_name(user),
            description=f"User account {action_description}",
            old_values={'is_suspended': old_status},
            new_values={'is_suspended': suspend}
        )
        
        return jsonify({
            "message": f"User {action_description} successfully",
            "user": user.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ============= CONTRIBUTION MANAGEMENT =============
@admin_bp.route('/contributions', methods=['POST'])
@jwt_required()
@admin_required
def add_contribution():
    """Add contribution for any user (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Validate required fields
        if not all([data.get('user_id'), data.get('amount'), data.get('month')]):
            return jsonify({"error": "user_id, amount, and month are required"}), 400
        
        user = User.query.get(data['user_id'])
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Parse month (expecting YYYY-MM format)
        try:
            month_date = datetime.strptime(data['month'], '%Y-%m').date()
        except ValueError:
            return jsonify({"error": "Invalid month format. Use YYYY-MM"}), 400
        
        # Check if contribution already exists for this user and month
        existing = Contribution.query.filter_by(
            user_id=data['user_id'],
            month=month_date
        ).first()
        
        if existing:
            return jsonify({"error": "Contribution already exists for this month"}), 400
        
        # Create contribution
        contribution = Contribution(
            user_id=data['user_id'],
            amount=float(data['amount']),
            month=month_date,
            payment_method=data.get('payment_method', 'manual'),
            transaction_id=data.get('transaction_id', f"ADMIN-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        )
        
        db.session.add(contribution)
        db.session.commit()
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.CONTRIBUTION_ADDED,
            target_type='contribution',
            target_id=contribution.id,
            target_name=f"Contribution for {get_user_display_name(user)} - {month_date}",
            description=f"Added contribution of {data['amount']} for {user.first_name} {user.last_name}",
            new_values={
                'user_id': contribution.user_id,
                'amount': contribution.amount,
                'month': str(contribution.month),
                'payment_method': contribution.payment_method
            }
        )
        
        return jsonify({
            "message": "Contribution added successfully",
            "contribution": contribution.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ============= LOAN MANAGEMENT =============
@admin_bp.route('/loans', methods=['GET'])
@jwt_required()
@admin_required
def get_all_loans():
    """Get all loans (admin only)"""
    try:
        loans = Loan.query.all()
        loans_data = []
        
        for loan in loans:
            loan_dict = loan.to_dict()
            loan_dict['user'] = loan.user.to_dict() if loan.user else None
            loans_data.append(loan_dict)
        
        return jsonify({"loans": loans_data}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/loans/<int:loan_id>/approve', methods=['PUT'])
@jwt_required()
@admin_required
def approve_loan(loan_id):
    """Approve a loan (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
        
        if loan.status != 'pending':
            return jsonify({"error": "Only pending loans can be approved"}), 400
        
        old_status = loan.status
        loan.status = 'approved'
        loan.borrowed_date = datetime.utcnow()
        loan.calculate_loan_details()  # Recalculate due date and amount
        
        db.session.commit()
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.LOAN_APPROVED,
            target_type='loan',
            target_id=loan.id,
            target_name=get_loan_display_name(loan),
            description=f"Approved loan application for {loan.user.first_name} {loan.user.last_name}",
            old_values={'status': old_status},
            new_values={'status': loan.status, 'borrowed_date': loan.borrowed_date.isoformat()}
        )
        
        return jsonify({
            "message": "Loan approved successfully",
            "loan": loan.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/loans/<int:loan_id>/reject', methods=['PUT'])
@jwt_required()
@admin_required
def reject_loan(loan_id):
    """Reject a loan (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
        
        if loan.status != 'pending':
            return jsonify({"error": "Only pending loans can be rejected"}), 400
        
        old_status = loan.status
        loan.status = 'rejected'
        
        db.session.commit()
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.LOAN_REJECTED,
            target_type='loan',
            target_id=loan.id,
            target_name=get_loan_display_name(loan),
            description=f"Rejected loan application for {loan.user.first_name} {loan.user.last_name}",
            old_values={'status': old_status},
            new_values={'status': loan.status}
        )
        
        return jsonify({
            "message": "Loan rejected successfully",
            "loan": loan.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/loans/<int:loan_id>/payment', methods=['POST'])
@jwt_required()
@admin_required
def add_loan_payment():
    """Add loan payment (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not data.get('amount'):
            return jsonify({"error": "Payment amount is required"}), 400
        
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
        
        if loan.status != 'approved':
            return jsonify({"error": "Can only add payments to approved loans"}), 400
        
        payment_amount = float(data['amount'])
        expected_payment = loan.unpaid_balance or (loan.amount_due - loan.paid_amount)
        
        # Check for overpayment
        if payment_amount > expected_payment:
            overpayment_amount = payment_amount - expected_payment
            
            # Create overpayment record
            overpayment = Overpayment(
                user_id=loan.user_id,
                original_payment_type='loan_payment',
                original_payment_id=None,  # Will be set after payment is created
                expected_amount=expected_payment,
                actual_amount=payment_amount,
                overpayment_amount=overpayment_amount,
                remaining_amount=overpayment_amount
            )
            
            db.session.add(overpayment)
            
            # Use only the expected amount for the loan payment
            actual_payment_amount = expected_payment
        else:
            actual_payment_amount = payment_amount
        
        # Create loan payment record
        payment = LoanPayment(
            loan_id=loan.id,
            amount=actual_payment_amount,
            payment_method=data.get('payment_method', 'manual'),
            transaction_id=data.get('transaction_id', f"ADMIN-{datetime.now().strftime('%Y%m%d%H%M%S')}")
        )
        
        # Update loan
        loan.paid_amount += actual_payment_amount
        loan.unpaid_balance = max(0, loan.unpaid_balance - actual_payment_amount)
        
        if loan.unpaid_balance <= 0:
            loan.status = 'paid'
            loan.paid_date = datetime.utcnow()
        
        db.session.add(payment)
        
        # Update overpayment record with payment ID if overpayment exists
        if payment_amount > expected_payment:
            overpayment.original_payment_id = payment.id
        
        db.session.commit()
        
        # Log the activity
        description = f"Added payment of {actual_payment_amount} to loan"
        if payment_amount > expected_payment:
            description += f" (Overpayment of {overpayment_amount} recorded)"
        
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.LOAN_PAYMENT_ADDED,
            target_type='loan',
            target_id=loan.id,
            target_name=get_loan_display_name(loan),
            description=description,
            new_values={
                'payment_amount': actual_payment_amount,
                'overpayment_amount': overpayment_amount if payment_amount > expected_payment else 0,
                'loan_status': loan.status,
                'remaining_balance': loan.unpaid_balance
            }
        )
        
        response_data = {
            "message": "Payment added successfully",
            "payment": payment.to_dict(),
            "loan": loan.to_dict()
        }
        
        if payment_amount > expected_payment:
            response_data["overpayment"] = overpayment.to_dict()
            response_data["message"] += f" (Overpayment of {overpayment_amount} recorded)"
        
        return jsonify(response_data), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ============= OVERPAYMENT MANAGEMENT =============
@admin_bp.route('/overpayments', methods=['GET'])
@jwt_required()
@admin_required
def get_overpayments():
    """Get all overpayments (admin only)"""
    try:
        overpayments = Overpayment.query.filter_by(status='pending').all()
        return jsonify({
            "overpayments": [op.to_dict() for op in overpayments]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/overpayments/<int:overpayment_id>/allocate', methods=['PUT'])
@jwt_required()
@admin_required
def allocate_overpayment(overpayment_id):
    """Allocate overpayment to future contributions or loan payment"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        overpayment = Overpayment.query.get(overpayment_id)
        if not overpayment:
            return jsonify({"error": "Overpayment not found"}), 404
        
        if overpayment.status != 'pending':
            return jsonify({"error": "Overpayment already allocated"}), 400
        
        allocation_type = data.get('allocation_type')  # 'future_contribution' or 'loan_payment'
        admin_notes = data.get('notes', '')
        
        if allocation_type == 'future_contribution':
            success = overpayment.allocate_to_future_contribution(current_user_id, admin_notes)
            if success:
                message = f"Overpayment allocated to future contributions"
            else:
                return jsonify({"error": "Failed to allocate overpayment"}), 500
                
        elif allocation_type == 'loan_payment':
            loan_id = data.get('loan_id')
            if not loan_id:
                return jsonify({"error": "loan_id required for loan payment allocation"}), 400
            
            success, message = overpayment.allocate_to_loan(loan_id, current_user_id, admin_notes)
            if not success:
                return jsonify({"error": message}), 400
        else:
            return jsonify({"error": "Invalid allocation_type"}), 400
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.OVERPAYMENT_ALLOCATED,
            target_type='overpayment',
            target_id=overpayment.id,
            target_name=f"Overpayment for {overpayment.user.first_name} {overpayment.user.last_name}",
            description=f"Allocated overpayment of {overpayment.overpayment_amount} to {allocation_type}",
            new_values={
                'allocation_type': allocation_type,
                'loan_id': data.get('loan_id') if allocation_type == 'loan_payment' else None,
                'notes': admin_notes
            }
        )
        
        return jsonify({
            "message": message,
            "overpayment": overpayment.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ============= ADMIN-TO-ADMIN OPERATIONS =============
@admin_bp.route('/loans/<int:loan_id>/modify-debt', methods=['PUT'])
@jwt_required()
@admin_required
def modify_loan_debt(loan_id):
    """Modify loan debt amount (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        loan = Loan.query.get(loan_id)
        if not loan:
            return jsonify({"error": "Loan not found"}), 404
        
        # Store old values for logging
        old_values = {
            'amount': loan.amount,
            'amount_due': loan.amount_due,
            'unpaid_balance': loan.unpaid_balance
        }
        
        # Update loan amount if provided
        if 'new_amount' in data:
            loan.amount = float(data['new_amount'])
            loan.calculate_loan_details()  # Recalculate dependent fields
        
        # Update unpaid balance if provided
        if 'new_unpaid_balance' in data:
            loan.unpaid_balance = float(data['new_unpaid_balance'])
        
        # Update interest rate if provided
        if 'new_interest_rate' in data:
            old_values['interest_rate'] = loan.interest_rate
            loan.interest_rate = float(data['new_interest_rate'])
            loan.calculate_loan_details()
        
        db.session.commit()
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.LOAN_DEBT_MODIFIED,
            target_type='loan',
            target_id=loan.id,
            target_name=get_loan_display_name(loan),
            description=f"Modified loan debt details for {loan.user.first_name} {loan.user.last_name}",
            old_values=old_values,
            new_values={
                'amount': loan.amount,
                'amount_due': loan.amount_due,
                'unpaid_balance': loan.unpaid_balance,
                'interest_rate': loan.interest_rate
            }
        )
        
        return jsonify({
            "message": "Loan debt modified successfully",
            "loan": loan.to_dict()
        }), 200
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/admin-contribution', methods=['POST'])
@jwt_required()
@admin_required
def add_admin_contribution():
    """Add contribution for another admin (admin only)"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        # Validate required fields
        if not all([data.get('admin_id'), data.get('amount'), data.get('month')]):
            return jsonify({"error": "admin_id, amount, and month are required"}), 400
        
        target_admin = User.query.get(data['admin_id'])
        if not target_admin:
            return jsonify({"error": "Admin not found"}), 404
        
        if not target_admin.is_admin:
            return jsonify({"error": "Target user is not an admin"}), 400
        
        # Parse month
        try:
            month_date = datetime.strptime(data['month'], '%Y-%m').date()
        except ValueError:
            return jsonify({"error": "Invalid month format. Use YYYY-MM"}), 400
        
        # Check if contribution already exists
        existing = Contribution.query.filter_by(
            user_id=data['admin_id'],
            month=month_date
        ).first()
        
        if existing:
            return jsonify({"error": "Contribution already exists for this month"}), 400
        
        # Create contribution
        contribution = Contribution(
            user_id=data['admin_id'],
            amount=float(data['amount']),
            month=month_date,
            payment_method='admin_transfer',
            transaction_id=f"ADMIN-TO-ADMIN-{datetime.now().strftime('%Y%m%d%H%M%S')}"
        )
        
        db.session.add(contribution)
        db.session.commit()
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.ADMIN_CONTRIBUTION_ADDED,
            target_type='contribution',
            target_id=contribution.id,
            target_name=f"Admin contribution for {get_user_display_name(target_admin)} - {month_date}",
            description=f"Added contribution for admin {target_admin.first_name} {target_admin.last_name}",
            new_values={
                'target_admin_id': target_admin.id,
                'amount': contribution.amount,
                'month': str(contribution.month)
            }
        )
        
        return jsonify({
            "message": "Admin contribution added successfully",
            "contribution": contribution.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

# ============= ACTIVITY LOGS =============
@admin_bp.route('/activity-logs', methods=['GET'])
@jwt_required()
@admin_required
def get_activity_logs():
    """Get admin activity logs with pagination and filtering"""
    try:
        page = request.args.get('page', 1, type=int)
        per_page = request.args.get('per_page', 20, type=int)
        admin_id = request.args.get('admin_id', type=int)
        action = request.args.get('action')
        target_type = request.args.get('target_type')
        start_date = request.args.get('start_date')
        end_date = request.args.get('end_date')
        
        # Build query
        query = AdminActivityLog.query
        
        # Apply filters
        if admin_id:
            query = query.filter_by(admin_id=admin_id)
        if action:
            query = query.filter_by(action=action)
        if target_type:
            query = query.filter_by(target_type=target_type)
        if start_date:
            start_dt = datetime.strptime(start_date, '%Y-%m-%d')
            query = query.filter(AdminActivityLog.created_at >= start_dt)
        if end_date:
            end_dt = datetime.strptime(end_date, '%Y-%m-%d')
            query = query.filter(AdminActivityLog.created_at <= end_dt)
        
        # Order by most recent first
        query = query.order_by(AdminActivityLog.created_at.desc())
        
        # Paginate
        pagination = query.paginate(
            page=page, 
            per_page=per_page, 
            error_out=False
        )
        
        return jsonify({
            "logs": [log.to_dict() for log in pagination.items],
            "pagination": {
                "page": page,
                "per_page": per_page,
                "total": pagination.total,
                "pages": pagination.pages,
                "has_next": pagination.has_next,
                "has_prev": pagination.has_prev
            }
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# ============= INVESTMENT MANAGEMENT =============
@admin_bp.route('/investments', methods=['GET'])
@jwt_required()
@admin_required
def get_investments():
    """Get all investments"""
    try:
        investments = ExternalInvestment.query.all()
        return jsonify({
            "investments": [investment.to_dict() for investment in investments]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@admin_bp.route('/investments', methods=['POST'])
@jwt_required()
@admin_required
def create_investment():
    """Create a new investment"""
    try:
        current_user_id = int(get_jwt_identity())
        data = request.get_json()
        
        if not all([data.get('amount'), data.get('description')]):
            return jsonify({"error": "Amount and description are required"}), 400
        
        investment = ExternalInvestment(
            amount=float(data['amount']),
            description=data['description'],
            expected_return=data.get('expected_return'),
            expected_return_date=datetime.strptime(data['expected_return_date'], '%Y-%m-%d') if data.get('expected_return_date') else None,
            admin_id=current_user_id
        )
        
        db.session.add(investment)
        db.session.commit()
        
        # Log the activity
        log_admin_activity(
            admin_id=current_user_id,
            action=AdminActions.INVESTMENT_CREATED,
            target_type='investment',
            target_id=investment.id,
            target_name=f"Investment: {investment.description[:50]}...",
            description=f"Created new investment of {investment.amount}",
            new_values={
                'amount': investment.amount,
                'description': investment.description,
                'expected_return': investment.expected_return
            }
        )
        
        return jsonify({
            "message": "Investment created successfully",
            "investment": investment.to_dict()
        }), 201
        
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    
# Add this route to app/routes/admin.py (append to the file)

@admin_bp.route('/users/<int:user_id>/active-loans', methods=['GET'])
@jwt_required()
@admin_required
def get_user_active_loans(user_id):
    """Get active loans for a specific user (for overpayment allocation)"""
    try:
        user = User.query.get(user_id)
        if not user:
            return jsonify({"error": "User not found"}), 404
        
        # Get approved loans with remaining balance
        active_loans = Loan.query.filter(
            Loan.user_id == user_id,
            Loan.status == 'approved',
            Loan.unpaid_balance > 0
        ).all()
        
        loans_data = []
        for loan in active_loans:
            loan_dict = loan.to_dict()
            loan_dict['user'] = user.to_dict()
            loans_data.append(loan_dict)
        
        return jsonify({"loans": loans_data}), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500