import os
import sys

# Add the app directory to the python path
sys.path.insert(0, os.path.dirname(__file__))

# Import the Flask app as 'application' for Passenger
from app import app as application
