-- Índices para otimizar as consultas de contagem do dashboard.

-- Um índice composto na tabela 'channels' é o mais importante,
-- pois a usamos para contar canais, filmes e séries.
CREATE INDEX IF NOT EXISTS idx_channels_connection_stream_type ON public.channels (connection_id, stream_type);

-- Um índice na tabela 'categories' para acelerar a contagem de categorias.
CREATE INDEX IF NOT EXISTS idx_categories_connection_id ON public.categories (connection_id);
