from datetime import datetime

def format_currency(amount):
    """Format amount as currency"""
    return "{:,.2f}".format(amount)

def get_greeting():
    """Get appropriate greeting based on time of day"""
    hour = datetime.now().hour
    
    if hour < 12:
        return "Good morning"
    elif hour < 18:
        return "Good afternoon"
    else:
        return "Good evening"