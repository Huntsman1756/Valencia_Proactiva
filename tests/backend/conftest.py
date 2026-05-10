import os
import sys

# Set env vars early so config.Settings() can initialise
os.environ.setdefault("DATABASE_URL", "sqlite:///:memory:")
os.environ.setdefault("ADMIN_TOKEN", "test_token")
os.environ.setdefault("CORS_ORIGINS", "http://localhost:3000")

sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src', 'backend'))
