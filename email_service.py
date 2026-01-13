"""
SendGrid Email Service for MI Mobile Indicator
Handles: Welcome emails, Password reset emails
"""
import os
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import logging

logger = logging.getLogger(__name__)

SENDGRID_API_KEY = os.getenv('SENDGRID_API_KEY')
SENDER_EMAIL = os.getenv('SENDER_EMAIL', 'miindicator@gmail.com')

def send_email(to_email: str, subject: str, html_content: str) -> bool:
    """Send an email via SendGrid"""
    if not SENDGRID_API_KEY or SENDGRID_API_KEY == 'SG.test_key_replace_with_real':
        logger.warning(f"SendGrid not configured. Would send email to {to_email}")
        return False
    
    try:
        message = Mail(
            from_email=SENDER_EMAIL,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        
        sg = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        
        if response.status_code == 202:
            logger.info(f"✅ Email sent successfully to {to_email}")
            return True
        else:
            logger.error(f"❌ Email failed with status {response.status_code}")
            return False
            
    except Exception as e:
        logger.error(f"❌ SendGrid error: {str(e)}")
        return False


def send_welcome_email(to_email: str, user_name: str, license_key: str) -> bool:
    """Send welcome email with license key to new user"""
    subject = "🎉 Welcome to MI Mobile Indicator!"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .license-box {{ background: #fff; border: 2px dashed #667eea; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }}
            .license-key {{ font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; }}
            .button {{ display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #888; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>Welcome to MI Mobile Indicator!</h1>
            </div>
            <div class="content">
                <p>Hi {user_name or 'there'},</p>
                
                <p>Thank you for joining MI Mobile Indicator! Your account has been successfully created.</p>
                
                <div class="license-box">
                    <p><strong>Your License Key:</strong></p>
                    <p class="license-key">{license_key}</p>
                </div>
                
                <p><strong>Getting Started:</strong></p>
                <ul>
                    <li>Download the MI Mobile Indicator app</li>
                    <li>Log in with your email and password</li>
                    <li>Your license is already activated!</li>
                    <li>Start receiving trading signals</li>
                </ul>
                
                <p>If you have any questions, feel free to reach out to your mentor or our support team.</p>
                
                <p>Happy trading! 📈</p>
                
                <p>Best regards,<br>The MI Mobile Indicator Team</p>
            </div>
            <div class="footer">
                <p>© 2025 MI Mobile Indicator. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)


def send_password_reset_email(to_email: str, user_name: str, temp_password: str) -> bool:
    """Send password reset email with temporary password"""
    subject = "🔐 Your Password Reset - MI Mobile Indicator"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .password-box {{ background: #fff; border: 2px solid #f5576c; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }}
            .temp-password {{ font-size: 28px; font-weight: bold; color: #f5576c; letter-spacing: 3px; font-family: monospace; }}
            .warning {{ background: #fff3cd; border: 1px solid #ffc107; padding: 15px; border-radius: 5px; margin: 20px 0; }}
            .footer {{ text-align: center; padding: 20px; color: #888; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🔐 Password Reset</h1>
            </div>
            <div class="content">
                <p>Hi {user_name or 'there'},</p>
                
                <p>We received a request to reset your password. Here is your temporary password:</p>
                
                <div class="password-box">
                    <p><strong>Temporary Password:</strong></p>
                    <p class="temp-password">{temp_password}</p>
                </div>
                
                <div class="warning">
                    <strong>⚠️ Important:</strong>
                    <ul>
                        <li>This temporary password will expire in 24 hours</li>
                        <li>Use this password to log into the app</li>
                        <li>We recommend changing your password after logging in</li>
                    </ul>
                </div>
                
                <p>If you didn't request this password reset, please ignore this email or contact support immediately.</p>
                
                <p>Best regards,<br>The MI Mobile Indicator Team</p>
            </div>
            <div class="footer">
                <p>© 2025 MI Mobile Indicator. All rights reserved.</p>
                <p>This is an automated message. Please do not reply.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)


def send_mentor_approval_email(to_email: str, mentor_name: str, mentor_id: str) -> bool:
    """Send email when mentor is approved"""
    subject = "✅ Your Mentor Account is Approved - MI Mobile Indicator"
    
    html_content = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <style>
            body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
            .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
            .header {{ background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
            .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
            .id-box {{ background: #fff; border: 2px solid #11998e; padding: 20px; margin: 20px 0; text-align: center; border-radius: 8px; }}
            .mentor-id {{ font-size: 24px; font-weight: bold; color: #11998e; letter-spacing: 2px; }}
            .footer {{ text-align: center; padding: 20px; color: #888; font-size: 12px; }}
        </style>
    </head>
    <body>
        <div class="container">
            <div class="header">
                <h1>🎉 Congratulations!</h1>
                <p>Your Mentor Account is Approved</p>
            </div>
            <div class="content">
                <p>Hi {mentor_name},</p>
                
                <p>Great news! Your mentor account has been approved. You can now access the mentor dashboard and start managing your users.</p>
                
                <div class="id-box">
                    <p><strong>Your Mentor ID:</strong></p>
                    <p class="mentor-id">{mentor_id}</p>
                </div>
                
                <p><strong>What you can do now:</strong></p>
                <ul>
                    <li>Log into the Mentor Dashboard</li>
                    <li>Send trading signals to your users</li>
                    <li>Manage your user base</li>
                    <li>Track user activity</li>
                </ul>
                
                <p>Welcome to the MI Mobile Indicator mentor community!</p>
                
                <p>Best regards,<br>The MI Mobile Indicator Team</p>
            </div>
            <div class="footer">
                <p>© 2025 MI Mobile Indicator. All rights reserved.</p>
            </div>
        </div>
    </body>
    </html>
    """
    
    return send_email(to_email, subject, html_content)
