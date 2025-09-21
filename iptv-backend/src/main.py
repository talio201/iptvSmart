import os
from flask import Flask, jsonify
from flask_cors import CORS
from src.routes.iptv import iptv_bp
from src.routes.user import user_bp

app = Flask(__name__)

# Apply CORS to the app
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Register blueprints
app.register_blueprint(iptv_bp, url_prefix='/api/iptv')
app.register_blueprint(user_bp, url_prefix='/api/user')

@app.route('/')
def index():
    return jsonify({'message': 'IPTV Backend is running'})