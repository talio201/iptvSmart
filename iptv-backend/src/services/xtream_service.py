import requests
import json
import os
import time
from datetime import datetime
from supabase import create_client, Client
from werkzeug.security import generate_password_hash, check_password_hash

class XtreamService:
    def __init__(self, app):
        self.app = app
        self.supabase_url: str = os.environ.get("SUPABASE_URL")
        self.supabase_key: str = os.environ.get("SUPABASE_KEY")
        self.supabase: Client = create_client(self.supabase_url, self.supabase_key)

    def get_connections(self):
        try:
            response = self.supabase.from_('xtream_connections').select('*').execute()
            if response.data:
                return {'success': True, 'connections': response.data}
            return {'success': True, 'connections': []}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def register_user(self, username, email, password):
        try:
            existing_user = self.supabase.from_('user').select('id').eq('username', username).execute()
            if existing_user.data:
                return {'success': False, 'error': 'Username already exists'}

            hashed_password = generate_password_hash(password)

            response = self.supabase.from_('user').insert({
                'username': username,
                'email': email,
                'password': hashed_password
            }).execute()

            if response.data:
                return {'success': True, 'user': response.data[0]}
            else:
                return {'success': False, 'error': 'Failed to register user'}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def login(self, username, password):
        try:
            response = self.supabase.from_('user').select('*').eq('username', username).single().execute()

            if not response.data:
                return {'success': False, 'error': 'Invalid username or password'}

            user = response.data
            if not user.get('password'):
                return {'success': False, 'error': 'Password not set for this user'}

            if check_password_hash(user['password'], password):
                del user['password']
                return {'success': True, 'user': user}
            else:
                return {'success': False, 'error': 'Invalid username or password'}
        except Exception as e:
            return {'success': False, 'error': str(e)}
