from datetime import datetime, timedelta
from .models import db
from .models.user import User
from .models.contribution import Contribution
from .models.loan import Loan, LoanPayment
from .models.investment import ExternalInvestment
import random

def seed_database():
    """Seed the database with initial data from the Excel file"""
    print("Seeding database...")
    
    # Check if database is already seeded
    admin_check = User.query.filter_by(username="admin1").first()
    if admin_check:
        print("Database appears to be already seeded. Skipping...")
        return
    
    # Create admin users
    admin1 = User(
        username="admin1",
        email="admin1@ninefund.com",
        password="admin123",
        first_name="Admin",
        last_name="One",
        phone_number="+254700000001",
        is_admin=True,
        is_verified=True
    )
    
    admin2 = User(
        username="admin2",
        email="admin2@ninefund.com",
        password="admin123",
        first_name="Admin",
        last_name="Two",
        phone_number="+254700000002",
        is_admin=True,
        is_verified=True
    )
    
    admin3 = User(
        username="admin3",
        email="admin3@ninefund.com",
        password="admin123",
        first_name="Admin",
        last_name="Three",
        phone_number="+254700000003",
        is_admin=True,
        is_verified=True
    )
    
    db.session.add_all([admin1, admin2, admin3])
    db.session.commit()
    
    # Create regular users from Excel data
    regular_users = [
        User(
            username="stacy",
            email="stacy@example.com",
            password="password123",
            first_name="Stacy",
            last_name="Johnson",
            phone_number="+254701000001",
            is_verified=True
        ),
        User(
            username="asha",
            email="asha@example.com",
            password="password123",
            first_name="Asha",
            last_name="Smith",
            phone_number="+254701000002",
            is_verified=True
        ),
        User(
            username="cheryl",
            email="cheryl@example.com",
            password="password123",
            first_name="Cheryl",
            last_name="Williams",
            phone_number="+254701000003",
            is_verified=True
        ),
        User(
            username="sophie",
            email="sophie@example.com",
            password="password123",
            first_name="Sophie",
            last_name="Brown",
            phone_number="+254701000004",
            is_verified=True
        ),
        User(
            username="florence",
            email="fachieng387@gmail.com",
            password="password123",
            first_name="Florence",
            last_name="Taylor",
            phone_number="+254715780784",
            is_admin=True,
            is_verified=True
        ),
        User(
            username="sarah",
            email="sarah@example.com",
            password="password123",
            first_name="Sarah",
            last_name="Davis",
            phone_number="+254701000006",
            is_verified=True
        ),
        User(
            username="byron",
            email="byron.ochola@gmail.com",
            password="admin123",
            first_name="Byron",
            last_name="Ochola",
            phone_number="+254723165673",
            is_admin=True,
            is_verified=True
        ),
        User(
            username="fabian",
            email="fabian@example.com",
            password="password123",
            first_name="Fabian",
            last_name="Wilson",
            phone_number="+254701000008",
            is_verified=True
        ),
        User(
            username="jill",
            email="jillbach001@gmail.com",
            password="admin123",
            first_name="Jill",
            last_name="Moore",
            phone_number="+254720167887",
            is_admin=True,
            is_verified=True
        )
    ]
    
    db.session.add_all(regular_users)
    db.session.commit()
    
    # Seed contributions
    # Based on Excel data, contributions start from Nov 2020
    # with 2000 per month until 2023, then 3000 per month
    start_date = datetime(2020, 11, 1)
    today = datetime.today()
    
    # Calculate number of months between start date and today
    months_diff = (today.year - start_date.year) * 12 + (today.month - start_date.month)
    
    for user in regular_users:
        for i in range(months_diff + 1):
            # Determine month date
            month_date = start_date + timedelta(days=30 * i)
            
            # Determine contribution amount (2000 until 2023, then 3000)
            amount = 2000 if month_date.year < 2024 else 3000
            
            # Add some randomness to make data more realistic
            # Some users might miss some months
            if random.random() > 0.1:  # 90% chance of making a contribution
                contribution = Contribution(
                    user_id=user.id,
                    amount=amount,
                    month=month_date,
                    payment_method='mpesa',
                    transaction_id=f"MPESA{random.randint(100000, 999999)}"
                )
                db.session.add(contribution)
    
    db.session.commit()
    
    # Add sample loans
    # Asha's loan as per Excel
    asha = User.query.filter_by(username='asha').first()
    loan_asha = Loan(
        user_id=asha.id,
        amount=45000,
        interest_rate=5.0,
        status='approved',
        borrowed_date=datetime(2023, 9, 7),
        paid_amount=15000  # Partially paid
    )
    loan_asha.calculate_loan_details()
    db.session.add(loan_asha)
    # Commit to get the loan ID before adding payment
    db.session.commit()
    
    # Add payment for Asha's loan
    payment_asha = LoanPayment(
        loan_id=loan_asha.id,  # Now loan_asha has a valid ID
        amount=15000,
        payment_date=datetime(2023, 11, 6),
        transaction_id="MPESA123456"
    )
    db.session.add(payment_asha)
    
    # Cheryl's loan as per Excel
    cheryl = User.query.filter_by(username='cheryl').first()
    loan_cheryl = Loan(
        user_id=cheryl.id,
        amount=50000,
        interest_rate=5.0,
        status='approved',
        borrowed_date=datetime(2024, 10, 2)
    )
    loan_cheryl.calculate_loan_details()
    db.session.add(loan_cheryl)
    
    # Sophie's loan
    sophie = User.query.filter_by(username='sophie').first()
    loan_sophie = Loan(
        user_id=sophie.id,
        amount=50000,
        interest_rate=5.0,
        status='approved',
        borrowed_date=datetime(2024, 6, 7)
    )
    loan_sophie.calculate_loan_details()
    db.session.add(loan_sophie)
    
    # Jill's loan
    jill = User.query.filter_by(username='jill').first()
    loan_jill = Loan(
        user_id=jill.id,
        amount=50000,
        interest_rate=5.0,
        status='approved',
        borrowed_date=datetime(2024, 7, 12)
    )
    loan_jill.calculate_loan_details()
    db.session.add(loan_jill)
    
    # Get sarah user object
    sarah = User.query.filter_by(username='sarah').first()
    
    # Add some pending loan applications
    loan_pending = Loan(
        user_id=sarah.id,
        amount=40000,
        status='pending'
    )
    db.session.add(loan_pending)
    
    db.session.commit()
    
    # Add sample external investments
    investment1 = ExternalInvestment(
        amount=100000,
        description="Real estate investment fund",
        investment_date=datetime.now() - timedelta(days=60),
        expected_return=115000,
        expected_return_date=datetime.now() + timedelta(days=120),
        admin_id=admin1.id,
        status='active'
    )
    
    investment2 = ExternalInvestment(
        amount=50000,
        description="Treasury bills",
        investment_date=datetime.now() - timedelta(days=30),
        expected_return=52500,
        expected_return_date=datetime.now() + timedelta(days=90),
        admin_id=admin2.id,
        status='active'
    )
    
    investment3 = ExternalInvestment(
        amount=75000,
        description="Corporate bonds",
        investment_date=datetime.now() - timedelta(days=90),
        expected_return=82500,
        expected_return_date=datetime.now() + timedelta(days=180),
        admin_id=admin1.id,
        status='active'
    )
    
    db.session.add_all([investment1, investment2, investment3])
    db.session.commit()
    
    print("Database seeding completed successfully!")