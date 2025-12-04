"""
Email service using SendGrid, Mailgun, or SMTP for sending transactional emails
"""
from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
import os
from typing import Optional
import logging
import requests
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

logger = logging.getLogger(__name__)

class EmailService:
    """Service for sending emails via SendGrid, Mailgun, or SMTP"""
    
    def __init__(self):
        # Check SendGrid configuration
        self.sendgrid_key = os.getenv('SENDGRID_API_KEY')
        self.sendgrid_enabled = self.sendgrid_key and self.sendgrid_key != 'SG.test_key_replace_with_real'
        
        # Check Mailgun configuration
        self.mailgun_key = os.getenv('MAILGUN_API_KEY')
        self.mailgun_domain = os.getenv('MAILGUN_DOMAIN')
        self.mailgun_enabled = self.mailgun_key and self.mailgun_domain and self.mailgun_key != 'your_mailgun_api_key_here'
        
        # Check SMTP configuration (Gmail or custom SMTP)
        self.smtp_host = os.getenv('SMTP_HOST', 'smtp.gmail.com')
        self.smtp_port = int(os.getenv('SMTP_PORT', '587'))
        self.smtp_user = os.getenv('SMTP_USER')
        self.smtp_pass = os.getenv('SMTP_PASSWORD')
        self.smtp_enabled = self.smtp_user and self.smtp_pass and self.smtp_user != 'your_gmail_address@gmail.com'
        
        # Sender email
        self.sender_email = os.getenv('SENDER_EMAIL', self.smtp_user if self.smtp_enabled else 'noreply@signalmaster.app')
        
        # Determine which service to use (priority: SendGrid > Mailgun > SMTP)
        self.enabled = self.sendgrid_enabled or self.mailgun_enabled or self.smtp_enabled
        self.service = 'sendgrid' if self.sendgrid_enabled else ('mailgun' if self.mailgun_enabled else ('smtp' if self.smtp_enabled else None))
        
        if not self.enabled:
            logger.warning("⚠️ No email service configured. Emails will be logged but not sent.")
            logger.warning("💡 To enable real email sending, configure one of:")
            logger.warning("   - SMTP (Gmail): SMTP_USER, SMTP_PASSWORD")
            logger.warning("   - Mailgun: MAILGUN_API_KEY, MAILGUN_DOMAIN")
            logger.warning("   - SendGrid: SENDGRID_API_KEY")
        else:
            logger.info(f"✅ Email service enabled using: {self.service}")
    
    def send_email(self, to_email: str, subject: str, html_content: str, plain_content: Optional[str] = None) -> bool:
        """
        Send an email via SendGrid, Mailgun, or SMTP
        
        Args:
            to_email: Recipient email address
            subject: Email subject
            html_content: HTML content of the email
            plain_content: Plain text content (optional, will use stripped HTML if not provided)
        
        Returns:
            bool: True if email was sent successfully
        """
        if not self.enabled:
            logger.info(f"[EMAIL SIMULATION] To: {to_email}, Subject: {subject}")
            logger.info(f"[EMAIL CONTENT]\n{html_content}")
            return True
        
        try:
            if self.service == 'sendgrid':
                return self._send_via_sendgrid(to_email, subject, html_content, plain_content)
            elif self.service == 'mailgun':
                return self._send_via_mailgun(to_email, subject, html_content, plain_content)
            elif self.service == 'smtp':
                return self._send_via_smtp(to_email, subject, html_content, plain_content)
            else:
                logger.error("No email service configured")
                return False
                
        except Exception as e:
            logger.error(f"Failed to send email to {to_email}: {str(e)}")
            return False
    
    def _send_via_sendgrid(self, to_email: str, subject: str, html_content: str, plain_content: Optional[str] = None) -> bool:
        """Send email via SendGrid"""
        try:
            message = Mail(
                from_email=self.sender_email,
                to_emails=to_email,
                subject=subject,
                html_content=html_content,
                plain_text_content=plain_content
            )
            
            sg = SendGridAPIClient(self.sendgrid_key)
            response = sg.send(message)
            
            logger.info(f"✅ Email sent via SendGrid to {to_email}. Status: {response.status_code}")
            return response.status_code in [200, 202]
            
        except Exception as e:
            logger.error(f"SendGrid error: {str(e)}")
            return False
    
    def _send_via_mailgun(self, to_email: str, subject: str, html_content: str, plain_content: Optional[str] = None) -> bool:
        """Send email via Mailgun API"""
        try:
            # Strip HTML tags for plain text if not provided
            if not plain_content:
                import re
                plain_content = re.sub('<[^<]+?>', '', html_content)
            
            api_url = f"https://api.mailgun.net/v3/{self.mailgun_domain}/messages"
            
            response = requests.post(
                api_url,
                auth=("api", self.mailgun_key),
                data={
                    "from": f"MI Mobile Indicator <postmaster@{self.mailgun_domain}>",
                    "to": to_email,
                    "subject": subject,
                    "html": html_content,
                    "text": plain_content
                }
            )
            
            if response.status_code == 200:
                logger.info(f"✅ Email sent via Mailgun to {to_email}")
                return True
            else:
                logger.error(f"Mailgun error: {response.status_code} - {response.text}")
                return False
                
        except Exception as e:
            logger.error(f"Mailgun error: {str(e)}")
            return False
    
    def _send_via_smtp(self, to_email: str, subject: str, html_content: str, plain_content: Optional[str] = None) -> bool:
        """Send email via SMTP (Gmail or custom server)"""
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = self.sender_email
            msg['To'] = to_email
            
            # Strip HTML tags for plain text if not provided
            if not plain_content:
                import re
                plain_content = re.sub('<[^<]+?>', '', html_content)
            
            # Attach both text and HTML versions
            part1 = MIMEText(plain_content, 'plain')
            part2 = MIMEText(html_content, 'html')
            msg.attach(part1)
            msg.attach(part2)
            
            # Connect and send
            with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()
                server.login(self.smtp_user, self.smtp_pass)
                server.send_message(msg)
            
            logger.info(f"✅ Email sent via SMTP to {to_email}")
            return True
                
        except Exception as e:
            logger.error(f"SMTP error: {str(e)}")
            logger.error(f"SMTP details - Host: {self.smtp_host}, Port: {self.smtp_port}, User: {self.smtp_user}")
            return False
    
    async def send_password_reset_email(self, to_email: str, user_name: str, temporary_password: str, is_mentor: bool = False) -> bool:
        """
        Send a password reset email with temporary password
        """
        user_type = "Mentor Portal" if is_mentor else "User Portal"
        
        subject = "🔒 Your MI Mobile Indicator Password Has Been Reset"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
            <head>
                <meta charset="utf-8">
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }}
                    .content {{ background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }}
                    .password-box {{ background: white; border: 2px solid #667eea; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }}
                    .password {{ font-size: 24px; font-weight: bold; color: #667eea; letter-spacing: 2px; font-family: monospace; }}
                    .warning {{ background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>MI Mobile Indicator</h1>
                        <p>{user_type}</p>
                    </div>
                    <div class="content">
                        <h2 style="color: #667eea;">Password Reset 🔑</h2>
                        <p>Hello <strong>{user_name}</strong>,</p>
                        <p>Your password has been reset. Here are your new login credentials:</p>
                        
                        <div class="password-box">
                            <p style="margin: 0; color: #666; font-size: 14px;">Email</p>
                            <p style="margin: 5px 0; font-size: 16px;"><strong>{to_email}</strong></p>
                            <hr style="border: none; border-top: 1px solid #eee; margin: 15px 0;">
                            <p style="margin: 0; color: #666; font-size: 14px;">Temporary Password</p>
                            <p class="password"><code style="font-size: 18px; background: #f0f0f0; padding: 10px 20px; border-radius: 5px;">{temporary_password}</code></p>
                        </div>
                        
                        <div class="warning">
                            <p style="margin: 0;"><strong>⚠️ Important Security Notice:</strong><br>
                            Please change this temporary password immediately after logging in. Do not share this password with anyone.</p>
                        </div>
                        
                        <p style="color: #555;">If you did not request this password reset, please contact support immediately.</p>
                        
                        <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                            <p style="color: #888; font-size: 12px;">
                                © 2025 MI Mobile Indicator. All rights reserved.<br>
                                This is an automated email, please do not reply.
                            </p>
                        </div>
                    </div>
                </div>
            </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)
    
    async def send_approval_email(self, to_email: str, user_name: str) -> bool:
        """Send account approval notification"""
        subject = "✅ Your Signal Master Account is Approved!"
        
        html_content = f"""
        <!DOCTYPE html>
        <html>
            <body style="font-family: Arial, sans-serif; line-height: 1.6;">
                <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                    <h2 style="color: #4CAF50;">Welcome to Signal Master!</h2>
                    <p>Hello {user_name},</p>
                    <p>Great news! Your account has been approved and you now have full access to Signal Master.</p>
                    <p>You can now:</p>
                    <ul>
                        <li>Configure and run trading EAs</li>
                        <li>Receive real-time trading signals</li>
                        <li>Monitor your trading performance</li>
                    </ul>
                    <p>Log in now to get started!</p>
                    <p style="color: #666; font-size: 12px; margin-top: 30px;">
                        © 2025 Signal Master. All rights reserved.
                    </p>
                </div>
            </body>
        </html>
        """
        
        return self.send_email(to_email, subject, html_content)

# Create a singleton instance
email_service = EmailService()
