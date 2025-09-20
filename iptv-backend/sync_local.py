import os
import sys
import requests
import logging
from supabase import create_client, Client

# Configure basic logging to see output in terminal
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')

# --- USER CONFIGURATION ---
# Replace with your actual Xtream connection details
XTREAM_SERVER_URL = "https://t3s7a.lat" # e.g., "http://yourdomain.com:8000"
XTREAM_USERNAME = "ligcel.tarcisiocarvalho@gmail.com"
XTREAM_PASSWORD = "eu10fiz15"

# Replace with your actual Supabase credentials
SUPABASE_URL = "https://qhszrotxfpzmbdglwxby.supabase.co" # e.g., "https://abcdefg.supabase.co"
SUPABASE_KEY ="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFoc3pyb3R4ZnB6bWJkZ2x3eGJ5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc0Njc5MzksImV4cCI6MjA3MzA0MzkzOX0.wZr_3oiKeKLR9-oDFgTABXHYW9qy22gB6pChsP-MF-M"

# The connection_id for which you want to sync data
CONNECTION_ID_TO_SYNC = 1 # Replace with the actual connection_id from your xtream_connections table
# --- END USER CONFIGURATION ---

# Initialize Supabase client
try:
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    logging.info("Supabase client initialized.")
except Exception as e:
    logging.error(f"Failed to initialize Supabase client: {e}")
    sys.exit(1)

# --- Helper functions (simplified from xtream_service.py) ---
def _make_xtream_request_local(action, params=None):
    base_url = XTREAM_SERVER_URL.rstrip('/')
    if not base_url.endswith('/player_api.php'):
        base_url = f"{base_url}/player_api.php"

    url_params = {
        'username': XTREAM_USERNAME,
        'password': XTREAM_PASSWORD,
        'action': action,
    }
    if params:
        url_params.update(params)

    try:
        logging.info(f"Making Xtream API request to {base_url} for action: {action}")
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
        response = requests.get(base_url, params=url_params, headers=headers, timeout=10)
        response.raise_for_status()
        
        if not response.text:
            logging.warning(f"Xtream API returned empty response for action: {action}")
            return {'success': True, 'data': []}

        try:
            data = response.json()
        except json.JSONDecodeError:
            logging.error(f"Failed to decode JSON from Xtream API for action: {action}. Response text: {response.text}")
            return {'success': False, 'error': 'Failed to decode JSON from Xtream API.'}

        logging.info(f"Successfully received data from Xtream API for action: {action}. Data type: {type(data)}")
        return {'success': True, 'data': data}
    except requests.exceptions.Timeout:
        logging.error(f"Xtream API request timed out for action: {action} at URL: {base_url}")
        return {'success': False, 'error': f'Xtream API request timed out for action: {action}'}
    except requests.exceptions.RequestException as e:
        logging.error(f"Xtream API request failed for {action}: {e}")
        return {'success': False, 'error': f'Xtream API request failed: {e}'}

def get_live_categories_local():
    return _make_xtream_request_local('get_live_categories')

def get_live_streams_local():
    return _make_xtream_request_local('get_live_streams')

def get_vod_categories_local():
    return _make_xtream_request_local('get_vod_categories')

def get_vod_streams_local():
    return _make_xtream_request_local('get_vod_streams')

def get_series_categories_local():
    return _make_xtream_request_local('get_series_categories')

def get_series_streams_local():
    return _make_xtream_request_local('get_series')

# --- Main Sync Logic (simplified from run_full_sync) ---
def sync_live_data_local():
    logging.info(f"Starting local sync for connection_id: {CONNECTION_ID_TO_SYNC}")
    try:
        # Step 1: Clear old data for this connection
        logging.info(f"Deleting old live data for connection {CONNECTION_ID_TO_SYNC}...")
        supabase.from_('live_streams').delete().eq('connection_id', CONNECTION_ID_TO_SYNC).execute()
        supabase.from_('live_categories').delete().eq('connection_id', CONNECTION_ID_TO_SYNC).execute()
        logging.info(f"Old live data deleted.")

        # Step 2: Fetch new data from Xtream API
        logging.info(f"Fetching new live data from Xtream API...")
        live_cats_res = get_live_categories_local()
        live_streams_res = get_live_streams_local()
        logging.info(f"New live data fetched.")

        # Step 3: Insert new data into Supabase
        logging.info(f"Inserting new live data into Supabase...")
        
        # Insert Categories
        if live_cats_res.get('success') and live_cats_res.get('data'):
            categories_to_insert = []
            for item in live_cats_res['data']:
                categories_to_insert.append({
                    'connection_id': CONNECTION_ID_TO_SYNC,
                    'category_id': item.get('category_id'),
                    'category_name': item.get('category_name'),
                    'parent_id': item.get('parent_id')
                })
            if categories_to_insert:
                supabase.from_('live_categories').insert(categories_to_insert).execute()
                logging.info(f"Inserted {len(categories_to_insert)} live categories.")
            else:
                logging.info("No live categories to insert.")
        else:
            logging.error(f"Failed to fetch live categories: {live_cats_res.get('error', 'Unknown error')}")

        # Insert Streams
        if live_streams_res.get('success') and live_streams_res.get('data'):
            streams_to_insert = []
            for s in live_streams_res['data']:
                streams_to_insert.append({
                    'connection_id': CONNECTION_ID_TO_SYNC,
                    'stream_id': s.get('stream_id'),
                    'name': s.get('name'),
                    'stream_icon': s.get('stream_icon'),
                    'category_id': s.get('category_id'),
                    'epg_channel_id': s.get('epg_channel_id'),
                    'added': s.get('added'),
                    'is_adult': s.get('is_adult', '0')
                })
            if streams_to_insert:
                supabase.from_('live_streams').insert(streams_to_insert).execute()
                logging.info(f"Inserted {len(streams_to_insert)} live streams.")
            else:
                logging.info("No live streams to insert.")
        else:
            logging.error(f"Failed to fetch live streams: {live_streams_res.get('error', 'Unknown error')}")

        logging.info(f"Local sync for connection {CONNECTION_ID_TO_SYNC} completed.")
        return {'success': True, 'message': 'Local sync completed.'}

    except Exception as e:
        logging.error(f"Error during local sync for connection {CONNECTION_ID_TO_SYNC}: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}

def sync_vod_data_local():
    logging.info(f"Starting local sync for VOD data for connection_id: {CONNECTION_ID_TO_SYNC}")
    try:
        # Step 1: Clear old data for this connection
        logging.info(f"Deleting old VOD data for connection {CONNECTION_ID_TO_SYNC}...")
        supabase.from_('vod_streams').delete().eq('connection_id', CONNECTION_ID_TO_SYNC).execute()
        supabase.from_('vod_categories').delete().eq('connection_id', CONNECTION_ID_TO_SYNC).execute()
        logging.info(f"Old VOD data deleted.")

        # Step 2: Fetch new data from Xtream API
        logging.info(f"Fetching new VOD data from Xtream API...")
        vod_cats_res = get_vod_categories_local()
        vod_streams_res = get_vod_streams_local()
        logging.info(f"New VOD data fetched.")

        # Step 3: Insert new data into Supabase
        logging.info(f"Inserting new VOD data into Supabase...")
        
        # Insert Categories
        if vod_cats_res.get('success') and vod_cats_res.get('data'):
            categories_to_insert = []
            for item in vod_cats_res['data']:
                # Ensure category_type is set correctly for VOD
                categories_to_insert.append({
                    'connection_id': CONNECTION_ID_TO_SYNC,
                    'category_id': item.get('category_id'),
                    'category_name': item.get('category_name'),
                    'category_type': 'vod', # Explicitly set category type
                    'parent_id': item.get('parent_id')
                })
            if categories_to_insert:
                supabase.from_('vod_categories').insert(categories_to_insert).execute()
                logging.info(f"Inserted {len(categories_to_insert)} VOD categories.")
            else:
                logging.info("No VOD categories to insert.")
        else:
            logging.error(f"Failed to fetch VOD categories: {vod_cats_res.get('error', 'Unknown error')}")

        # Insert Streams
        if vod_streams_res.get('success') and vod_streams_res.get('data'):
            streams_to_insert = []
            for s in vod_streams_res['data']:
                # Ensure stream_type is set correctly for VOD
                streams_to_insert.append({
                    'connection_id': CONNECTION_ID_TO_SYNC,
                    'stream_id': s.get('stream_id'),
                    'name': s.get('name'),
                    'stream_icon': s.get('stream_icon'),
                    'category_id': s.get('category_id'),
                    'added': s.get('added'),
                    'container_extension': s.get('container_extension'),
                    'custom_sid': s.get('custom_sid'),
                    'direct_source': s.get('direct_source'),
                    'num': s.get('num'),
                    'rating': s.get('rating'),
                    'rating_5based': s.get('rating_5based'),
                    'stream_type': 'movie', # Explicitly set stream type
                    'year': s.get('year')
                })
            if streams_to_insert:
                supabase.from_('vod_streams').insert(streams_to_insert).execute()
                logging.info(f"Inserted {len(streams_to_insert)} VOD streams.")
            else:
                logging.info("No VOD streams to insert.")
        else:
            logging.error(f"Failed to fetch VOD streams: {vod_streams_res.get('error', 'Unknown error')}")

        logging.info(f"Local VOD sync for connection {CONNECTION_ID_TO_SYNC} completed.")
        return {'success': True, 'message': 'Local VOD sync completed.'}

    except Exception as e:
        logging.error(f"Error during local VOD sync for connection {CONNECTION_ID_TO_SYNC}: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}

def sync_series_data_local():
    logging.info(f"Starting local sync for Series data for connection_id: {CONNECTION_ID_TO_SYNC}")
    try:
        # Step 1: Clear old data for this connection
        logging.info(f"Deleting old Series data for connection {CONNECTION_ID_TO_SYNC}...")
        supabase.from_('series').delete().eq('connection_id', CONNECTION_ID_TO_SYNC).execute()
        supabase.from_('series_categories').delete().eq('connection_id', CONNECTION_ID_TO_SYNC).execute()
        logging.info(f"Old Series data deleted.")

        # Step 2: Fetch new data from Xtream API
        logging.info(f"Fetching new Series data from Xtream API...")
        series_cats_res = get_series_categories_local()
        series_streams_res = get_series_streams_local()
        logging.info(f"New Series data fetched.")

        # Step 3: Insert new data into Supabase
        logging.info(f"Inserting new Series data into Supabase...")
        
        # Insert Categories
        if series_cats_res.get('success') and series_cats_res.get('data'):
            categories_to_insert = []
            for item in series_cats_res['data']:
                # Ensure category_type is set correctly for Series
                categories_to_insert.append({
                    'connection_id': CONNECTION_ID_TO_SYNC,
                    'category_id': item.get('category_id'),
                    'category_name': item.get('category_name'),
                    'category_type': 'series', # Explicitly set category type
                    'parent_id': item.get('parent_id')
                })
            if categories_to_insert:
                supabase.from_('series_categories').insert(categories_to_insert).execute()
                logging.info(f"Inserted {len(categories_to_insert)} Series categories.")
            else:
                logging.info("No Series categories to insert.")
        else:
            logging.error(f"Failed to fetch Series categories: {series_cats_res.get('error', 'Unknown error')}")

        # Insert Series (Streams)
        if series_streams_res.get('success') and series_streams_res.get('data'):
            streams_to_insert = []
            series_data = series_streams_res['data']
            if isinstance(series_data, dict):
                # If data is a dictionary, iterate over its values
                for s in series_data.values():
                    streams_to_insert.append({
                        'connection_id': CONNECTION_ID_TO_SYNC,
                        'series_id': s.get('series_id'),
                        'name': s.get('name'),
                        'cover': s.get('cover'),
                        'plot': s.get('plot'),
                        'cast': s.get('cast'),
                        'director': s.get('director'),
                        'genre': s.get('genre'),
                        'release_date': s.get('release_date'), # Corrected field name
                        'last_modified': s.get('last_modified'),
                        'rating': s.get('rating'),
                        'rating_5based': s.get('rating_5based'),
                        'backdrop_path': ', '.join(filter(None, s.get('backdrop_path'))) if isinstance(s.get('backdrop_path'), list) and s.get('backdrop_path') else s.get('backdrop_path'), # Handle list to string conversion and None/empty list
                        'youtube_trailer': s.get('youtube_trailer'),
                        'episode_run_time': s.get('episode_run_time'),
                        'category_id': s.get('category_id'),
                        'num': s.get('num'),
                        'title': s.get('title'),
                        'year': s.get('year'),
                        'type': s.get('stream_type') # Use stream_type from API
                    })
            elif isinstance(series_data, list):
                # If data is already a list, iterate directly
                for s in series_data:
                    streams_to_insert.append({
                        'connection_id': CONNECTION_ID_TO_SYNC,
                        'series_id': s.get('series_id'),
                        'name': s.get('name'),
                        'cover': s.get('cover'),
                        'plot': s.get('plot'),
                        'cast': s.get('cast'),
                        'director': s.get('director'),
                        'genre': s.get('genre'),
                        'release_date': s.get('release_date'), # Corrected field name
                        'last_modified': s.get('last_modified'),
                        'rating': s.get('rating'),
                        'rating_5based': s.get('rating_5based'),
                        'backdrop_path': ', '.join(filter(None, s.get('backdrop_path'))) if isinstance(s.get('backdrop_path'), list) and s.get('backdrop_path') else s.get('backdrop_path'), # Handle list to string conversion and None/empty list
                        'youtube_trailer': s.get('youtube_trailer'),
                        'episode_run_time': s.get('episode_run_time'),
                        'category_id': s.get('category_id'),
                        'num': s.get('num'),
                        'title': s.get('title'),
                        'year': s.get('year'),
                        'type': s.get('stream_type') # Use stream_type from API
                    })
            else:
                logging.error(f"Unexpected data format for series streams: {type(series_data)}")

            if streams_to_insert:
                supabase.from_('series').insert(streams_to_insert).execute()
                logging.info(f"Inserted {len(streams_to_insert)} Series.")
            else:
                logging.info("No Series to insert.")
        else:
            logging.error(f"Failed to fetch Series: {series_streams_res.get('error', 'Unknown error')}")

        logging.info(f"Local Series sync for connection {CONNECTION_ID_TO_SYNC} completed.")
        return {'success': True, 'message': 'Local Series sync completed.'}

    except Exception as e:
        logging.error(f"Error during local Series sync for connection {CONNECTION_ID_TO_SYNC}: {e}", exc_info=True)
        return {'success': False, 'error': str(e)}

if __name__ == "__main__":
    logging.info("Running sync_local.py directly.")
    results = []
    results.append(sync_live_data_local())
    results.append(sync_vod_data_local())
    results.append(sync_series_data_local())

    for res in results:
        if not res.get('success'):
            logging.error(f"One or more sync operations failed: {res.get('error')}")
            sys.exit(1)
    logging.info("All local sync operations completed successfully.")