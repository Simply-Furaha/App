from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from ..models import db
from ..models.user import User
from ..models.contribution import Contribution
from datetime import datetime

user_bp = Blueprint('user', __name__)

@user_bp.route('/me', methods=['GET'])
@jwt_required()
def get_current_user():
    """Get current user information"""
    try:
        current_user_id = get_jwt_identity()
        print(f"Getting user info for user ID: {current_user_id}")
        
        user = User.query.get(current_user_id)
        if not user:
            print(f"User with ID {current_user_id} not found")
            return jsonify({"error": "User not found"}), 404
        
        print(f"Found user: {user.username}")
        return jsonify(user.to_dict()), 200
    except Exception as e:
        import traceback
        print(f"Error getting user info: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@user_bp.route('/me', methods=['PUT'])
@jwt_required()
def update_user():
    """Update user information"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        print(f"Updating user with ID: {current_user_id}")
        
        user = User.query.get(current_user_id)
        if not user:
            print(f"User with ID {current_user_id} not found")
            return jsonify({"error": "User not found"}), 404
        
        # Update fields if provided
        if data.get('first_name'):
            user.first_name = data['first_name']
        if data.get('last_name'):
            user.last_name = data['last_name']
        if data.get('phone_number'):
            user.phone_number = data['phone_number']
        if data.get('email'):
            # Check if email is already taken by another user
            existing_user = User.query.filter_by(email=data['email']).first()
            if existing_user and existing_user.id != user.id:
                return jsonify({"error": "Email already registered"}), 400
            user.email = data['email']
        
        db.session.commit()
        print(f"User {user.username} updated successfully")
        
        return jsonify({
            "message": "User information updated successfully",
            "user": user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Error updating user: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@user_bp.route('/me/contributions', methods=['GET'])
@jwt_required()
def get_user_contributions():
    """Get all contributions for the current user"""
    try:
        current_user_id = get_jwt_identity()
        print(f"Getting contributions for user ID: {current_user_id}")
        
        user = User.query.get(current_user_id)
        if not user:
            print(f"User with ID {current_user_id} not found")
            return jsonify({"error": "User not found"}), 404
        
        contributions = user.contributions.order_by(Contribution.month.desc()).all()
        print(f"Found {len(contributions)} contributions for user {user.username}")
        
        return jsonify({
            "contributions": [contribution.to_dict() for contribution in contributions],
            "total_contribution": user.total_contribution()
        }), 200
    except Exception as e:
        import traceback
        print(f"Error getting contributions: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@user_bp.route('/me/loan-limit', methods=['GET'])
@jwt_required()
def get_loan_limit():
    """Get user's loan limit and available amount"""
    try:
        current_user_id = get_jwt_identity()
        print(f"Getting loan limit for user ID: {current_user_id}")
        
        user = User.query.get(current_user_id)
        if not user:
            print(f"User with ID {current_user_id} not found")
            return jsonify({"error": "User not found"}), 404
        
        print(f"Found loan limits for user {user.username}")
        return jsonify({
            "total_contribution": user.total_contribution(),
            "loan_limit": user.loan_limit(),
            "current_loans_total": user.current_loan_total(),
            "available_loan_limit": user.available_loan_limit()
        }), 200
    except Exception as e:
        import traceback
        print(f"Error getting loan limit: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@user_bp.route('/me/dashboard', methods=['GET'])
@jwt_required()
def get_user_dashboard():
    """Get user's dashboard data with all relevant information"""
    try:
        # Get JWT identity and print it for debugging
        current_user_id = get_jwt_identity()
        print(f"Processing dashboard for user ID: {current_user_id}")
        
        # Get the user
        user = User.query.get(current_user_id)
        if not user:
            print(f"User with ID {current_user_id} not found in database")
            return jsonify({"error": "User not found"}), 404
        
        print(f"Found user: {user.username}")
        
        # Create a basic dashboard response
        dashboard_data = {
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "username": user.username,
                "is_admin": user.is_admin if hasattr(user, 'is_admin') else False
            }
        }
        
        # Add contributions with error handling
        try:
            total_contribution = user.total_contribution()
            recent_contributions = user.contributions.order_by(Contribution.month.desc()).limit(6).all()
            dashboard_data["contributions"] = {
                "total": total_contribution,
                "recent": [contribution.to_dict() for contribution in recent_contributions]
            }
            print(f"Added contributions: {len(recent_contributions)} recent contributions")
        except Exception as e:
            print(f"Error getting contributions: {str(e)}")
            dashboard_data["contributions"] = {
                "total": 0,
                "recent": []
            }
        
        # Add loans with error handling
        try:
            active_loans = user.current_loans()
            pending_loans = user.loans.filter_by(status='pending').all()
            dashboard_data["loans"] = {
                "limit": user.loan_limit(),
                "available": user.available_loan_limit(),
                "active": [loan.to_dict() for loan in active_loans],
                "pending": [loan.to_dict() for loan in pending_loans]
            }
            print(f"Added loans: {len(active_loans)} active, {len(pending_loans)} pending")
        except Exception as e:
            print(f"Error getting loans: {str(e)}")
            dashboard_data["loans"] = {
                "limit": 0,
                "available": 0,
                "active": [],
                "pending": []
            }
        
        # Add external investments with error handling
        try:
            from ..models.investment import ExternalInvestment
            external_investments = ExternalInvestment.query.filter_by(status='active').all()
            total_external_investment = sum(investment.amount for investment in external_investments)
            dashboard_data["external_investments"] = {
                "total": total_external_investment
            }
            print(f"Added external investments: {total_external_investment} total")
        except Exception as e:
            print(f"Error getting external investments: {str(e)}")
            dashboard_data["external_investments"] = {
                "total": 0
            }
        
        print("Dashboard data successfully compiled")
        return jsonify(dashboard_data), 200
    except Exception as e:
        import traceback
        print(f"Dashboard error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@user_bp.route('/me/dashboard-public', methods=['GET'])
def get_user_dashboard_public():
    """Temporary dashboard endpoint without auth for testing"""
    try:
        print("Accessing public dashboard endpoint")
        
        # Create a mock user or get the first user from the database
        user = User.query.first()  # Get the first user for testing
        if not user:
            print("No users found in database")
            return jsonify({"error": "No users in database"}), 404
        
        print(f"Using user {user.username} for public dashboard")
        
        # Build dashboard data with error handling
        dashboard_data = {
            "user": {
                "id": user.id,
                "first_name": user.first_name,
                "last_name": user.last_name,
                "username": user.username,
                "is_admin": user.is_admin if hasattr(user, 'is_admin') else False
            }
        }
        
        # Add contributions with error handling
        try:
            total_contribution = user.total_contribution()
            recent_contributions = user.contributions.order_by(Contribution.month.desc()).limit(6).all()
            dashboard_data["contributions"] = {
                "total": total_contribution,
                "recent": [contribution.to_dict() for contribution in recent_contributions]
            }
        except Exception as e:
            print(f"Error getting contributions for public dashboard: {str(e)}")
            dashboard_data["contributions"] = {
                "total": 0,
                "recent": []
            }
        
        # Add loans with error handling
        try:
            active_loans = user.current_loans()
            pending_loans = user.loans.filter_by(status='pending').all()
            dashboard_data["loans"] = {
                "limit": user.loan_limit(),
                "available": user.available_loan_limit(),
                "active": [loan.to_dict() for loan in active_loans],
                "pending": [loan.to_dict() for loan in pending_loans]
            }
        except Exception as e:
            print(f"Error getting loans for public dashboard: {str(e)}")
            dashboard_data["loans"] = {
                "limit": 0,
                "available": 0,
                "active": [],
                "pending": []
            }
        
        # Add external investments with error handling
        try:
            from ..models.investment import ExternalInvestment
            external_investments = ExternalInvestment.query.filter_by(status='active').all()
            total_external_investment = sum(investment.amount for investment in external_investments)
            dashboard_data["external_investments"] = {
                "total": total_external_investment
            }
        except Exception as e:
            print(f"Error getting external investments for public dashboard: {str(e)}")
            dashboard_data["external_investments"] = {
                "total": 0
            }
        
        print("Public dashboard data successfully compiled")
        return jsonify(dashboard_data), 200
    except Exception as e:
        import traceback
        print(f"Public dashboard error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500