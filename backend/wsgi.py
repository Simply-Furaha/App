from app import create_app
from app.models import db
from app.models.user import User
from app.seed import seed_database
from dotenv import load_dotenv
import os

load_dotenv()

app = create_app(os.getenv('FLASK_ENV', 'development'))

@app.cli.command("create-admin")
def create_admin():
    """Create an admin user through the command line"""
    username = input("Enter admin username: ")
    email = input("Enter admin email: ")
    password = input("Enter admin password: ")
    first_name = input("Enter admin first name: ")
    last_name = input("Enter admin last name: ")
    phone_number = input("Enter admin phone number: ")
    
    admin = User(
        username=username,
        email=email,
        first_name=first_name,
        last_name=last_name,
        phone_number=phone_number,
        is_admin=True,
        is_verified=True
    )
    admin.password = password
    
    with app.app_context():
        db.session.add(admin)
        db.session.commit()
        print(f"Admin user {username} created successfully")

@app.cli.command("seed-db")
def run_seed():
    """Seed the database with initial data"""
    with app.app_context():
        seed_database()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)