import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()

class Config:
    """Base configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'dev-secret-key')
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
    JWT_REFRESH_TOKEN_EXPIRES = timedelta(days=30)
    
    # Mail settings
    MAIL_SERVER = os.environ.get('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT = int(os.environ.get('MAIL_PORT', 587))
    MAIL_USE_TLS = os.environ.get('MAIL_USE_TLS', 'true').lower() in ['true', 'on', '1']
    MAIL_USERNAME = os.environ.get('MAIL_USERNAME')
    MAIL_PASSWORD = os.environ.get('MAIL_PASSWORD')
    MAIL_DEFAULT_SENDER = os.environ.get('MAIL_USERNAME')
    
    # Daraja API settings
    MPESA_CONSUMER_KEY = os.environ.get('MPESA_CONSUMER_KEY')
    MPESA_CONSUMER_SECRET = os.environ.get('MPESA_CONSUMER_SECRET')
    MPESA_SHORTCODE = os.environ.get('MPESA_SHORTCODE')
    MPESA_PASSKEY = os.environ.get('MPESA_PASSKEY')
    MPESA_CALLBACK_URL = os.environ.get('MPESA_CALLBACK_URL', 'https://your-domain.com/api/mpesa/callback')
    MPESA_VALIDATION_URL = os.environ.get('MPESA_VALIDATION_URL', 'https://your-domain.com/api/mpesa/validation')
    MPESA_CONFIRMATION_URL = os.environ.get('MPESA_CONFIRMATION_URL', 'https://your-domain.com/api/mpesa/confirmation')
    MPESA_ACCOUNT_NUMBER = os.environ.get('MPESA_ACCOUNT_NUMBER', '01108919109300')
    MPESA_PRODUCTION = os.environ.get('MPESA_PRODUCTION', 'false').lower() in ['true', 'on', '1']

class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('SQLALCHEMY_DATABASE_URI', 'sqlite:///ninefund.db')
    
    # Override default callback URLs for development
    MPESA_CALLBACK_URL = os.environ.get('MPESA_CALLBACK_URL', 'https://webhook.site/your-uuid')
    MPESA_VALIDATION_URL = os.environ.get('MPESA_VALIDATION_URL', 'https://webhook.site/your-uuid')
    MPESA_CONFIRMATION_URL = os.environ.get('MPESA_CONFIRMATION_URL', 'https://webhook.site/your-uuid')

class TestingConfig(Config):
    """Testing configuration."""
    TESTING = True
    SQLALCHEMY_DATABASE_URI = os.environ.get('TEST_DATABASE_URI', 'sqlite:///ninefund_test.db')

class ProductionConfig(Config):
    """Production configuration."""
    SQLALCHEMY_DATABASE_URI = os.environ.get('DATABASE_URI')
    JWT_COOKIE_SECURE = True
    
    # Ensure all required Daraja configs are present in production
    @classmethod
    def init_app(cls, app):
        Config.init_app(app)
        
        # Check required settings
        required_settings = [
            'MPESA_CONSUMER_KEY', 
            'MPESA_CONSUMER_SECRET',
            'MPESA_SHORTCODE',
            'MPESA_PASSKEY',
            'MPESA_CALLBACK_URL'
        ]
        
        for setting in required_settings:
            if not app.config.get(setting):
                raise ValueError(f"Missing required configuration: {setting}")

config_options = {
    'development': DevelopmentConfig,
    'testing': TestingConfig,
    'production': ProductionConfig,
    'default': DevelopmentConfig
}