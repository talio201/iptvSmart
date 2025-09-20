# Test comment to trigger Vercel deployment
from flask import Blueprint, request, jsonify, Response, stream_with_context, current_app
from urllib.parse import urljoin
import requests
import urllib3
import os
import logging
from concurrent.futures import ThreadPoolExecutor
from src.services.xtream_service import XtreamService
from flask_cors import CORS # Import CORS
from concurrent.futures import ThreadPoolExecutor

iptv_bp = Blueprint('iptv', __name__)
CORS(iptv_bp) # Apply CORS to the blueprint

# Executor for background tasks
executor = ThreadPoolExecutor(max_workers=2)

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

def get_xtream_service():
    app = current_app._get_current_object()
    return XtreamService(app)

import traceback # Importar traceback para obter o stack trace

@iptv_bp.route('/auth', methods=['POST'])
def authenticate():
    """Autentica com servidor Xtream"""
    try:
        data = request.json
        server_url = data.get('server_url')
        username = data.get('username')
        password = data.get('password')

        if not all([server_url, username, password]):
            return jsonify({'success': False, 'error': 'Credenciais (server_url, username, password) são obrigatórias.'}), 400

        result = get_xtream_service().authenticate(server_url, username, password)

        if result['success']:
            return jsonify(result), 200
        else:
            return jsonify(result), 401
    except Exception as e:
        print(f"Erro na rota /api/iptv/auth: {e}")
        traceback_str = traceback.format_exc()
        print(traceback_str)
        return jsonify({'success': False, 'error': str(e), 'traceback': traceback_str}), 500

@iptv_bp.route('/connections', methods=['GET'])
def get_connections():
    """Lista conexões salvas (agora do Supabase)"""
    try:
        result = get_xtream_service().get_connections()
        return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/request_sync/<string:content_type>/<int:connection_id>', methods=['POST'])
def request_sync_granular(content_type, connection_id):
    """Requests a granular data synchronization to run in the background."""
    service = get_xtream_service()
    sync_function = None
    message = ""

    if content_type == 'live':
        sync_function = service.sync_live_data
        message = "Sincronização de Canais ao Vivo iniciada em segundo plano."
    elif content_type == 'vod':
        sync_function = service.sync_vod_data
        message = "Sincronização de Filmes iniciada em segundo plano."
    elif content_type == 'series':
        sync_function = service.sync_series_data
        message = "Sincronização de Séries iniciada em segundo plano."
    else:
        return jsonify({'success': False, 'error': 'Tipo de conteúdo inválido para sincronização.'}), 400

    try:
        executor.submit(sync_function, connection_id)
        return jsonify({'success': True, 'message': f"{message} Pode levar alguns minutos para ser concluída."}), 202
    except Exception as e:
        logging.error(f"Failed to submit sync job for {content_type} for connection {connection_id}: {e}", exc_info=True)
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/categories/<int:connection_id>/<category_type>', methods=['GET'])
def get_categories(connection_id, category_type):
    """Busca categorias por tipo (live, vod, series) do Supabase"""
    try:
        if category_type == 'live':
            result = get_xtream_service().get_live_categories(connection_id)
        elif category_type == 'vod':
            result = get_xtream_service().get_vod_categories(connection_id)
        elif category_type == 'series':
            result = get_xtream_service().get_series_categories(connection_id)
        else:
            return jsonify({'success': False, 'error': 'Tipo de categoria inválido'}), 400
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/streams/<int:connection_id>/<stream_type>', methods=['GET'])
def get_streams(connection_id, stream_type):
    """Busca streams por tipo do Supabase com paginação"""
    try:
        category_id = request.args.get('category_id')
        page = request.args.get('page', 1, type=int)
        limit = request.args.get('limit', 50, type=int) # Add limit parameter

        if stream_type == 'live':
            result = get_xtream_service().get_live_streams(connection_id, category_id, page)
        elif stream_type == 'vod':
            result = get_xtream_service().get_vod_streams(connection_id, category_id, page)
        elif stream_type == 'series':
            result = get_xtream_service().get_series(connection_id, category_id, page, limit)
        else:
            return jsonify({'success': False, 'error': 'Tipo de stream inválido'}), 400
        
        return jsonify(result), 200 if result.get('success') else 400
    except Exception as e:
        print(f"[ROUTE ERROR] /api/iptv/streams/{connection_id}/{stream_type}: {e}")
        traceback_str = traceback.format_exc()
        print(traceback_str)
        return jsonify({'success': False, 'error': str(e), 'traceback': traceback_str}), 500

@iptv_bp.route('/search/<int:connection_id>/<stream_type>', methods=['GET'])
def search(connection_id, stream_type):
    """Searches for streams by name."""
    try:
        query = request.args.get('q', '')
        result = get_xtream_service().search_streams(connection_id, stream_type, query)
        return jsonify(result), 200 if result.get('success') else 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/streams/details', methods=['POST'])
def get_stream_details():
    """Fetches full details for a list of stream IDs."""
    try:
        data = request.get_json()
        stream_ids = data.get('stream_ids', [])
        if not stream_ids:
            return jsonify({'success': True, 'streams': []})
            
        result = get_xtream_service().get_streams_by_ids(stream_ids)
        return jsonify(result), 200 if result.get('success') else 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/clear_cache/<int:connection_id>', methods=['POST'])
def clear_cache(connection_id):
    """Clears local cached data for a given connection."""
    # This method is now largely symbolic as data is managed in Supabase
    try:
        result = get_xtream_service().clear_local_data(connection_id)
        return jsonify(result), 200 if result.get('success') else 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/stream-url/<int:connection_id>/<stream_id>', methods=['GET'])
def get_stream_url(connection_id, stream_id):
    """Gera URL do stream"""
    try:
        stream_type = request.args.get('type', 'live')
        result = get_xtream_service().get_stream_url(connection_id, stream_id, stream_type)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/proxy')
def proxy():
    """Proxy para streams de vídeo que reescreve URLs de playlists HLS."""
    try:
        url = request.args.get('url')
        if not url:
            return jsonify({'success': False, 'error': 'URL é obrigatória'}), 400
        
        headers = {
            'User-Agent': 'VLC/3.0.0',
            'Referer': url
        }
        
        req = requests.get(url, stream=True, timeout=30, headers=headers, verify=False)
        req.raise_for_status()

        content_type = req.headers.get('content-type', '').lower()

        # Se for uma playlist HLS, precisamos reescrever as URLs dos segmentos
        if 'application/vnd.apple.mpegurl' in content_type or 'application/x-mpegurl' in content_type:
            playlist_content = req.text
            base_url = url.rsplit('/', 1)[0] + '/' # Pega a URL base do m3u8

            new_playlist = []
            for line in playlist_content.splitlines():
                line = line.strip()
                if not line.startswith('#'):
                    # Constrói a URL absoluta para o segmento
                    absolute_segment_url = urljoin(base_url, line)
                    # Reescreve a linha para que o player chame nosso proxy para o segmento
                    line = f"/api/iptv/proxy?url={requests.utils.quote(absolute_segment_url)}"
                new_playlist.append(line)
            
            rewritten_playlist = "\n".join(new_playlist)
            return Response(rewritten_playlist, content_type=content_type)

        # Para todos os outros tipos de conteúdo (ex: segmentos .ts), apenas faz o proxy direto
        else:
            return Response(stream_with_context(req.iter_content(chunk_size=1024)), content_type=content_type)

    except requests.exceptions.Timeout:
        return jsonify({'success': False, 'error': 'Timeout ao acessar a URL do stream'}), 504
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@iptv_bp.route('/series_info/<int:connection_id>/<int:series_id>', methods=['GET'])
def get_series_info(connection_id, series_id):
    """Busca detalhes de uma serie"""
    try:
        result = get_xtream_service().get_series_info(connection_id, series_id)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/all_streams_by_category/<int:connection_id>/<stream_type>', methods=['GET'])
def get_all_streams_by_category(connection_id, stream_type):
    """Busca todos os streams agrupados por categoria para um tipo específico."""
    try:
        result = get_xtream_service().get_all_streams_by_category(connection_id, stream_type)
        return jsonify(result), 200 if result['success'] else 400
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@iptv_bp.route('/dashboard/<int:connection_id>', methods=['GET'])
def get_dashboard_data(connection_id):
    """Retorna dados consolidados para o dashboard, lendo diretamente das tabelas do Supabase."""
    try:
        service = get_xtream_service()
        supabase = service.supabase

        # 1. Pega informações da conexão (user_info, server_info)
        connection_req = supabase.from_('xtream_connections').select('user_info, server_info').eq('id', connection_id).single().execute()
        if not connection_req.data:
            return jsonify({'success': False, 'error': 'Conexão não encontrada.'}), 404
        
        user_info = connection_req.data.get('user_info', {})
        server_info = connection_req.data.get('server_info', {})

        # 2. Calcula estatísticas contando as linhas nas tabelas do Supabase
        # O método `count='exact'` é uma forma eficiente de obter a contagem total.
        live_count_req = supabase.from_('live_streams').select('id', count='exact').eq('connection_id', connection_id).execute()
        vod_count_req = supabase.from_('vod_streams').select('id', count='exact').eq('connection_id', connection_id).execute()
        series_count_req = supabase.from_('series').select('id', count='exact').eq('connection_id', connection_id).execute()
        live_cat_count_req = supabase.from_('live_categories').select('id', count='exact').eq('connection_id', connection_id).execute()
        vod_cat_count_req = supabase.from_('vod_categories').select('id', count='exact').eq('connection_id', connection_id).execute()

        stats = {
            'total_live_channels': live_count_req.count or 0,
            'total_vod': vod_count_req.count or 0,
            'total_series': series_count_req.count or 0,
            'total_categories': (live_cat_count_req.count or 0) + (vod_cat_count_req.count or 0)
        }

        # 3. Verifica se a sincronização é necessária
        is_sync_needed = (stats['total_live_channels'] + stats['total_vod'] + stats['total_series']) == 0

        # 4. Pega canais recentes (placeholder, pois requer uma tabela/lógica específica)
        recent_channels = []

        dashboard_data = {
            'user_info': user_info,
            'server_info': server_info,
            'statistics': stats,
            'recent_channels': recent_channels,
            'is_sync_needed': is_sync_needed
        }

        return jsonify({'success': True, 'dashboard': dashboard_data}), 200

    except Exception as e:
        print(f"[ROUTE ERROR] get_dashboard_data: {e}")
        traceback_str = traceback.format_exc()
        print(traceback_str)
        return jsonify({'success': False, 'error': str(e), 'traceback': traceback_str}), 500

@iptv_bp.route('/preferences', methods=['GET', 'POST'])
def user_preferences():
    """Gerencia preferências do usuário (agora no Supabase)"""
    try:
        user_id = request.args.get('user_id', 'default')
        if request.method == 'GET':
            result = get_xtream_service().get_user_preferences(user_id) # Need to add this method to XtreamService
            return jsonify(result), 200 if result['success'] else 500
        elif request.method == 'POST':
            data = request.get_json()
            result = get_xtream_service().update_user_preferences(user_id, data) # Need to add this method to XtreamService
            return jsonify(result), 200 if result['success'] else 500
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

