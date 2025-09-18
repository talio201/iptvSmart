import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
const SERVICE_ROLE_KEY = Deno.env.get('SERVICE_ROLE_KEY');

console.log(`[EDGE FUNCTION START] SUPABASE_URL: ${SUPABASE_URL ? SUPABASE_URL.substring(0, 20) + '...' : 'Not Set'}`);
console.log(`[EDGE FUNCTION START] SERVICE_ROLE_KEY: ${SERVICE_ROLE_KEY ? SERVICE_ROLE_KEY.substring(0, 5) + '...' : 'Not Set'}`);

const supabase = createClient(
  SUPABASE_URL ?? '',
  SERVICE_ROLE_KEY ?? ''
);

async function fetchXtreamApi(serverUrl: string, username: string, password: string, action: string, extraParams: Record<string, any> = {}) {
  const params = new URLSearchParams({
    username: username,
    password: password,
    action: action,
    ...extraParams,
  });

  const url = `${serverUrl}/player_api.php?${params.toString()}`;
  console.log(`Fetching Xtream API: ${action} from ${serverUrl}`);

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Language': 'en-US,en;q=0.9,pt-BR;q=0.8,pt;q=0.7',
      'Sec-Fetch-Dest': 'document',
      'Sec-Fetch-Mode': 'navigate',
      'Sec-Fetch-Site': 'none',
      'Sec-Fetch-User': '?1',
      'Upgrade-Insecure-Requests': '1',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Erro da API Xtream (${action}): ${response.status} - ${errorText}`);
  }

  return response.json();
}

serve(async (req) => {
  try {
    const { server_url, username, password, connection_id, operation } = await req.json();

    if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: 'Variáveis de ambiente essenciais do Supabase não configuradas na Edge Function.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 500 }
      );
    }

    if (operation === 'authenticate') {
      if (!server_url || !username || !password) {
        return new Response(
          JSON.stringify({ error: 'Credenciais (server_url, username, password) são obrigatórias para autenticação.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      try {
        // Apenas autentica e busca info do usuário/servidor em uma única chamada
        const data = await fetchXtreamApi(server_url, username, password, 'get_user_info');

        // A API Xtream retorna { user_info: {...}, server_info: {...} }
        const userInfo = data.user_info;
        const serverInfo = data.server_info;

        if (!userInfo || userInfo.auth !== 1 || !serverInfo) {
          return new Response(
            JSON.stringify({ success: false, error: 'Credenciais inválidas, conta inativa ou falha ao obter informações do servidor.' }),
            { headers: { 'Content-Type': 'application/json' }, status: 401 }
          );
        }

        // Tenta encontrar uma conexão existente ou cria uma nova
        let existingConnection = null;
        const { data: connections, error: fetchError } = await supabase.from('xtream_connections').select('*').eq('server_url', server_url).eq('username', username).single().execute();

        if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error('Erro ao buscar conexão existente:', fetchError);
          return new Response(
            JSON.stringify({ success: false, error: 'Erro ao verificar conexão existente.' }),
            { headers: { 'Content-Type': 'application/json' }, status: 500 }
          );
        }

        if (connections) {
          existingConnection = connections;
          // Atualiza a senha e infos se a conexão já existe
          const { error: updateError } = await supabase.from('xtream_connections').update({
            password: password,
            server_info: serverInfo,
            user_info: userInfo,
            last_used: new Date().toISOString(),
            is_active: true
          }).eq('id', existingConnection.id).execute();

          if (updateError) {
            console.error('Erro ao atualizar conexão existente:', updateError);
            return new Response(
              JSON.stringify({ success: false, error: 'Erro ao atualizar conexão existente.' }),
              { headers: { 'Content-Type': 'application/json' }, status: 500 }
            );
          }
        } else {
          // Cria nova conexão
          const { data: newConnection, error: insertError } = await supabase.from('xtream_connections').insert({
            server_url: server_url,
            username: username,
            password: password,
            server_info: serverInfo,
            user_info: userInfo,
            is_active: true,
            created_at: new Date().toISOString(),
            last_used: new Date().toISOString()
          }).select().single().execute();

          if (insertError) {
            console.error('Erro ao inserir nova conexão:', insertError);
            return new Response(
              JSON.stringify({ success: false, error: 'Erro ao inserir nova conexão.' }),
              { headers: { 'Content-Type': 'application/json' }, status: 500 }
            );
          }
          existingConnection = newConnection;
        }

        return new Response(
          JSON.stringify({ success: true, connection_id: existingConnection.id, user_info: userInfo, server_info: serverInfo }),
          { headers: { 'Content-Type': 'application/json' }, status: 200 }
        );

      } catch (error: any) {
        console.error('Erro durante a autenticação Xtream:', error);
        return new Response(
          JSON.stringify({ success: false, error: `Erro na autenticação Xtream: ${error.message}` }),
          { headers: { 'Content-Type': 'application/json' }, status: 401 }
        );
      }
    } else if (operation === 'sync_data') {
      if (!server_url || !username || !password || !connection_id) {
        return new Response(
          JSON.stringify({ error: 'Credenciais e connection_id são obrigatórios para sincronização.' }),
          { headers: { 'Content-Type': 'application/json' }, status: 400 }
        );
      }

      console.log('Iniciando sincronização de dados Xtream...');

      // --- Sincronizar Categorias ---
      console.log('Sincronizando categorias...');
      const categoryActions = {
        live: 'get_live_categories',
        movie: 'get_vod_categories',
        series: 'get_series_categories',
      };

      for (const streamType of Object.keys(categoryActions)) {
        const action = categoryActions[streamType as keyof typeof categoryActions];
        try {
          const categoriesFromXtream = await fetchXtreamApi(server_url, username, password, action);
          console.log(`[EDGE FUNCTION] Dados brutos de categorias (${streamType}) do Xtream:`, categoriesFromXtream);

          if (!Array.isArray(categoriesFromXtream)) {
            console.warn(`Esperava uma lista de categorias para ${action}, mas recebeu:`, categoriesFromXtream);
            continue;
          }

          const categoriesToUpsert = categoriesFromXtream.map((catData: any) => ({
            connection_id: connection_id, // Adiciona connection_id
            category_id: String(catData.category_id),
            category_name: catData.category_name,
            parent_id: catData.parent_id,
            stream_type: streamType,
          }));
          console.log(`[EDGE FUNCTION] Categorias preparadas para upsert (${streamType}):`, categoriesToUpsert);

          const { error } = await supabase.from('categories').upsert(categoriesToUpsert, { onConflict: ['connection_id', 'category_id'] });
          if (error) {
            console.error(`[EDGE FUNCTION ERROR] Erro ao salvar categorias (${streamType}) no Supabase:`, error);
          } else {
            console.log(`[EDGE FUNCTION] Categorias (${streamType}) salvas/atualizadas no Supabase.`);
          }
        } catch (error: any) {
          console.error(`Erro ao buscar/salvar categorias (${streamType}):`, error.message);
        }
      }

      // --- Sincronizar Streams ---
      console.log('Sincronizando streams...');
      const streamActions = {
        live: 'get_live_streams',
        movie: 'get_vod_streams',
        series: 'get_series',
      };

      for (const streamType of Object.keys(streamActions)) {
        const action = streamActions[streamType as keyof typeof streamActions];
        try {
          const streamsFromXtream = await fetchXtreamApi(server_url, username, password, action);
          console.log(`[EDGE FUNCTION] Dados brutos de streams (${streamType}) do Xtream:`, streamsFromXtream);

          if (!Array.isArray(streamsFromXtream)) {
            console.warn(`Esperava uma lista de streams para ${action}, mas recebeu:`, streamsFromXtream);
            continue;
          }

          const streamsToUpsert = streamsFromXtream.map((streamData: any) => ({
            connection_id: connection_id, // Adiciona connection_id
            stream_id: String(streamData.stream_id || streamData.series_id),
            name: streamData.name,
            stream_type: streamType,
            stream_icon: streamType === 'series' ? streamData.cover : streamData.stream_icon,
            epg_channel_id: streamData.epg_channel_id,
            added: streamData.added,
            category_id: String(streamData.category_id),
            custom_sid: streamData.custom_sid,
            tv_archive: streamData.tv_archive,
            direct_source: streamData.direct_source,
            tv_archive_duration: streamData.tv_archive_duration,
            extra_info: streamData,
          }));
          console.log(`[EDGE FUNCTION] Streams preparados para upsert (${streamType}):`, streamsToUpsert);

          const { error } = await supabase.from('channels').upsert(streamsToUpsert, { onConflict: ['connection_id', 'stream_id'] });
          if (error) {
            console.error(`[EDGE FUNCTION ERROR] Erro ao salvar streams (${streamType}) no Supabase:`, error);
          } else {
            console.log(`[EDGE FUNCTION] Streams (${streamType}) salvos/atualizados no Supabase.`);
          }
        } catch (error: any) {
          console.error(`Erro ao buscar/salvar streams (${streamType}):`, error.message);
        }
      }

      return new Response(
        JSON.stringify({ message: 'Sincronização de dados Xtream concluída com sucesso!' }),
        { headers: { 'Content-Type': 'application/json' }, status: 200 }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Operação não suportada.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 400 }
      );
    }
  } catch (error: any) {
    console.error('Erro na Edge Function:', error);
    return new Response(
      JSON.stringify({ error: 'Erro na Edge Function', details: error.message }),
      { headers: { 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});