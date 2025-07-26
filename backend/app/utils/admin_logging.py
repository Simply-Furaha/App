# app/utils/admin_logging.py
from flask import request
from ..models.admin_log import AdminActivityLog
import json

def log_admin_activity(admin_id, action, target_type, target_id=None, target_name=None, 
                      description=None, old_values=None, new_values=None):
    """
    Helper function to log admin activities with request context
    
    Args:
        admin_id: ID of the admin performing the action
        action: Action type (e.g., 'user_created', 'loan_approved', 'contribution_added')
        target_type: Type of target entity ('user', 'loan', 'contribution', 'investment')
        target_id: ID of the target entity
        target_name: Name/identifier of the target
        description: Detailed description of the action
        old_values: Dictionary of old values (for updates)
        new_values: Dictionary of new values (for updates)
    """
    
    # Get request context information
    ip_address = None
    user_agent = None
    
    if request:
        # Get real IP address (considering proxy headers)
        ip_address = request.environ.get('HTTP_X_FORWARDED_FOR', request.remote_addr)
        if ip_address and ',' in ip_address:
            ip_address = ip_address.split(',')[0].strip()
        
        user_agent = request.headers.get('User-Agent', '')[:500]  # Limit user agent length
    
    return AdminActivityLog.log_activity(
        admin_id=admin_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        target_name=target_name,
        description=description,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent
    )

# Predefined action types for consistency
class AdminActions:
    # User management
    USER_CREATED = "user_created"
    USER_DELETED = "user_deleted"
    USER_SUSPENDED = "user_suspended"
    USER_UNSUSPENDED = "user_unsuspended"
    USER_UPDATED = "user_updated"
    
    # Loan management
    LOAN_APPROVED = "loan_approved"
    LOAN_REJECTED = "loan_rejected"
    LOAN_UPDATED = "loan_updated"
    LOAN_PAYMENT_ADDED = "loan_payment_added"
    LOAN_DEBT_MODIFIED = "loan_debt_modified"
    
    # Contribution management
    CONTRIBUTION_ADDED = "contribution_added"
    CONTRIBUTION_UPDATED = "contribution_updated"
    CONTRIBUTION_DELETED = "contribution_deleted"
    
    # Investment management
    INVESTMENT_CREATED = "investment_created"
    INVESTMENT_UPDATED = "investment_updated"
    INVESTMENT_DELETED = "investment_deleted"
    
    # Overpayment management
    OVERPAYMENT_ALLOCATED = "overpayment_allocated"
    OVERPAYMENT_REFUNDED = "overpayment_refunded"
    
    # Admin-to-admin operations
    ADMIN_CONTRIBUTION_ADDED = "admin_contribution_added"
    ADMIN_LOAN_MODIFIED = "admin_loan_modified"

def get_user_display_name(user):
    """Helper to get user display name for logging"""
    if user:
        return f"{user.first_name} {user.last_name} ({user.username})"
    return "Unknown User"

def get_loan_display_name(loan):
    """Helper to get loan display name for logging"""
    if loan:
        user_name = get_user_display_name(loan.user)
        return f"Loan #{loan.id} - {user_name} - {loan.amount}"
    return "Unknown Loan"

def format_values_for_log(values):
    """Format values dictionary for logging, removing sensitive data"""
    if not isinstance(values, dict):
        return values
    
    # Remove sensitive fields
    sensitive_fields = ['password', 'password_hash', 'token', 'secret']
    cleaned_values = {}
    
    for key, value in values.items():
        if any(sensitive in key.lower() for sensitive in sensitive_fields):
            cleaned_values[key] = "[REDACTED]"
        else:
            cleaned_values[key] = value
    
    return cleaned_values