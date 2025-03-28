from flask import current_app, render_template
from flask_mail import Message
from .. import mail

def send_email(to, subject, template, **kwargs):
    """
    Send an email using the configured mail settings
    
    Args:
        to: Recipient email address
        subject: Email subject
        template: Path to the email template
        **kwargs: Variables to pass to the template
    """
    msg = Message(
        subject,
        recipients=[to],
        sender=current_app.config['MAIL_DEFAULT_SENDER']
    )
    msg.html = render_template(template, **kwargs)
    mail.send(msg)

def send_otp_email(user, otp):
    """
    Send an OTP verification email to a user
    
    Args:
        user: User object
        otp: OTP code
    """
    send_email(
        to=user.email,
        subject="Your NineFund Verification Code",
        template="emails/otp.html",
        user=user,
        otp=otp
    )