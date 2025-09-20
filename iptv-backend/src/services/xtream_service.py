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
        """Fetches live categories from Supabase."""
        try:
            response = self.supabase.from_('live_categories').select('*').eq('connection_id', connection_id).execute()
            if response.data:
                return {'success': True, 'categories': response.data}
            return {'success': True, 'categories': []}
        except Exception as e:
            logging.error(f"Error fetching live categories from Supabase for connection {connection_id}: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    def get_vod_categories(self, connection_id):
        """Fetches VOD categories from Supabase."""
        try:
            response = self.supabase.from_('vod_categories').select('*').eq('connection_id', connection_id).execute()
            if response.data:
                return {'success': True, 'categories': response.data}
            return {'success': True, 'categories': []}
        except Exception as e:
            logging.error(f"Error fetching VOD categories from Supabase for connection {connection_id}: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    def get_series_categories(self, connection_id):
        """Fetches series categories from Supabase."""
        try:
            response = self.supabase.from_('series_categories').select('*').eq('connection_id', connection_id).execute()
            if response.data:
                return {'success': True, 'categories': response.data}
            return {'success': True, 'categories': []}
        except Exception as e:
            logging.error(f"Error fetching series categories from Supabase for connection {connection_id}: {e}", exc_info=True)
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

    def sync_live_data(self, connection_id):
        """
        Synchronizes live channels and categories from Xtream API to Supabase.
        """
        logging.warning(f"Starting live data sync for connection_id: {connection_id}")
        try:
            self.supabase.from_('live_streams').delete().eq('connection_id', connection_id).execute()
            self.supabase.from_('live_categories').delete().eq('connection_id', connection_id).execute()
            logging.warning(f"Sync {connection_id}: Old live data deleted.")

            live_cats_res = self.get_live_categories(connection_id)
            live_streams_res = self.get_live_streams(connection_id)
            logging.warning(f"Sync {connection_id}: New live data fetched.")

            if live_cats_res.get('success') and live_cats_res.get('categories'):
                categories_to_insert = []
                for item in live_cats_res['categories']:
                    categories_to_insert.append({
                        'connection_id': connection_id,
                        'category_id': item.get('category_id'),
                        'category_name': item.get('category_name'),
                        'parent_id': item.get('parent_id')
                    })
                if categories_to_insert:
                    self.supabase.from_('live_categories').insert(categories_to_insert).execute()
                    logging.warning(f"Inserted {len(categories_to_insert)} live categories.")
                else:
                    logging.warning("No live categories to insert.")
            else:
                logging.error(f"Failed to fetch live categories: {live_cats_res.get('error', 'Unknown error')}")

            if live_streams_res.get('success') and live_streams_res.get('streams'):
                streams_to_insert = []
                for s in live_streams_res['streams']:
                    streams_to_insert.append({
                        'connection_id': connection_id,
                        'stream_id': s.get('stream_id'),
                        'name': s.get('name'),
                        'stream_icon': s.get('stream_icon'),
                        'category_id': s.get('category_id'),
                        'epg_channel_id': s.get('epg_channel_id'),
                        'added': s.get('added'),
                        'is_adult': s.get('is_adult', '0')
                    })
                if streams_to_insert:
                    self.supabase.from_('live_streams').insert(streams_to_insert).execute()
                    logging.warning(f"Inserted {len(streams_to_insert)} live streams.")
                else:
                    logging.warning("No live streams to insert.")
            else:
                logging.error(f"Failed to fetch live streams: {live_streams_res.get('error', 'Unknown error')}")
            
            logging.warning(f"Live data sync for connection {connection_id} completed.")
            return {'success': True, 'message': 'Live data sync completed.'}
        except Exception as e:
            logging.error(f"Error during live data sync for connection {connection_id}: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    def sync_vod_data(self, connection_id):
        """
        Synchronizes VOD (movies) and categories from Xtream API to Supabase.
        """
        logging.warning(f"Starting VOD data sync for connection_id: {connection_id}")
        try:
            self.supabase.from_('vod_streams').delete().eq('connection_id', connection_id).execute()
            self.supabase.from_('vod_categories').delete().eq('connection_id', connection_id).execute()
            logging.warning(f"Sync {connection_id}: Old VOD data deleted.")

            vod_cats_res = self.get_vod_categories(connection_id)
            vod_streams_res = self.get_vod_streams(connection_id)
            logging.warning(f"Sync {connection_id}: New VOD data fetched.")

            if vod_cats_res.get('success') and vod_cats_res.get('categories'):
                categories_to_insert = []
                for item in vod_cats_res['data']:
                    categories_to_insert.append({
                        'connection_id': connection_id,
                        'category_id': item.get('category_id'),
                        'category_name': item.get('category_name'),
                        'parent_id': item.get('parent_id')
                    })
                if categories_to_insert:
                    self.supabase.from_('vod_categories').insert(categories_to_insert).execute()
                    logging.warning(f"Inserted {len(categories_to_insert)} VOD categories.")
                else:
                    logging.warning("No VOD categories to insert.")
            else:
                logging.error(f"Failed to fetch VOD categories: {vod_cats_res.get('error', 'Unknown error')}")

            if vod_streams_res.get('success') and vod_streams_res.get('streams'):
                streams_to_insert = []
                for s in vod_streams_res['data']:
                    streams_to_insert.append({
                        'connection_id': connection_id,
                        'stream_id': s.get('stream_id'),
                        'name': s.get('name'),
                        'stream_icon': s.get('stream_icon'),
                        'category_id': s.get('category_id'),
                        'rating': s.get('rating'),
                        'added': s.get('added')
                    })
                if streams_to_insert:
                    self.supabase.from_('vod_streams').insert(streams_to_insert).execute()
                    logging.warning(f"Inserted {len(streams_to_insert)} VOD streams.")
                else:
                    logging.warning("No VOD streams to insert.")
            else:
                logging.error(f"Failed to fetch VOD streams: {vod_streams_res.get('error', 'Unknown error')}")

            logging.warning(f"VOD data sync for connection {connection_id} completed.")
            return {'success': True, 'message': 'VOD data sync completed.'}
        except Exception as e:
            logging.error(f"Error during VOD data sync for connection {connection_id}: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

    def sync_series_data(self, connection_id):
        """
        Synchronizes series and categories from Xtream API to Supabase.
        """
        logging.warning(f"Starting series data sync for connection_id: {connection_id}")
        try:
            self.supabase.from_('series').delete().eq('connection_id', connection_id).execute()
            self.supabase.from_('series_categories').delete().eq('connection_id', connection_id).execute()
            logging.warning(f"Sync {connection_id}: Old series data deleted.")

            series_cats_res = self.get_series_categories(connection_id)
            series_res = self.get_series(connection_id)
            logging.warning(f"Sync {connection_id}: New series data fetched.")

            if series_cats_res.get('success') and series_cats_res.get('categories'):
                categories_to_insert = []
                for item in series_cats_res['data']:
                    categories_to_insert.append({
                        'connection_id': connection_id,
                        'category_id': item.get('category_id'),
                        'category_name': item.get('category_name'),
                        'parent_id': item.get('parent_id')
                    })
                if categories_to_insert:
                    self.supabase.from_('series_categories').insert(categories_to_insert).execute()
                    logging.warning(f"Inserted {len(categories_to_insert)} series categories.")
                else:
                    logging.warning("No series categories to insert.")
            else:
                logging.error(f"Failed to fetch series categories: {series_cats_res.get('error', 'Unknown error')}")

            if series_res.get('success') and series_res.get('streams'):
                series_to_insert = []
                for s in series_res['data']:
                    series_to_insert.append({
                        'connection_id': connection_id,
                        'series_id': s.get('series_id'),
                        'name': s.get('name'),
                        'cover': s.get('cover'),
                        'plot': s.get('plot'),
                        'cast': s.get('cast'),
                        'director': s.get('director'),
                        'genre': s.get('genre'),
                        'release_date': s.get('releaseDate'),
                        'last_modified': s.get('last_modified'),
                        'rating': s.get('rating'),
                        'category_id': s.get('category_id')
                    })
                if series_to_insert:
                    self.supabase.from_('series').insert(series_to_insert).execute()
                    logging.warning(f"Inserted {len(series_to_insert)} series.")
                else:
                    logging.warning("No series to insert.")
            else:
                logging.error(f"Failed to fetch series: {series_res.get('error', 'Unknown error')}")

            logging.warning(f"Series data sync for connection {connection_id} completed.")
            return {'success': True, 'message': 'Series data sync completed.'}
        except Exception as e:
            logging.error(f"Error during series data sync for connection {connection_id}: {e}", exc_info=True)
            return {'success': False, 'error': str(e)}

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