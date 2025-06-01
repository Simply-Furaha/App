# app/models/otp.py - Complete updated OTP model
from datetime import datetime, timedelta
import random
import string
from . import db

class OTP(db.Model):
    """One Time Password model for authentication"""
    __tablename__ = 'otps'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    code = db.Column(db.String(6), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    expires_at = db.Column(db.DateTime, nullable=False)
    is_used = db.Column(db.Boolean, default=False)
    
    # Relationships
    user = db.relationship('User', back_populates='otps')
    
    @classmethod
    def generate_otp(cls, user_id):
        """Generate a new OTP for a user"""
        # Delete any existing unused OTPs for this user
        cls.query.filter_by(user_id=user_id, is_used=False).delete()
        
        # Generate a random 6-digit code
        code = ''.join(random.choices(string.digits, k=6))
        
        # Create a new OTP that expires in 10 minutes
        otp = cls(
            user_id=user_id,
            code=code,
            expires_at=datetime.utcnow() + timedelta(minutes=10)
        )
        
        db.session.add(otp)
        db.session.commit()
        
        return otp
    
    def is_valid(self):
        """Check if the OTP is still valid"""
        return (not self.is_used) and (datetime.utcnow() < self.expires_at)
    
    def use(self):
        """Mark the OTP as used"""
        self.is_used = True
        db.session.commit()