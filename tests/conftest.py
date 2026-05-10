"""Pytest configuration for V-PRO tests"""
import sys
import os

# Add src/backend to path for imports
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))
