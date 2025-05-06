from datetime import datetime, timedelta
from . import db

class Loan(db.Model):
    """Loan model to track user loans"""
    __tablename__ = 'loans'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    interest_rate = db.Column(db.Float, default=5.0)  # 5% default
    status = db.Column(db.String(20), default='pending')  # pending, approved, paid
    amount_due = db.Column(db.Float)
    borrowed_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime)
    paid_amount = db.Column(db.Float, default=0)
    paid_date = db.Column(db.DateTime, nullable=True)
    unpaid_balance = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user = db.relationship('User', back_populates='loans')
    payments = db.relationship('LoanPayment', back_populates='loan', lazy='dynamic')
    
    def __init__(self, **kwargs):
        # Set default interest_rate if not provided
        if 'interest_rate' not in kwargs:
            kwargs['interest_rate'] = 5.0
            
        # Set defaults for other fields if not provided
        if 'paid_amount' not in kwargs:
            kwargs['paid_amount'] = 0.0
            
        # Initialize instance with the provided kwargs
        super(Loan, self).__init__(**kwargs)
        
        # Calculate loan details after initialization
        self.calculate_loan_details()
    
    def calculate_loan_details(self):
        """Calculate loan amount due, due date, and unpaid balance"""
        # Ensure amount and interest_rate are set and not None
        if self.amount is None:
            self.amount = 0.0
            
        if self.interest_rate is None:
            self.interest_rate = 5.0
            
        # Calculate interest amount and amount due
        interest_amount = (self.amount * self.interest_rate) / 100
        self.amount_due = self.amount + interest_amount
        
        # Set due date if borrowed_date is not None
        if self.borrowed_date:
            self.due_date = self.borrowed_date + timedelta(days=30)
        else:
            self.due_date = datetime.utcnow() + timedelta(days=30)
        
        # Calculate unpaid balance
        if self.paid_amount is None:
            self.paid_amount = 0.0
            
        self.unpaid_balance = self.amount_due - self.paid_amount
    
    def approve_loan(self):
        """Approve a pending loan"""
        if self.status == 'pending':
            self.status = 'approved'
            self.borrowed_date = datetime.utcnow()
            self.calculate_loan_details()
            return True
        return False
    
    def make_payment(self, amount, transaction_id=None):
        """Record a payment against the loan"""
        if amount <= 0:
            return False
            
        self.paid_amount += amount
        self.unpaid_balance = max(0, self.amount_due - self.paid_amount)
        
        # Create payment record
        payment = LoanPayment(
            loan_id=self.id,
            amount=amount,
            payment_date=datetime.utcnow(),
            transaction_id=transaction_id
        )
        db.session.add(payment)
        
        # Update status if fully paid
        if self.unpaid_balance == 0:
            self.status = 'paid'
            self.paid_date = datetime.utcnow()
            
        db.session.commit()
        return True
    
    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'amount': self.amount,
            'interest_rate': self.interest_rate,
            'status': self.status,
            'amount_due': self.amount_due,
            'borrowed_date': self.borrowed_date.isoformat() if self.borrowed_date else None,
            'due_date': self.due_date.isoformat() if self.due_date else None,
            'paid_amount': self.paid_amount,
            'paid_date': self.paid_date.isoformat() if self.paid_date else None,
            'unpaid_balance': self.unpaid_balance,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'days_remaining': (self.due_date - datetime.utcnow()).days if self.due_date else None
        }


class LoanPayment(db.Model):
    """Model to track individual loan payments"""
    __tablename__ = 'loan_payments'
    
    id = db.Column(db.Integer, primary_key=True)
    loan_id = db.Column(db.Integer, db.ForeignKey('loans.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    payment_date = db.Column(db.DateTime, default=datetime.utcnow)
    payment_method = db.Column(db.String(50), default='mpesa')
    transaction_id = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    loan = db.relationship('Loan', back_populates='payments')
    
    def to_dict(self):
        return {
            'id': self.id,
            'loan_id': self.loan_id,
            'amount': self.amount,
            'payment_date': self.payment_date.isoformat() if self.payment_date else None,
            'payment_method': self.payment_method,
            'transaction_id': self.transaction_id,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }