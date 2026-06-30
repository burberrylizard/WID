"""
Configuration module for the WIDS Flask backend.
Loads settings from environment variables via python-dotenv.
"""

import os
from dotenv import load_dotenv

# Load .env file from the backend directory
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), '.env'))


class Config:
    """Application configuration loaded from environment variables."""

    # ── Flask Core ──────────────────────────────────────────────────────
    SECRET_KEY: str = os.getenv('SECRET_KEY', 'change-me-to-a-random-string')
    FLASK_ENV: str = os.getenv('FLASK_ENV', 'development')

    # ── Database ────────────────────────────────────────────────────────
    # Set DB_DRIVER=mysql in .env to use MySQL, otherwise defaults to SQLite
    DB_DRIVER: str = os.getenv('DB_DRIVER', 'sqlite')
    DB_HOST: str = os.getenv('DB_HOST', 'localhost')
    DB_PORT: str = os.getenv('DB_PORT', '3306')
    DB_USER: str = os.getenv('DB_USER', 'root')
    DB_PASSWORD: str = os.getenv('DB_PASSWORD', '')
    DB_NAME: str = os.getenv('DB_NAME', 'wids_db')

    @staticmethod
    def _build_db_uri() -> str:
        driver = os.getenv('DB_DRIVER', 'sqlite')
        if driver == 'mysql':
            return (
                f"mysql+pymysql://{os.getenv('DB_USER', 'root')}:"
                f"{os.getenv('DB_PASSWORD', '')}@"
                f"{os.getenv('DB_HOST', 'localhost')}:"
                f"{os.getenv('DB_PORT', '3306')}/"
                f"{os.getenv('DB_NAME', 'wids_db')}"
            )
        # Default: SQLite file in backend directory
        db_path = os.path.join(
            os.path.dirname(os.path.dirname(__file__)), 'wids.db'
        )
        return f"sqlite:///{db_path}"

    SQLALCHEMY_DATABASE_URI: str = _build_db_uri()
    SQLALCHEMY_TRACK_MODIFICATIONS: bool = False

    # ── Flask-Mail ──────────────────────────────────────────────────────
    MAIL_ENABLED: bool = os.getenv('MAIL_ENABLED', 'false').lower() in ('true', '1', 'yes')
    MAIL_SERVER: str = os.getenv('MAIL_SERVER', 'smtp.gmail.com')
    MAIL_PORT: int = int(os.getenv('MAIL_PORT', '587'))
    MAIL_USE_TLS: bool = True
    MAIL_USERNAME: str = os.getenv('MAIL_USERNAME', '')
    MAIL_PASSWORD: str = os.getenv('MAIL_PASSWORD', '')
    MAIL_DEFAULT_SENDER: str = os.getenv('MAIL_DEFAULT_SENDER', '')

    # ── Scanner ─────────────────────────────────────────────────────────
    SCAN_INTERVAL: int = int(os.getenv('SCAN_INTERVAL', '30'))  # seconds
