"""Gunicorn entrypoint: load once at import."""
from sign_api_lite import app, load_everything
load_everything()
