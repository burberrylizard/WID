"""
Database seeder for the WiFi Intrusion Detection System.

Resets the database and inserts only the default administrator account.
All security logs, whitelist, and detected AP tables will start empty.

Usage:
    python seed.py
"""

from datetime import datetime, timezone
from app import create_app, db
from app.models import User

def seed() -> None:
    """Drop, recreate, and populate only the default administrator account."""
    app = create_app()

    with app.app_context():
        # ── Reset database ──────────────────────────────────────────────
        print('[seed] Dropping all tables ...')
        db.drop_all()
        print('[seed] Creating all tables ...')
        db.create_all()

        # ────────────────────────────────────────────────────────────────
        # DEFAULT OPERATOR ACCOUNT
        # ────────────────────────────────────────────────────────────────
        print('[seed] Inserting default administrator account ...')
        admin_user = User(
            id=1,
            user_id='U-001',
            full_name='System Administrator',
            username='admin',
            email='admin@wids.local',
            role='admin',
            is_active=False,
            last_login=None,
            created_at=datetime.now(timezone.utc)
        )
        admin_user.set_password('admin') # Default password is 'admin'

        db.session.add(admin_user)
        db.session.commit()
        
        print('[seed] Users: 1 row inserted (username: admin / password: admin)')
        print('\n[seed] DB Seeding Completed successfully! (Database is clean)')

if __name__ == '__main__':
    seed()
