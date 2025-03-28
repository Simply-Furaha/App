from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import (
    create_access_token, create_refresh_token,
    jwt_required, get_jwt_identity
)
from ..models import db
from ..models.user import User
from ..models.otp import OTP
from ..services.mail_service import send_otp_email
from email_validator import validate_email, EmailNotValidError
import re

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register', methods=['POST'])
def register():
    """Register a new user"""
    try:
        data = request.get_json()
        print(f"Registering new user: {data.get('username')}")
        
        # Validate input data
        if not all([
            data.get('username'),
            data.get('email'),
            data.get('password'),
            data.get('first_name'),
            data.get('last_name'),
            data.get('phone_number')
        ]):
            return jsonify({"error": "All fields are required"}), 400
        
        # Validate email format
        try:
            valid = validate_email(data['email'])
            email = valid.email
        except EmailNotValidError as e:
            return jsonify({"error": str(e)}), 400
        
        # Validate phone number format (simple check)
        phone_regex = r'^\+?[0-9]{10,15}$'
        if not re.match(phone_regex, data['phone_number']):
            return jsonify({"error": "Invalid phone number format"}), 400
            
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
            is_admin=False,
            is_verified=False
        )
        new_user.password = data['password']  # This uses the password setter
        
        # Save user to database
        db.session.add(new_user)
        db.session.commit()
        
        # Generate OTP and send it to the user's email
        otp = OTP.generate_otp(new_user.id)
        send_otp_email(new_user, otp.code)
        
        # Print OTP for development purposes
        print(f"DEBUG - OTP for {new_user.username}: {otp.code}")
        
        return jsonify({
            "message": "User registered successfully. Check your email for verification code.",
            "user_id": new_user.id
        }), 201
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Registration error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/verify-otp', methods=['POST'])
def verify_otp():
    """Verify OTP code sent to user's email"""
    try:
        data = request.get_json()
        print(f"Verifying OTP for user ID: {data.get('user_id')}")
        
        if not all([data.get('user_id'), data.get('otp_code')]):
            return jsonify({"error": "User ID and OTP code are required"}), 400
        
        user = User.query.get(data['user_id'])
        if not user:
            print(f"User with ID {data.get('user_id')} not found")
            return jsonify({"error": "User not found"}), 404
        
        # Get the latest unused OTP for this user
        otp = OTP.query.filter_by(
            user_id=user.id,
            is_used=False
        ).order_by(OTP.created_at.desc()).first()
        
        if not otp or not otp.is_valid():
            print(f"Invalid or expired OTP for user: {user.username}")
            return jsonify({"error": "Invalid or expired OTP code"}), 400
        
        if otp.code != data['otp_code']:
            # Print debug information
            print(f"OTP mismatch: Expected {otp.code}, Got {data['otp_code']}")
            return jsonify({"error": "Incorrect OTP code"}), 400
        
        # Mark OTP as used
        otp.use()
        
        # Mark user as verified
        user.is_verified = True
        db.session.commit()
        
        # Generate tokens
        access_token = create_access_token(identity=user.id)
        refresh_token = create_refresh_token(identity=user.id)
        
        print(f"OTP verified successfully for user: {user.username}")
        
        return jsonify({
            "message": "Account verified successfully",
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": user.to_dict()
        }), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"OTP verification error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/login', methods=['POST'])
def login():
    """Login user and generate OTP for verification"""
    try:
        data = request.get_json()
        print(f"Login attempt for user: {data.get('username')}")
        
        if not all([data.get('username'), data.get('password')]):
            return jsonify({"error": "Username and password are required"}), 400
        
        # Find user by username
        user = User.query.filter_by(username=data['username']).first()
        
        # Check if user exists and password is correct
        if not user or not user.verify_password(data['password']):
            print(f"Invalid credentials for user: {data.get('username')}")
            return jsonify({"error": "Invalid username or password"}), 401
        
        # Generate and send OTP
        otp = OTP.generate_otp(user.id)
        send_otp_email(user, otp.code)
        
        # Print OTP for development purposes
        print(f"DEBUG - OTP for {user.username}: {otp.code}")
        
        return jsonify({
            "message": "Login credentials valid. Check your email for verification code.",
            "user_id": user.id
        }), 200
    except Exception as e:
        import traceback
        print(f"Login error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/refresh', methods=['POST'])
@jwt_required(refresh=True)
def refresh():
    """Refresh access token"""
    try:
        # Print request headers for debugging
        from flask import request
        auth_header = request.headers.get('Authorization', '')
        print(f"Refresh token header: {auth_header}")
        
        current_user_id = get_jwt_identity()
        print(f"Refreshing token for user ID: {current_user_id}")
        
        # Check if user exists
        user = User.query.get(current_user_id)
        if not user:
            print(f"User with ID {current_user_id} not found during token refresh")
            return jsonify({"error": "User not found"}), 404
        
        # Create new access token
        new_access_token = create_access_token(identity=current_user_id)
        print(f"New access token created for user: {user.username}")
        
        return jsonify({
            "access_token": new_access_token
        }), 200
    except Exception as e:
        import traceback
        print(f"Token refresh error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/change-password', methods=['PUT'])
@jwt_required()
def change_password():
    """Change user password"""
    try:
        data = request.get_json()
        current_user_id = get_jwt_identity()
        print(f"Password change request for user ID: {current_user_id}")
        
        if not all([data.get('current_password'), data.get('new_password')]):
            return jsonify({"error": "Current password and new password are required"}), 400
        
        # Get current user
        user = User.query.get(current_user_id)
        if not user:
            print(f"User with ID {current_user_id} not found")
            return jsonify({"error": "User not found"}), 404
        
        # Verify current password
        if not user.verify_password(data['current_password']):
            print(f"Incorrect current password for user: {user.username}")
            return jsonify({"error": "Current password is incorrect"}), 401
        
        # Update password
        user.password = data['new_password']
        db.session.commit()
        
        print(f"Password updated successfully for user: {user.username}")
        return jsonify({"message": "Password updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        import traceback
        print(f"Password change error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500

@auth_bp.route('/resend-otp', methods=['POST'])
def resend_otp():
    """Resend OTP to user's email"""
    try:
        data = request.get_json()
        print(f"OTP resend request for user ID: {data.get('user_id')}")
        
        if not data.get('user_id'):
            return jsonify({"error": "User ID is required"}), 400
        
        user = User.query.get(data['user_id'])
        if not user:
            print(f"User with ID {data.get('user_id')} not found")
            return jsonify({"error": "User not found"}), 404
        
        # Generate new OTP and send it
        otp = OTP.generate_otp(user.id)
        send_otp_email(user, otp.code)
        
        # Print OTP for development purposes
        print(f"DEBUG - OTP for {user.username}: {otp.code}")
        
        return jsonify({
            "message": "Verification code sent to your email"
        }), 200
    except Exception as e:
        import traceback
        print(f"OTP resend error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({"error": str(e)}), 500