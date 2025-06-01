# app/models/investment.py - Complete updated Investment model
from datetime import datetime
from . import db

class ExternalInvestment(db.Model):
    """Model to track external investments made by admins"""
    __tablename__ = 'external_investments'
    
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)
    investment_date = db.Column(db.DateTime, default=datetime.utcnow)
    expected_return = db.Column(db.Float, nullable=True)
    expected_return_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='active')  # active, completed, cancelled
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    admin = db.relationship('User')
    
    def to_dict(self):
        return {
            'id': self.id,
            'amount': self.amount,
            'description': self.description,
            'investment_date': self.investment_date.isoformat() if self.investment_date else None,
            'expected_return': self.expected_return,
            'expected_return_date': self.expected_return_date.isoformat() if self.expected_return_date else None,
            'status': self.status,
            'admin_id': self.admin_id,
            'admin_name': f"{self.admin.first_name} {self.admin.last_name}" if self.admin else None,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }