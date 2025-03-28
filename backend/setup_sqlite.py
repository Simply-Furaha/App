from app import create_app
from flask_sqlalchemy import SQLAlchemy
import os
from datetime import datetime, timedelta

# Force SQLite configuration
os.environ['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ninefund.db'
app = create_app('development')

# Override the SQLAlchemy URI directly in the app config
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///ninefund.db'

# Create database instance
db = SQLAlchemy(app)

# Import models after db is defined to avoid circular imports
class User(db.Model):
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
    
    def set_password(self, password):
        from werkzeug.security import generate_password_hash
        self.password_hash = generate_password_hash(password)

class Contribution(db.Model):
    __tablename__ = 'contributions'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    month = db.Column(db.Date, nullable=False)
    payment_method = db.Column(db.String(20), default='mpesa')
    transaction_id = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Loan(db.Model):
    __tablename__ = 'loans'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    amount = db.Column(db.Float, nullable=False)
    interest_rate = db.Column(db.Float, default=5.0)
    status = db.Column(db.String(20), default='pending')
    amount_due = db.Column(db.Float)
    borrowed_date = db.Column(db.DateTime, default=datetime.utcnow)
    due_date = db.Column(db.DateTime)
    paid_amount = db.Column(db.Float, default=0)
    paid_date = db.Column(db.DateTime, nullable=True)
    unpaid_balance = db.Column(db.Float)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def calculate_loan_details(self):
        interest_amount = (self.amount * self.interest_rate) / 100
        self.amount_due = self.amount + interest_amount
        self.due_date = self.borrowed_date + timedelta(days=30)
        self.unpaid_balance = self.amount_due - self.paid_amount

class ExternalInvestment(db.Model):
    __tablename__ = 'external_investments'
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Float, nullable=False)
    description = db.Column(db.Text, nullable=False)
    investment_date = db.Column(db.DateTime, default=datetime.utcnow)
    expected_return = db.Column(db.Float, nullable=True)
    expected_return_date = db.Column(db.DateTime, nullable=True)
    status = db.Column(db.String(20), default='active')
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

with app.app_context():
    # Create the database tables
    db.drop_all()
    db.create_all()
    
    # Create admin user
    admin = User(
        username='admin',
        email='admin@example.com',
        first_name='Admin',
        last_name='User',
        phone_number='+254700000000',
        is_admin=True,
        is_verified=True
    )
    admin.set_password('admin123')
    db.session.add(admin)
    
    # Create a regular user
    user = User(
        username='user',
        email='user@example.com',
        first_name='Regular',
        last_name='User',
        phone_number='+254711111111',
        is_admin=False,
        is_verified=True
    )
    user.set_password('user123')
    db.session.add(user)
    db.session.commit()
    
    # Add some sample contributions for the regular user
    for i in range(6):
        month_date = datetime.now() - timedelta(days=30 * i)
        contribution = Contribution(
            user_id=2,  # Will be assigned to the regular user
            amount=2000,
            month=month_date.replace(day=1)
        )
        db.session.add(contribution)
    
    # Add a sample loan
    loan = Loan(
        user_id=2,  # Regular user
        amount=10000,
        interest_rate=5.0,
        status='approved',
        borrowed_date=datetime.now() - timedelta(days=15),
        paid_amount=0
    )
    loan.calculate_loan_details()
    db.session.add(loan)
    
    # Add a sample external investment
    investment = ExternalInvestment(
        amount=50000,
        description="Real estate investment fund",
        investment_date=datetime.now() - timedelta(days=30),
        expected_return=55000,
        expected_return_date=datetime.now() + timedelta(days=60),
        admin_id=1,  # Admin user
        status='active'
    )
    db.session.add(investment)
    
    db.session.commit()
    print("Database initialized with admin and regular user")