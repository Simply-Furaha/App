# app/models/payment_status.py
# Store this new file in: app/models/payment_status.py

from datetime import datetime
from . import db

class PaymentStatus(db.Model):
    """Model to track M-PESA payment status for real-time updates"""
    __tablename__ = 'payment_status'
    
    id = db.Column(db.Integer, primary_key=True)
    
    # M-PESA transaction identifiers
    checkout_request_id = db.Column(db.String(100), unique=True, nullable=False, index=True)
    merchant_request_id = db.Column(db.String(100), nullable=True)
    
    # User and transaction details
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    transaction_type = db.Column(db.String(20), nullable=False)  # 'contribution', 'loan_repayment'
    amount = db.Column(db.Float, nullable=False)
    phone_number = db.Column(db.String(15), nullable=False)
    
    # Status tracking
    status = db.Column(db.String(20), default='pending')  # pending, success, failed, timeout
    mpesa_receipt_number = db.Column(db.String(50), nullable=True)
    failure_reason = db.Column(db.Text, nullable=True)
    
    # Related record IDs (set after successful processing)
    contribution_id = db.Column(db.Integer, db.ForeignKey('contributions.id', ondelete='SET NULL'), nullable=True)
    loan_payment_id = db.Column(db.Integer, db.ForeignKey('loan_payments.id', ondelete='SET NULL'), nullable=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id', ondelete='CASCADE'), nullable=True)  # For loan repayments
    
    # Timestamps
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    completed_at = db.Column(db.DateTime, nullable=True)
    
    # Relationships
    user = db.relationship('User', backref='payment_statuses')
    contribution = db.relationship('Contribution', backref='payment_status')
    loan_payment = db.relationship('LoanPayment', backref='payment_status')
    loan = db.relationship('Loan', backref='payment_statuses')
    
    def __init__(self, **kwargs):
        super(PaymentStatus, self).__init__(**kwargs)
        
    def mark_success(self, receipt_number, related_id=None):
        """Mark payment as successful"""
        self.status = 'success'
        self.mpesa_receipt_number = receipt_number
        self.completed_at = datetime.utcnow()
        
        if related_id:
            if self.transaction_type == 'contribution':
                self.contribution_id = related_id
            elif self.transaction_type == 'loan_repayment':
                self.loan_payment_id = related_id
        
        db.session.commit()
    
    def mark_failed(self, reason):
        """Mark payment as failed"""
        self.status = 'failed'
        self.failure_reason = reason
        self.completed_at = datetime.utcnow()
        db.session.commit()
    
    def mark_timeout(self):
        """Mark payment as timed out"""
        self.status = 'timeout'
        self.failure_reason = 'Transaction timed out'
        self.completed_at = datetime.utcnow()
        db.session.commit()
    
    def is_pending(self):
        """Check if payment is still pending"""
        return self.status == 'pending'
    
    def is_completed(self):
        """Check if payment is completed (success or failed)"""
        return self.status in ['success', 'failed', 'timeout']
    
    def to_dict(self):
        """Convert to dictionary for API responses"""
        return {
            'id': self.id,
            'checkout_request_id': self.checkout_request_id,
            'merchant_request_id': self.merchant_request_id,
            'user_id': self.user_id,
            'transaction_type': self.transaction_type,
            'amount': self.amount,
            'phone_number': self.phone_number,
            'status': self.status,
            'mpesa_receipt_number': self.mpesa_receipt_number,
            'failure_reason': self.failure_reason,
            'contribution_id': self.contribution_id,
            'loan_payment_id': self.loan_payment_id,
            'loan_id': self.loan_id,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None
        }
    
    @classmethod
    def create_pending_payment(cls, checkout_request_id, merchant_request_id, user_id, 
                             transaction_type, amount, phone_number, loan_id=None):
        """Create a new pending payment record"""
        payment_status = cls(
            checkout_request_id=checkout_request_id,
            merchant_request_id=merchant_request_id,
            user_id=user_id,
            transaction_type=transaction_type,
            amount=amount,
            phone_number=phone_number,
            loan_id=loan_id,
            status='pending'
        )
        
        db.session.add(payment_status)
        db.session.commit()
        
        return payment_status
    
    @classmethod
    def find_by_checkout_id(cls, checkout_request_id):
        """Find payment status by checkout request ID"""
        return cls.query.filter_by(checkout_request_id=checkout_request_id).first()
    
    @classmethod
    def get_user_pending_payments(cls, user_id):
        """Get all pending payments for a user"""
        return cls.query.filter_by(user_id=user_id, status='pending').all()
    
    @classmethod
    def cleanup_old_records(cls, days=7):
        """Clean up completed payment records older than specified days"""
        from datetime import timedelta
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        
        old_records = cls.query.filter(
            cls.completed_at < cutoff_date,
            cls.status.in_(['success', 'failed', 'timeout'])
        ).all()
        
        for record in old_records:
            db.session.delete(record)
        
        db.session.commit()
        return len(old_records)