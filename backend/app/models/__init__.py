# app/models/__init__.py

from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

# Import all models to ensure they're registered with SQLAlchemy
from .user import User
from .contribution import Contribution
from .loan import Loan, LoanPayment
from .investment import ExternalInvestment
from .otp import OTP
from .payment_status import PaymentStatus
from .admin_log import AdminActivityLog
from .overpayment import Overpayment

# Make models available at package level
__all__ = [
    'db',
    'User',
    'Contribution', 
    'Loan',
    'LoanPayment',
    'ExternalInvestment',
    'OTP',
    'PaymentStatus',
    'AdminActivityLog',
    'Overpayment'
]