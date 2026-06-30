"""Authentication routes for the WIDS backend."""

from datetime import datetime, timezone
from flask import Blueprint, request, jsonify
from app import db
from app.models import User

auth_bp = Blueprint('auth', __name__, url_prefix='/auth')


@auth_bp.route('/login', methods=['POST'])
def login():
    """Authenticate a user with username and password.

    Body: {username, password}
    Returns user dict and a mock JWT token on success.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        username = data.get('username')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        user = User.query.filter_by(username=username).first()

        if not user or not user.check_password(password):
            return jsonify({'error': 'Invalid username or password'}), 401

        # Update user status
        user.is_active = True
        user.last_login = datetime.now(timezone.utc)
        db.session.commit()

        timestamp = int(datetime.now(timezone.utc).timestamp())

        return jsonify({
            'success': True,
            'user': user.to_dict(),
            'token': f'jwt-token-{timestamp}'
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Login failed: {str(e)}'}), 500


@auth_bp.route('/logout', methods=['POST'])
def logout():
    """Log out a user.

    Body (optional): {user_id}
    Sets the user's is_active to False if user_id is provided.
    """
    try:
        data = request.get_json(silent=True)

        if data and data.get('user_id'):
            user = User.query.filter_by(user_id=data['user_id']).first()
            if user:
                user.is_active = False
                db.session.commit()

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Logout failed: {str(e)}'}), 500


@auth_bp.route('/profile', methods=['GET'])
def profile():
    """Return a mock profile or the first admin user."""
    try:
        user = User.query.filter_by(role='admin').first()

        if user:
            return jsonify({
                'success': True,
                'user': user.to_dict()
            }), 200

        # Return a mock profile if no admin exists
        return jsonify({
            'success': True,
            'user': {
                'id': 1,
                'user_id': 'U-001',
                'username': 'admin',
                'full_name': 'System Administrator',
                'email': 'admin@wids.local',
                'role': 'admin',
                'is_active': True,
                'last_login': None,
                'created_at': datetime.now(timezone.utc).isoformat()
            }
        }), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch profile: {str(e)}'}), 500
