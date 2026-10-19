"""
Two Players - Configuration Module
Centralizes all app settings & constants.
"""

import os


class Config:
    """Application configuration."""
    SECRET_KEY = os.environ.get('SECRET_KEY', 'two-players-secret-key')
    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5050))
    DEBUG = os.environ.get('DEBUG', 'true').lower() == 'true'
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    SOCKETIO_ASYNC_MODE = 'threading'
