import os

# ---------------------------------------------------------------------------
# Flask App Settings
# ---------------------------------------------------------------------------
# Generate a random string for production, e.g. os.urandom(24).hex()
SECRET_KEY = os.environ.get('SECRET_KEY', 'default-secret-key-change-me')

# ---------------------------------------------------------------------------
# Authentication Settings
# ---------------------------------------------------------------------------
# The initial super-admin email. This account will be created automatically.
ADMIN_EMAIL = os.environ.get('ADMIN_EMAIL', 'admin@example.com')

# OTP expiration time in seconds (e.g., 600 = 10 minutes)
OTP_EXPIRY_SECONDS = int(os.environ.get('OTP_EXPIRY_SECONDS', 600))

# ---------------------------------------------------------------------------
# SMTP & Email Settings (cPanel)
# ---------------------------------------------------------------------------
# For local testing, leave SMTP_HOST blank, and OTP codes will be printed to
# the terminal console instead of being emailed.
SMTP_HOST = os.environ.get('SMTP_HOST', '')
SMTP_PORT = int(os.environ.get('SMTP_PORT', 465))
SMTP_USER = os.environ.get('SMTP_USER', '')
SMTP_PASS = os.environ.get('SMTP_PASS', '')
MAIL_FROM = os.environ.get('MAIL_FROM', 'noreply@example.com')
