import requests
import logging
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

    def _get_xtream_connection_details(self, connection_id):
        try:
            response = self.supabase.from_('xtream_connections').select('server_url, username, password').eq('id', connection_id).single().execute()
            if response.data:
                return response.data
            return None
        except Exception as e:
            print(f"Error fetching Xtream connection details: {e}")
            return None

    def _make_xtream_request(self, connection_id, action, params=None):
        conn_details = self._get_xtream_connection_details(connection_id)
        if not conn_details:
            logging.error(f"Xtream connection details not found for connection_id: {connection_id}")
            return {'success': False, 'error': 'Xtream connection details not found.'}

        base_url = conn_details['server_url'].rstrip('/')
        username = conn_details['username']
        password = conn_details['password']

        # Ensure the base URL ends with player_api.php
        if not base_url.endswith('/player_api.php'):
            base_url = f"{base_url}/player_api.php"

        url_params = {
            'username': username,
            'password': password,
            'action': action,
        }
        if params:
            url_params.update(params)

        try:
            logging.warning(f"Making Xtream API request to {base_url} for action: {action}") # Changed to WARNING
            headers = {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            }
            response = requests.get(base_url, params=url_params, headers=headers, timeout=10)
            response.raise_for_status() # Raise HTTPError for bad responses (4xx or 5xx)
            
            # Check for empty or non-JSON response
            if not response.text:
                logging.warning(f"Xtream API returned empty response for action: {action}")
                return {'success': True, 'data': []} # Return success with empty data

            # Try to parse JSON, handle potential errors
            try:
                data = response.json()
            except json.JSONDecodeError:
                logging.error(f"Failed to decode JSON from Xtream API for action: {action}. Response text: {response.text}")
                return {'success': False, 'error': 'Failed to decode JSON from Xtream API.'}

            logging.warning(f"Successfully received data from Xtream API for action: {action}. Data: {data}") # Changed to WARNING
            return {'success': True, 'data': data}
        except requests.exceptions.Timeout:
            logging.error(f"Xtream API request timed out for action: {action} at URL: {base_url}")
            return {'success': False, 'error': f'Xtream API request timed out for action: {action}'}
        except requests.exceptions.RequestException as e:
            logging.error(f"Xtream API request failed for {action}: {e}")
            return {'success': False, 'error': f'Xtream API request failed: {e}'}

    # --- Category Methods ---
    def get_live_categories(self, connection_id):
        try:
            result = self._make_xtream_request(connection_id, 'get_live_categories')
            if result['success']:
                return {'success': True, 'categories': result['data']}
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_vod_categories(self, connection_id):
        try:
            result = self._make_xtream_request(connection_id, 'get_vod_categories')
            if result['success']:
                return {'success': True, 'categories': result['data']}
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_series_categories(self, connection_id):
        try:
            result = self._make_xtream_request(connection_id, 'get_series_categories')
            if result['success']:
                return {'success': True, 'categories': result['data']}
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # --- Stream Methods ---
    def get_live_streams(self, connection_id, category_id=None, page=1, page_size=50):
        try:
            params = {'category_id': category_id} if category_id else {}
            result = self._make_xtream_request(connection_id, 'get_live_streams', params)
            if result['success']:
                # Xtream API usually doesn't have pagination for get_live_streams directly
                # We'll simulate it here if needed, or return all
                streams = result['data']
                # Apply manual pagination if Xtream API doesn't support it
                start_index = (page - 1) * page_size
                end_index = start_index + page_size
                paginated_streams = streams[start_index:end_index]
                return {'success': True, 'streams': paginated_streams, 'pagination': {'has_more': end_index < len(streams)}}
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_vod_streams(self, connection_id, category_id=None, page=1, page_size=50):
        try:
            params = {'category_id': category_id} if category_id else {}
            result = self._make_xtream_request(connection_id, 'get_vod_streams', params)
            if result['success']:
                streams = result['data']
                start_index = (page - 1) * page_size
                end_index = start_index + page_size
                paginated_streams = streams[start_index:end_index]
                return {'success': True, 'streams': paginated_streams, 'pagination': {'has_more': end_index < len(streams)}}
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}

    def get_series(self, connection_id, category_id=None, page=1, page_size=50):
        try:
            params = {'category_id': category_id} if category_id else {}
            result = self._make_xtream_request(connection_id, 'get_series', params)
            if result['success']:
                streams = result['data']
                start_index = (page - 1) * page_size
                end_index = start_index + page_size
                paginated_streams = streams[start_index:end_index]
                return {'success': True, 'streams': paginated_streams, 'pagination': {'has_more': end_index < len(streams)}}
            return result
        except Exception as e:
            return {'success': False, 'error': str(e)}

    # --- Other Methods (Placeholders for now) ---
    def authenticate(self, server_url, username, password):
        # This method will now make the initial Xtream API call to get user and server info.
        # It will return user_info and server_info directly from Xtream API.
        base_url = server_url.rstrip('/')
        if not base_url.endswith('/player_api.php'):
            base_url = f"{base_url}/player_api.php"

        url_params = {
            'username': username,
            'password': password,
        }

        try:
            response = requests.get(base_url, params=url_params, timeout=10)
            response.raise_for_status()
            data = response.json()
            if data.get('user_info') and data.get('server_info'):
                return {'success': True, 'user_info': data['user_info'], 'server_info': data['server_info']}
            return {'success': False, 'error': data.get('user_info', {}).get('auth', 'Authentication failed.')}
        except requests.exceptions.RequestException as e:
            return {'success': False, 'error': f'Xtream API authentication failed: {e}'}

    def request_sync(self, connection_id):
        # This method is now largely symbolic as data is fetched directly.
        # Could be used to trigger a re-fetch and update of cached info if needed.
        return {'success': True, 'message': 'Data is fetched directly from Xtream API.'}

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
        """Builds the final, playable stream URL."""
        try:
            conn_details = self._get_xtream_connection_details(connection_id)
            if not conn_details:
                return {'success': False, 'error': 'Xtream connection details not found.'}

            server_url = conn_details['server_url'].rstrip('/')
            username = conn_details['username']
            password = conn_details['password']
            
            # The stream_type should be 'movie' for VOD content as per Xtream standards.
            type_for_url = 'movie' if stream_type == 'vod' else stream_type

            # Format: http://<server_url>/<type>/<username>/<password>/<stream_id>
            # The player component will add the appropriate extension (e.g., .m3u8)
            stream_url = f"{server_url}/{type_for_url}/{username}/{password}/{stream_id}"

            return {'success': True, 'url': stream_url}
        except Exception as e:
            logging.error(f"Error generating stream URL for connection {connection_id}, stream {stream_id}: {e}")
            return {'success': False, 'error': 'Failed to generate stream URL.'}

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