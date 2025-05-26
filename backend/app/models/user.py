# app/models/user.py
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from . import db
from .loan import Loan

class User(db.Model):
    """User model for authentication and profile information"""
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    email = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    first_name = db.Column(db.String(50), nullable=False)
    last_name = db.Column(db.String(50), nullable=False)
    phone_number = db.Column(db.String(15), nullable=False)
    is_admin = db.Column(db.Boolean, default=False)
    is_verified = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    contributions = db.relationship('Contribution', back_populates='user', lazy='dynamic')
    loans = db.relationship('Loan', back_populates='user', lazy='dynamic')
    otps = db.relationship('OTP', back_populates='user', lazy='dynamic')
    
    @property
    def password(self):
        raise AttributeError('password is not a readable attribute')
    
    @password.setter
    def password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def verify_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def total_contribution(self):
        """Calculate total contributions made by the user"""
        return sum(contribution.amount for contribution in self.contributions)
    
    def loan_limit(self):
        """Calculate loan limit: 100,000 fixed if total contributions >= 100,000, 
        otherwise equal to total contributions"""
        total = self.total_contribution()
        if total >= 100000:
            return 100000
        else:
            return total
    
    def current_loans(self):
        """Get active loans (not fully paid)"""
        return self.loans.filter(Loan.status != 'paid').all()
    
    def current_loan_total(self):
        """Calculate total amount of active loans"""
        return sum(loan.unpaid_balance for loan in self.current_loans())
    
    def available_loan_limit(self):
        """Calculate remaining available loan limit"""
        return max(0, self.loan_limit() - self.current_loan_total())
    
    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'first_name': self.first_name,
            'last_name': self.last_name,
            'phone_number': self.phone_number,
            'is_admin': self.is_admin,
            'is_verified': self.is_verified,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'total_contribution': self.total_contribution(),
            'loan_limit': self.loan_limit(),
            'available_loan_limit': self.available_loan_limit()
        }