import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv
from datetime import datetime

# Load environment variables from a .env file if it exists in the current directory
# Make sure your .env file has SUPABASE_URL and SERVICE_ROLE_KEY
load_dotenv()

def generate_cache():
    """
    Fetches data from Supabase DB, structures it as JSON,
    and uploads it to Supabase Storage.
    """
    supabase_url = os.environ.get("SUPABASE_URL")
    # Use the SERVICE_ROLE_KEY for backend scripts to bypass RLS
    supabase_key = os.environ.get("SERVICE_ROLE_KEY") 
    
    if not supabase_url or not supabase_key:
        print("Error: SUPABASE_URL and SERVICE_ROLE_KEY environment variables are required.")
        print("Please ensure they are in your system environment or in a .env file.")
        return

    print("Connecting to Supabase...")
    supabase: Client = create_client(supabase_url, supabase_key)
    print("Connection successful.")

    bucket_name = 'content-cache'

    # 1. Fetch all connections
    print("Fetching all connections...")
    connections_resp = supabase.from_('xtream_connections').select('id, user_info, server_info').execute()
    if not connections_resp.data:
        print("No connections found. Exiting.")
        return
    
    connections = connections_resp.data
    print(f"Found {len(connections)} connection(s).")

    # 2. Process each connection
    for conn in connections:
        conn_id = conn['id']
        print(f"\n--- Processing Connection ID: {conn_id} ---")

        # 3. Fetch all categories and streams for this connection
        print("Fetching all categories and streams for this connection...")
        # Aumenta o limite para garantir que todos os dados sejam buscados (limite padrão do Supabase é 1000)
        categories_resp = supabase.from_('categories').select('*').eq('connection_id', conn_id).limit(50000).execute()
        streams_resp = supabase.from_('channels').select('*').eq('connection_id', conn_id).limit(50000).execute()

        if not categories_resp.data:
            print(f"No categories found for this connection. Skipping.")
            continue

        categories = categories_resp.data
        streams = streams_resp.data if streams_resp.data else []
        
        print(f"Found {len(categories)} categories and {len(streams)} streams.")

        # 4. Group streams by category_id for efficient lookup
        streams_by_category = {}
        for stream in streams:
            cat_id = str(stream['category_id'])
            if cat_id not in streams_by_category:
                streams_by_category[cat_id] = []
            # Otimiza as chaves do stream para reduzir o tamanho do JSON
            optimized_stream = {
                'i': stream.get('id'),
                'si': stream.get('stream_id'),
                'n': stream.get('name'),
                'st': stream.get('stream_type'),
                'ci': stream.get('category_id'),
                'co': stream.get('connection_id'),
                'ic': stream.get('stream_icon'),
                'ds': stream.get('direct_source'),
                # Adicione outras chaves que você usa no frontend, mas encurtadas
                'a': stream.get('added'), # Exemplo: 'added' para 'a'
                'd': stream.get('description'), # Exemplo: 'description' para 'd'
                'r': stream.get('rating'), # Exemplo: 'rating' para 'r'
                'du': stream.get('duration'), # Exemplo: 'duration' para 'du'
                'g': stream.get('genre'), # Exemplo: 'genre' para 'g'
                'y': stream.get('year'), # Exemplo: 'year' para 'y'
                'c': stream.get('cover'), # Exemplo: 'cover' para 'c'
                'e': stream.get('episode_num'), # Exemplo: 'episode_num' para 'e'
                's': stream.get('season_num'), # Exemplo: 'season_num' para 's'
            }
            streams_by_category[cat_id].append(optimized_stream)
        
        print("Streams grouped by category.")

        # 5. Generate and upload JSON files for each category, now with pagination
        user_info = conn.get('user_info', {})
        server_info = conn.get('server_info', {})

        manifest = {
            'connection_id': conn_id,
            'generated_at': datetime.utcnow().isoformat(),
            'user_info': user_info,
            'server_info': server_info,
            'categories': {
                'live': [],
                'movie': [],
                'series': []
            }
        }

        page_size = 50 # Define o tamanho da página

        for category in categories:
            cat_id = str(category['category_id'])
            stream_type = category['stream_type']
            
            all_streams_for_category = streams_by_category.get(cat_id, [])
            total_streams = len(all_streams_for_category)
            total_pages = (total_streams + page_size - 1) // page_size

            category_manifest_entry = {
                'category_id': cat_id,
                'category_name': category['category_name'],
                'stream_type': stream_type,
                'total_streams': total_streams,
                'page_size': page_size,
                'total_pages': total_pages,
                'pages': [] # Para armazenar os caminhos de cada página
            }

            for page_num in range(total_pages):
                start_index = page_num * page_size
                end_index = min(start_index + page_size, total_streams)
                paginated_streams = all_streams_for_category[start_index:end_index]

                category_content = {
                    'category_info': category,
                    'streams': paginated_streams
                }
                
                file_path = f"{conn_id}/{stream_type}_{cat_id}_page_{page_num}.json"
                file_content = json.dumps(category_content, indent=2)
                
                try:
                    print(f"Uploading {file_path} to bucket '{bucket_name}'...")
                    supabase.storage.from_(bucket_name).upload(
                        file_path,
                        bytes(file_content, 'utf-8'),
                        {"content-type": "application/json", "x-upsert": "true"}
                    )
                    print(f"Successfully uploaded {file_path}.")
                    category_manifest_entry['pages'].append({
                        'page_num': page_num,
                        'path': file_path,
                        'stream_count': len(paginated_streams)
                    })

                except Exception as e:
                    print(f"Error uploading {file_path}: {e}")
            
            if stream_type in manifest['categories']:
                manifest['categories'][stream_type].append(category_manifest_entry)

        # 6. Generate and upload the manifest file
        manifest_path = f"{conn_id}/manifest.json"
        manifest_content = json.dumps(manifest, indent=2)
        try:
            print(f"Uploading manifest {manifest_path}...")
            supabase.storage.from_(bucket_name).upload(
                manifest_path,
                bytes(manifest_content, 'utf-8'),
                {"content-type": "application/json", "x-upsert": "true"}
            )
            print(f"Successfully uploaded manifest for connection {conn_id}.")
        except Exception as e:
            print(f"Error uploading manifest for connection {conn_id}: {e}")

    print("\n--- Cache generation complete. ---")

if __name__ == "__main__":
    generate_cache()
