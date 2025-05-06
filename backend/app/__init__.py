from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_cors import CORS
from flask_mail import Mail
from .models import db
from .config import config_options
import os
from datetime import timedelta
from .models.user import User  # Make sure to import User model

# Initialize extensions
jwt = JWTManager()
migrate = Migrate()
mail = Mail()

def create_app(config_name='development'):
    """Application factory function"""
    app = Flask(__name__)
    
    # Load configuration
    app.config.from_object(config_options[config_name])
    
    # Configure JWT
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
    app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Add these JWT identity handlers to fix the "Subject must be a string" error
    @jwt.user_identity_loader
    def user_identity_loader(identity):
        # Always convert identity to string when creating tokens
        return str(identity)

    @jwt.user_lookup_loader
    def user_lookup_loader(jwt_header, jwt_data):
        # Convert back to integer when loading from token
        identity = jwt_data["sub"]
        if isinstance(identity, str) and identity.isdigit():
            return User.query.get(int(identity))
        return User.query.get(identity)
    
    migrate.init_app(app, db)
    mail.init_app(app)
    
    # IMPORTANT: Apply CORS to the entire application with all methods allowed
    CORS(app, 
         origins=["https://app-blush-eta.vercel.app", "http://localhost:3000"],
         supports_credentials=True,
         methods=["GET", "HEAD", "POST", "OPTIONS", "PUT", "PATCH", "DELETE"],
         allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
         expose_headers=["Content-Type", "Authorization"],
         max_age=600)
    
    # Add JWT error handlers
    @jwt.invalid_token_loader
    def invalid_token_callback(error):
        print(f"Invalid token error: {error}")
        return jsonify({
            'error': 'Invalid token',
            'details': str(error)
        }), 401

    @jwt.unauthorized_loader
    def missing_token_callback(error):
        print(f"Missing token error: {error}")
        return jsonify({
            'error': 'Authorization header is missing',
            'details': str(error)
        }), 401
        
    @jwt.expired_token_loader
    def expired_token_callback(jwt_header, jwt_payload):
        print(f"Expired token: {jwt_payload}")
        return jsonify({
            'error': 'Token has expired',
            'code': 'token_expired'
        }), 401
    
    # Add error handler for better error responses with CORS
    @app.errorhandler(Exception)
    def handle_error(e):
        code = 500
        if hasattr(e, 'code'):
            code = e.code
        return jsonify(error=str(e)), code
    
    # Add CORS pre-flight route to ensure CORS is working for all routes
    @app.route('/api/test-cors', methods=['OPTIONS', 'GET'])
    def test_cors():
        return jsonify({"message": "CORS is working"})
    
    # Register blueprints
    from .routes.auth import auth_bp
    from .routes.user import user_bp
    from .routes.loan import loan_bp
    from .routes.admin import admin_bp
    from .routes.mpesa import mpesa_bp
    
    app.register_blueprint(auth_bp, url_prefix='/api/auth')
    app.register_blueprint(user_bp, url_prefix='/api/users')
    app.register_blueprint(loan_bp, url_prefix='/api/loans')
    app.register_blueprint(admin_bp, url_prefix='/api/admin')
    app.register_blueprint(mpesa_bp, url_prefix='/api/mpesa')
    
    return app