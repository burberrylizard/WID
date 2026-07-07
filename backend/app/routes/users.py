"""User management routes for the WIDS backend."""

from flask import Blueprint, request, jsonify
from app import db
from app.models import User

users_bp = Blueprint('users', __name__, url_prefix='/users')


@users_bp.route('/', methods=['GET'])
def get_users():
    """Return all users as a JSON list."""
    try:
        users = User.query.all()
        return jsonify([user.to_dict() for user in users]), 200

    except Exception as e:
        return jsonify({'error': f'Failed to fetch users: {str(e)}'}), 500


@users_bp.route('/', methods=['POST'])
def create_user():
    """Create a new user.

    Body: {fullName, username, email, role, password}
    Generates a sequential user_id in the format 'U-NNN'.
    """
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        full_name = data.get('fullName')
        username = data.get('username')
        email = data.get('email')
        role = data.get('role', 'analyst')
        password = data.get('password')

        if not username or not password:
            return jsonify({'error': 'Username and password are required'}), 400

        # Check username uniqueness
        existing = User.query.filter_by(username=username).first()
        if existing:
            return jsonify({'error': 'Username already exists'}), 400

        # Generate sequential user_id as 'U-NNN'
        last_user = User.query.order_by(User.id.desc()).first()
        next_num = (last_user.id + 1) if last_user else 1
        user_id = f'U-{next_num:03d}'

        new_user = User(
            user_id=user_id,
            username=username,
            full_name=full_name,
            email=email,
            role=role
        )
        new_user.set_password(password)

        db.session.add(new_user)
        db.session.commit()

        from app.services.audit_logger import log_activity
        log_activity('USER_CREATE', target=user_id, details=f"Registered new operator: '{username}' ({role})")

        return jsonify({
            'success': True,
            'user': new_user.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to create user: {str(e)}'}), 500


@users_bp.route('/<int:id>', methods=['PUT'])
def update_user(id):
    """Update an existing user.

    Body: {fullName, email, role}
    """
    try:
        user = User.query.get(id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        data = request.get_json()
        if not data:
            return jsonify({'error': 'Request body is required'}), 400

        if 'fullName' in data:
            user.full_name = data['fullName']
        if 'email' in data:
            user.email = data['email']
        if 'role' in data:
            user.role = data['role']

        db.session.commit()

        from app.services.audit_logger import log_activity
        log_activity('USER_UPDATE', target=user.user_id, details=f"Updated profile for user '{user.username}': role='{user.role}'")

        return jsonify({
            'success': True,
            'user': user.to_dict()
        }), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to update user: {str(e)}'}), 500


@users_bp.route('/<int:id>', methods=['DELETE'])
def delete_user(id):
    """Delete a user. Cannot delete the primary admin (id=1)."""
    try:
        if id == 1:
            return jsonify({'error': 'Cannot delete the primary admin user'}), 400

        user = User.query.get(id)
        if not user:
            return jsonify({'error': 'User not found'}), 404

        user_deleted_id = user.user_id
        user_deleted_name = user.username
        user_deleted_role = user.role

        db.session.delete(user)
        db.session.commit()

        from app.services.audit_logger import log_activity
        log_activity('USER_DELETE', target=user_deleted_id, details=f"Deleted user '{user_deleted_name}' ({user_deleted_role})")

        return jsonify({'success': True}), 200

    except Exception as e:
        db.session.rollback()
        return jsonify({'error': f'Failed to delete user: {str(e)}'}), 500
