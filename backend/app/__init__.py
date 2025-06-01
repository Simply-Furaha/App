from flask import Flask, jsonify
from flask_jwt_extended import JWTManager
from flask_migrate import Migrate
from flask_cors import CORS
from flask_mail import Mail
from .models import db
from .config import config_options, validate_mpesa_config
import os
from datetime import timedelta
from .models.user import User  # Make sure to import User model

# Initialize extensions
jwt = JWTManager()
migrate = Migrate()
mail = Mail()

def create_app(config_name='development'):
    """Application factory function with M-PESA integration"""
    app = Flask(__name__)
    
    # Load configuration
    config_class = config_options[config_name]
    config_instance = config_class()
    app.config.from_object(config_instance)
    
    # FIXED: Copy URLs from config instance to app.config
    app.config['MPESA_BASE_URL'] = config_instance.MPESA_BASE_URL
    app.config['MPESA_AUTH_URL'] = config_instance.MPESA_AUTH_URL
    app.config['MPESA_STK_PUSH_URL'] = config_instance.MPESA_STK_PUSH_URL
    app.config['MPESA_STK_QUERY_URL'] = config_instance.MPESA_STK_QUERY_URL
    app.config['MPESA_C2B_REGISTER_URL'] = config_instance.MPESA_C2B_REGISTER_URL
    
    # Configure JWT
    app.config['JWT_SECRET_KEY'] = os.environ.get('JWT_SECRET_KEY', 'dev-secret-key')
    app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=1)
    app.config['JWT_ERROR_MESSAGE_KEY'] = 'error'
    
    # Initialize extensions
    db.init_app(app)
    jwt.init_app(app)
    
    # Add JWT identity handlers to fix the "Subject must be a string" error
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
    
    # Configure CORS with support for credentials
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)
    
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
    
    # ================================
    # M-PESA CONFIGURATION VALIDATION
    # ================================
    
    # Validate M-PESA configuration at startup
    with app.app_context():
        mpesa_configured = validate_mpesa_config(app)
        
        if mpesa_configured:
            app.logger.info("🎉 M-PESA integration is ready!")
            
            # Log M-PESA configuration (hide sensitive data)
            app.logger.info(f"📱 M-PESA Environment: {'Production' if app.config['MPESA_PRODUCTION'] else 'Sandbox'}")
            app.logger.info(f"🏢 Business Shortcode: {app.config['MPESA_SHORTCODE']}")
            app.logger.info(f"🔗 Callback URL: {app.config['MPESA_CALLBACK_URL']}")
            app.logger.info(f"🔗 Auth URL: {app.config['MPESA_AUTH_URL']}")
            
            if app.config['MPESA_TEST_MODE']:
                app.logger.info("🧪 M-PESA Test Mode is ENABLED - No real API calls will be made")
        else:
            app.logger.warning("⚠️  M-PESA not properly configured. M-PESA features will be disabled.")
    
    # Add M-PESA status endpoint for debugging
    @app.route('/api/mpesa/status')
    def mpesa_status():
        """Get M-PESA configuration status"""
        return jsonify({
            "mpesa_configured": bool(app.config.get('MPESA_CONSUMER_KEY')),
            "environment": "production" if app.config.get('MPESA_PRODUCTION') else "sandbox",
            "test_mode": app.config.get('MPESA_TEST_MODE', False),
            "shortcode": app.config.get('MPESA_SHORTCODE'),
            "callback_url_configured": bool(app.config.get('MPESA_CALLBACK_URL')) and 'example.com' not in app.config.get('MPESA_CALLBACK_URL', ''),
            "ngrok_detected": 'ngrok' in app.config.get('MPESA_CALLBACK_URL', ''),
            "app_debug": app.debug,
            "auth_url": app.config.get('MPESA_AUTH_URL'),
            "stk_push_url": app.config.get('MPESA_STK_PUSH_URL')
        })
    
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
    
    # Add startup message
    @app.before_first_request
    def startup_message():
        print("\n" + "="*50)
        print("🎉 NINEFUND SERVER STARTED")
        print("="*50)
        print(f"🌐 Environment: {config_name}")
        print(f"📱 M-PESA: {'✅ Configured' if validate_mpesa_config(app) else '❌ Not Configured'}")
        print(f"🔒 Security: {'🔐 High' if app.config['JWT_ACCESS_TOKEN_EXPIRES'].total_seconds() <= 1800 else '🔓 Standard'}")
        print("="*50)
    
    return app