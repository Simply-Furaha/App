from flask import Blueprint

auth_bp = Blueprint('auth', __name__)
user_bp = Blueprint('user', __name__)
loan_bp = Blueprint('loan', __name__)
admin_bp = Blueprint('admin', __name__)
mpesa_bp = Blueprint('mpesa', __name__)

# Import routes to register them with the blueprints
from . import auth, user, loan, admin, mpesa