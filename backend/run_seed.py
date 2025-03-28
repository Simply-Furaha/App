from app import create_app
from app.seed import seed_database

app = create_app('development')

with app.app_context():
    seed_database()