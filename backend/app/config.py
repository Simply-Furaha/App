import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration with Daraja API integration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    # JWT Settings (High Security)
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=30)  # 30 minutes for development
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(hours=4)    # 4 hours for development
    JWT_ERROR_MESSAGE_KEY = 'error'
    
    # Additional security headers
    JWT_COOKIE_SECURE = False  # Set to True in production
    JWT_COOKIE_CSRF_PROTECT = False  # Enable in production
    
    # Session security
    PERMANENT_SESSION_LIFETIME = timedelta(minutes=30)
    SESSION_COOKIE_SECURE = False  # Set to True in production
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = 'Lax'
    
    # Mail settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_USERNAME')
    
    # ================================
    # DARAJA API CONFIGURATION
    # ================================
    
    # Core Daraja Settings
    MPESA_CONSUMER_KEY = os.environ.get('MPESA_CONSUMER_KEY')
    MPESA_CONSUMER_SECRET = os.environ.get('MPESA_CONSUMER_SECRET')
    MPESA_SHORTCODE = os.environ.get('MPESA_SHORTCODE', '174379')  # Default to sandbox
    MPESA_PASSKEY = os.environ.get('MPESA_PASSKEY')
    
    # Environment Control
    MPESA_PRODUCTION = os.environ.get('MPESA_PRODUCTION', 'false').lower() in ['true', 'on', '1']
    
    # Callback URLs
    MPESA_CALLBACK_URL = os.environ.get('MPESA_CALLBACK_URL', 'https://example.com/api/mpesa/callback')
    MPESA_VALIDATION_URL = os.environ.get('MPESA_VALIDATION_URL', 'https://example.com/api/mpesa/validation')
    MPESA_CONFIRMATION_URL = os.environ.get('MPESA_CONFIRMATION_URL', 'https://example.com/api/mpesa/confirmation')
    
    # Additional M-PESA Settings
    MPESA_ACCOUNT_NUMBER = os.environ.get('MPESA_ACCOUNT_NUMBER', 'NINEFUND')
    MPESA_TEST_MODE = os.environ.get('MPESA_TEST_MODE', 'false').lower() in ['true', 'on', '1']
    MPESA_TIMEOUT_SECONDS = int(os.environ.get('MPESA_TIMEOUT_SECONDS', 60))
    MPESA_LOG_LEVEL = os.environ.get('MPESA_LOG_LEVEL', 'INFO')
    
    # FIXED: Daraja API URLs as regular config variables
    def __init__(self):
        super().__init__()
        # Set URLs based on environment
        if self.MPESA_PRODUCTION:
            base_url = "https://api.safaricom.co.ke"
        else:
            base_url = "https://sandbox.safaricom.co.ke"
        
        # Set URLs as instance variables (not properties)
        self.MPESA_BASE_URL = base_url
        self.MPESA_AUTH_URL = f"{base_url}/oauth/v1/generate?grant_type=client_credentials"
        self.MPESA_STK_PUSH_URL = f"{base_url}/mpesa/stkpush/v1/processrequest"
        self.MPESA_STK_QUERY_URL = f"{base_url}/mpesa/stkpushquery/v1/query"
        self.MPESA_C2B_REGISTER_URL = f"{base_url}/mpesa/c2b/v1/registerurl"

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///ninefund.db')
    
    # Relaxed security for development
    JWT_COOKIE_SECURE = False
    SESSION_COOKIE_SECURE = False
    
    # Development-specific M-PESA settings
    MPESA_PRODUCTION = False  # Always use sandbox in development
    MPESA_LOG_LEVEL = 'DEBUG'  # Verbose logging for development
    
    def __init__(self):
        super().__init__()
        # Check if ngrok URLs are properly configured
        callback_url = os.environ.get('MPESA_CALLBACK_URL', '')
        if 'ngrok' not in callback_url and 'localhost' not in callback_url and 'example.com' in callback_url:
            print("⚠️  WARNING: M-PESA callback URLs should use ngrok for local development")
            print("   Run: ngrok http 5000")
            print("   Then update MPESA_CALLBACK_URL in .env file")

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URI', 'sqlite:///ninefund_test.db')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=5)  # Short for testing
    
    # Testing M-PESA settings
    MPESA_TEST_MODE = True  # Always use test mode for unit tests
    MPESA_PRODUCTION = False

class ProductionConfig(Config):
    """Production configuration with maximum security."""
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')
    
    # Maximum security settings
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(minutes=15)  # 15 minutes for production
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(hours=1)    # 1 hour for production
    
    # Strict security
    JWT_COOKIE_SECURE = True
    JWT_COOKIE_HTTPONLY = True
    JWT_COOKIE_SAMESITE = 'Strict'
    JWT_COOKIE_CSRF_PROTECT = True
    
    SESSION_COOKIE_SECURE = True
    PREFERRED_URL_SCHEME = 'https'
    
    # Production M-PESA settings
    MPESA_LOG_LEVEL = 'WARNING'  # Less verbose logging in production
    
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Validate required M-PESA settings for production
        required_mpesa_settings = [
            'MPESA_CONSUMER_KEY',
            'MPESA_CONSUMER_SECRET',
            'MPESA_SHORTCODE',
            'MPESA_PASSKEY',
            'MPESA_CALLBACK_URL'
        ]
        
        missing_settings = []
        for setting in required_mpesa_settings:
            if not app.config.get(setting):
                missing_settings.append(setting)
        
        if missing_settings:
            raise ValueError(f"Missing required M-PESA configuration: {', '.join(missing_settings)}")
        
        # Validate callback URLs are HTTPS in production
        callback_urls = [
            app.config.get('MPESA_CALLBACK_URL'),
            app.config.get('MPESA_VALIDATION_URL'),
            app.config.get('MPESA_CONFIRMATION_URL')
        ]
        
        for url in callback_urls:
            if url and not url.startswith('https://'):
                raise ValueError(f"All M-PESA callback URLs must use HTTPS in production: {url}")
        
        print("✅ M-PESA configuration validated for production")

config_options = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}

# Helper function to validate M-PESA configuration
def validate_mpesa_config(app):
    """Validate M-PESA configuration at startup"""
    config = app.config
    
    # Check if M-PESA is properly configured
    if not config.get('MPESA_CONSUMER_KEY'):
        app.logger.warning("⚠️  M-PESA CONSUMER_KEY not configured. M-PESA functionality will be disabled.")
        return False
    
    if not config.get('MPESA_CONSUMER_SECRET'):
        app.logger.warning("⚠️  M-PESA CONSUMER_SECRET not configured. M-PESA functionality will be disabled.")
        return False
    
    if not config.get('MPESA_PASSKEY'):
        app.logger.warning("⚠️  M-PESA PASSKEY not configured. M-PESA functionality will be disabled.")
        return False
    
    # Validate callback URLs
    callback_url = config.get('MPESA_CALLBACK_URL', '')
    if 'example.com' in callback_url:
        app.logger.warning("⚠️  Default M-PESA callback URLs detected. Please configure proper callback URLs.")
        return False
    
    app.logger.info("✅ M-PESA configuration validated successfully")
    return True