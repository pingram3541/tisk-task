import os

# ---------------------------------------------------------------------------
# Flask App Settings
# ---------------------------------------------------------------------------
# Generate a random string for production, e.g. os.urandom(24).hex()
SECRET_KEY = os.environ.get('SECRET_KEY', 'change-this-to-a-secure-random-string')

# ---------------------------------------------------------------------------
# Authentication Settings
# ---------------------------------------------------------------------------
# The initial super-admin email. This account will be created automatically.
ADMIN_EMAIL = 'admin@example.com'

# OTP expiration time in seconds (e.g., 600 = 10 minutes)
OTP_EXPIRY_SECONDS = 600

# ---------------------------------------------------------------------------
# SMTP & Email Settings (cPanel)
# ---------------------------------------------------------------------------
# For local testing, leave SMTP_HOST blank, and OTP codes will be printed to
# the terminal console instead of being emailed.
SMTP_HOST = 'smtp.example.com'
SMTP_PORT = 465 # Typical for SSL
SMTP_USER = 'no-reply@example.com'
SMTP_PASS = 'YOUR_EMAIL_PASSWORD_HERE'
MAIL_FROM = 'no-reply@example.com'
