# app/models/overpayment.py
from datetime import datetime
from . import db

class Overpayment(db.Model):
    """Model to track overpayments and their allocation"""
    __tablename__ = 'overpayments'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    original_payment_type = db.Column(db.String(50), nullable=False)  # 'contribution', 'loan_payment'
    original_payment_id = db.Column(db.Integer, nullable=True)  # ID of the original payment
    expected_amount = db.Column(db.Float, nullable=False)  # Expected payment amount
    actual_amount = db.Column(db.Float, nullable=False)  # Actual amount paid
    overpayment_amount = db.Column(db.Float, nullable=False)  # Extra amount paid
    status = db.Column(db.String(20), default='pending')  # 'pending', 'allocated', 'refunded'
    allocation_type = db.Column(db.String(50), nullable=True)  # 'future_contribution', 'loan_payment', 'refund'
    allocation_target_id = db.Column(db.Integer, nullable=True)  # ID of loan if allocated to loan payment
    allocated_amount = db.Column(db.Float, default=0.0)  # Amount already allocated
    remaining_amount = db.Column(db.Float, nullable=False)  # Remaining amount to allocate
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)  # Admin who processed allocation
    admin_notes = db.Column(db.Text, nullable=True)  # Admin notes about the allocation
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    allocated_at = db.Column(db.DateTime, nullable=True)  # When the overpayment was allocated
    
    # Relationships
    user = db.relationship('User', foreign_keys=[user_id], backref='overpayments')
    admin = db.relationship('User', foreign_keys=[admin_id])
    
    def __init__(self, **kwargs):
        super(Overpayment, self).__init__(**kwargs)
        # Set remaining_amount equal to overpayment_amount initially
        if not self.remaining_amount and self.overpayment_amount:
            self.remaining_amount = self.overpayment_amount
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'user_name': f"{self.user.first_name} {self.user.last_name}" if self.user else "Unknown User",
            'original_payment_type': self.original_payment_type,
            'original_payment_id': self.original_payment_id,
            'expected_amount': self.expected_amount,
            'actual_amount': self.actual_amount,
            'overpayment_amount': self.overpayment_amount,
            'status': self.status,
            'allocation_type': self.allocation_type,
            'allocation_target_id': self.allocation_target_id,
            'allocated_amount': self.allocated_amount,
            'remaining_amount': self.remaining_amount,
            'admin_id': self.admin_id,
            'admin_name': f"{self.admin.first_name} {self.admin.last_name}" if self.admin else None,
            'admin_notes': self.admin_notes,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'allocated_at': self.allocated_at.isoformat() if self.allocated_at else None
        }
    
    def allocate_to_future_contribution(self, admin_id, notes=None):
        """Allocate overpayment to future contributions"""
        self.allocation_type = 'future_contribution'
        self.allocated_amount = self.overpayment_amount
        self.remaining_amount = 0.0
        self.status = 'allocated'
        self.admin_id = admin_id
        self.admin_notes = notes
        self.allocated_at = datetime.utcnow()
        
        try:
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error allocating overpayment: {str(e)}")
            return False
    
    def allocate_to_loan(self, loan_id, admin_id, notes=None):
        """Allocate overpayment to loan payment"""
        from .loan import Loan
        
        loan = Loan.query.get(loan_id)
        if not loan or loan.user_id != self.user_id:
            return False, "Invalid loan or loan doesn't belong to this user"
        
        if loan.status != 'approved':
            return False, "Loan must be approved to receive payments"
        
        # Calculate how much can be allocated to this loan
        remaining_loan_balance = loan.unpaid_balance or (loan.amount_due - loan.paid_amount)
        allocation_amount = min(self.remaining_amount, remaining_loan_balance)
        
        if allocation_amount <= 0:
            return False, "No amount to allocate or loan is already fully paid"
        
        # Update loan payment
        loan.paid_amount += allocation_amount
        loan.unpaid_balance = max(0, loan.unpaid_balance - allocation_amount)
        
        if loan.unpaid_balance <= 0:
            loan.status = 'paid'
            loan.paid_date = datetime.utcnow()
        
        # Update overpayment
        self.allocation_type = 'loan_payment'
        self.allocation_target_id = loan_id
        self.allocated_amount += allocation_amount
        self.remaining_amount -= allocation_amount
        
        if self.remaining_amount <= 0:
            self.status = 'allocated'
        
        self.admin_id = admin_id
        self.admin_notes = notes
        self.allocated_at = datetime.utcnow()
        
        try:
            db.session.commit()
            return True, f"Allocated {allocation_amount} to loan #{loan_id}"
        except Exception as e:
            db.session.rollback()
            print(f"Error allocating overpayment to loan: {str(e)}")
            return False, "Database error occurred"