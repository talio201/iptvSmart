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

    # --- Category Methods ---
    def get_live_categories(self, connection_id):
        try:
            # Assuming 'categories' table has a 'type' column (e.g., 'live', 'vod', 'series')
            response = self.supabase.from_('categories').select('*').eq('connection_id', connection_id).eq('type', 'live').execute()
            if response.data:
                return {'success': True, 'categories': response.data}
            return {'success': True, 'categories': []}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_vod_categories(self, connection_id):
        try:
            response = self.supabase.from_('categories').select('*').eq('connection_id', connection_id).eq('type', 'vod').execute()
            if response.data:
                return {'success': True, 'categories': response.data}
            return {'success': True, 'categories': []}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_series_categories(self, connection_id):
        try:
            response = self.supabase.from_('categories').select('*').eq('connection_id', connection_id).eq('type', 'series').execute()
            if response.data:
                return {'success': True, 'categories': response.data}
            return {'success': True, 'categories': []}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # --- Stream Methods ---
    def get_live_streams(self, connection_id, category_id=None, page=1, page_size=50):
        try:
            query = self.supabase.from_('channels').select('*').eq('connection_id', connection_id)
            if category_id:
                query = query.eq('category_id', category_id)
            
            # Basic pagination
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)

            response = query.execute()
            if response.data:
                return {'success': True, 'streams': response.data}
            return {'success': True, 'streams': []}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_vod_streams(self, connection_id, category_id=None, page=1, page_size=50):
        try:
            query = self.supabase.from_('movies').select('*').eq('connection_id', connection_id)
            if category_id:
                query = query.eq('category_id', category_id)
            
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)

            response = query.execute()
            if response.data:
                return {'success': True, 'streams': response.data}
            return {'success': True, 'streams': []}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_series(self, connection_id, category_id=None, page=1, page_size=50):
        try:
            query = self.supabase.from_('series_list').select('*').eq('connection_id', connection_id)
            if category_id:
                query = query.eq('category_id', category_id)
            
            offset = (page - 1) * page_size
            query = query.range(offset, offset + page_size - 1)

            response = query.execute()
            if response.data:
                return {'success': True, 'streams': response.data}
            return {'success': True, 'streams': []}
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # --- Other Methods (Placeholders for now) ---
    def authenticate(self, server_url, username, password):
        # This method seems to be for authenticating with an external Xtream server.
        # Placeholder implementation.
        return {'success': False, 'error': 'Authentication with external Xtream server not implemented.'}

    def request_sync(self, connection_id):
        # Placeholder for manual sync trigger
        return {'success': False, 'error': 'Manual sync not implemented.'}

    def search_streams(self, connection_id, stream_type, query_text):
        # Placeholder for stream search
        return {'success': False, 'error': 'Stream search not implemented.'}

    def get_streams_by_ids(self, stream_ids):
        # Placeholder for getting stream details by IDs
        return {'success': False, 'error': 'Get streams by IDs not implemented.'}

    def clear_local_data(self, connection_id):
        # Placeholder for clearing local data
        return {'success': False, 'error': 'Clear local data not implemented.'}

    def get_stream_url(self, connection_id, stream_id, stream_type):
        # Placeholder for generating stream URL
        return {'success': False, 'error': 'Get stream URL not implemented.'}

    def get_series_info(self, connection_id, series_id):
        # Placeholder for getting series info
        return {'success': False, 'error': 'Get series info not implemented.'}

    def get_all_streams_by_category(self, connection_id, stream_type):
        # Placeholder for getting all streams by category
        return {'success': False, 'error': 'Get all streams by category not implemented.'}

    # get_dashboard_stats is an RPC call, not a direct method in XtreamService
    # It's called via supabase.rpc in the route.

    def get_user_preferences(self, user_id):
        # Placeholder for user preferences
        return {'success': False, 'error': 'Get user preferences not implemented.'}

    def update_user_preferences(self, user_id, data):
        # Placeholder for user preferences
        return {'success': False, 'error': 'Update user preferences not implemented.'}