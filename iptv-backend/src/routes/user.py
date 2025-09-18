from flask import Blueprint, jsonify, request
from flask_cors import CORS
from src.services.xtream_service import XtreamService
from flask import current_app

user_bp = Blueprint('user', __name__)
CORS(user_bp)

def get_xtream_service():
    app = current_app._get_current_object()
    return XtreamService(app)

@user_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    username = data.get('username')
    email = data.get('email')
    password = data.get('password')

    if not all([username, email, password]):
        return jsonify({'success': False, 'error': 'Username, email, and password are required'}), 400

    result = get_xtream_service().register_user(username, email, password)

    if result['success']:
        return jsonify(result), 201
    else:
        return jsonify(result), 400

@user_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    if not all([username, password]):
        return jsonify({'success': False, 'error': 'Username and password are required'}), 400

    result = get_xtream_service().login(username, password)

    if result['success']:
        return jsonify(result), 200
    else:
        return jsonify(result), 401
