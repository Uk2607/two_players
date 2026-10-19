"""
Two Players - Configuration Module
Loads settings and secrets strictly from backend/.env or system environment.
"""

import os
import secrets
from pathlib import Path


def _load_env_file() -> None:
    """
    Zero-dependency loader for backend/.env.
    Does not overwrite existing system/shell environment variables.
    """
    backend_dir = Path(__file__).resolve().parent.parent
    env_path = backend_dir / '.env'

    if env_path.is_file():
        try:
            with open(env_path, 'r', encoding='utf-8') as f:
                for line in f:
                    line = line.strip()
                    if not line or line.startswith('#'):
                        continue
                    if '=' in line:
                        key, val = line.split('=', 1)
                        key = key.strip()
                        val = val.strip().strip("'\"")
                        if key and key not in os.environ:
                            os.environ[key] = val
        except Exception as e:
            print(f"[!] Warning: Could not read {env_path}: {e}")


# Automatically load backend/.env before evaluating Config attributes
_load_env_file()


class Config:
    """Application configuration loaded from environment variables."""

    # Never hardcode secrets in source code.
    # Read from backend/.env or generate a secure random 256-bit token in memory.
    SECRET_KEY = os.environ.get('SECRET_KEY') or secrets.token_hex(32)

    HOST = os.environ.get('HOST', '0.0.0.0')
    PORT = int(os.environ.get('PORT', 5050))
    DEBUG = os.environ.get('DEBUG', 'false').lower() in ('true', '1', 'yes')
    CORS_ORIGINS = os.environ.get('CORS_ORIGINS', '*')
    SOCKETIO_ASYNC_MODE = os.environ.get('SOCKETIO_ASYNC_MODE', 'threading')

    @classmethod
    def get_cors_origins(cls):
        """Parse CORS_ORIGINS as a list if comma-separated, or keep '*'."""
        origins = cls.CORS_ORIGINS.strip()
        if origins == '*':
            return '*'
        if ',' in origins:
            return [o.strip() for o in origins.split(',') if o.strip()]
        return origins


