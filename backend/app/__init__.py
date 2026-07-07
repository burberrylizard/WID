"""
WiFi Intrusion Detection System – Flask Application Factory
"""

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS

# Module-level db instance so models can import it directly
db = SQLAlchemy()

# Mail instance (initialised conditionally inside create_app)
mail = None


def create_app() -> Flask:
    """Create and configure the Flask application."""
    global mail

    app = Flask(__name__)

    # ── Load configuration ──────────────────────────────────────────────
    from app.config import Config
    app.config.from_object(Config)

    # ── Extensions ──────────────────────────────────────────────────────
    db.init_app(app)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    # Conditionally initialise Flask-Mail
    if app.config.get('MAIL_ENABLED', False):
        try:
            from flask_mail import Mail
            mail = Mail(app)
            app.logger.info('Flask-Mail initialised successfully.')
        except Exception as exc:  # pragma: no cover
            app.logger.warning('Flask-Mail could not be initialised: %s', exc)

    # ── Register blueprints (wrapped in try/except so the app can start
    #    even when route modules haven't been created yet) ───────────────
    _blueprint_imports = [
        ('app.routes.auth',      'auth_bp'),
        ('app.routes.whitelist',  'whitelist_bp'),
        ('app.routes.alerts',     'alerts_bp'),
        ('app.routes.scanner',    'scanner_bp'),
        ('app.routes.users',      'users_bp'),
        ('app.routes.dashboard',  'dashboard_bp'),
        ('app.routes.audit',      'audit_bp'),
    ]

    for module_path, bp_name in _blueprint_imports:
        try:
            import importlib
            module = importlib.import_module(module_path)
            blueprint = getattr(module, bp_name)
            
            # Combine the base /api prefix with the blueprint's defined url_prefix
            bp_prefix = getattr(blueprint, 'url_prefix', '')
            app.register_blueprint(blueprint, url_prefix=f'/api{bp_prefix}')
            app.logger.info(f'Registered blueprint: {bp_name} at /api{bp_prefix}')
        except (ImportError, AttributeError) as exc:
            app.logger.warning(
                'Could not register blueprint %s from %s: %s',
                bp_name, module_path, exc,
            )

    # ── Create database tables ──────────────────────────────────────────
    with app.app_context():
        from app import models  # noqa: F401 – ensure models are imported
        db.create_all()

    return app
