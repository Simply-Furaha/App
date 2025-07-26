# app/models/admin_log.py
from datetime import datetime
from . import db

class AdminActivityLog(db.Model):
    """Model to track admin activities and actions"""
    __tablename__ = 'admin_activity_logs'
    
    id = db.Column(db.Integer, primary_key=True)
    admin_id = db.Column(db.Integer, db.ForeignKey('users.id', ondelete='CASCADE'), nullable=False)
    action = db.Column(db.String(100), nullable=False)  # e.g., 'user_created', 'loan_approved', 'contribution_added'
    target_type = db.Column(db.String(50), nullable=False)  # 'user', 'loan', 'contribution', 'investment'
    target_id = db.Column(db.Integer, nullable=True)  # ID of the affected entity
    target_name = db.Column(db.String(200), nullable=True)  # Name/identifier of the target
    description = db.Column(db.Text, nullable=True)  # Detailed description of the action
    old_values = db.Column(db.Text, nullable=True)  # JSON string of old values (for updates)
    new_values = db.Column(db.Text, nullable=True)  # JSON string of new values (for updates)
    ip_address = db.Column(db.String(45), nullable=True)  # Admin's IP address
    user_agent = db.Column(db.String(500), nullable=True)  # Admin's browser info
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    admin = db.relationship('User', foreign_keys=[admin_id], backref='admin_activities')
    
    def __init__(self, **kwargs):
        super(AdminActivityLog, self).__init__(**kwargs)
    
    def to_dict(self):
        return {
            'id': self.id,
            'admin_id': self.admin_id,
            'admin_name': f"{self.admin.first_name} {self.admin.last_name}" if self.admin else "Unknown Admin",
            'action': self.action,
            'target_type': self.target_type,
            'target_id': self.target_id,
            'target_name': self.target_name,
            'description': self.description,
            'old_values': self.old_values,
            'new_values': self.new_values,
            'ip_address': self.ip_address,
            'user_agent': self.user_agent,
            'created_at': self.created_at.isoformat() if self.created_at else None
        }
    
    @staticmethod
    def log_activity(admin_id, action, target_type, target_id=None, target_name=None, 
                    description=None, old_values=None, new_values=None, 
                    ip_address=None, user_agent=None):
        """Helper method to log admin activities"""
        import json
        
        # Convert old_values and new_values to JSON strings if they're dicts
        if isinstance(old_values, dict):
            old_values = json.dumps(old_values)
        if isinstance(new_values, dict):
            new_values = json.dumps(new_values)
            
        log_entry = AdminActivityLog(
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
        
        try:
            db.session.add(log_entry)
            db.session.commit()
            return True
        except Exception as e:
            db.session.rollback()
            print(f"Error logging admin activity: {str(e)}")
            return False