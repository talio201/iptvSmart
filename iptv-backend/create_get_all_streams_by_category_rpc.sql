-- create_get_all_streams_by_category_rpc.sql
-- DROP a função existente antes de recriá-la para evitar erros de tipo de retorno.
DROP FUNCTION IF EXISTS get_all_streams_by_category_rpc(integer, text);

CREATE OR REPLACE FUNCTION get_all_streams_by_category_rpc(
    p_connection_id INT,
    p_stream_type TEXT
)
RETURNS TABLE (
    id INT,
    category_id VARCHAR(50),
    category_name VARCHAR(255),
    parent_id INTEGER, -- Corrigido de TEXT para INTEGER
    stream_type TEXT,
    connection_id INT,
    streams JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.category_id,
        c.category_name,
        c.parent_id,
        c.stream_type,
        c.connection_id,
        COALESCE(
            (
                SELECT jsonb_agg(
                    jsonb_build_object(
                        'id', s.id,
                        'stream_id', s.stream_id,
                        'name', s.name,
                        'stream_type', s.stream_type,
                        'category_id', s.category_id,
                        'connection_id', s.connection_id,
                        'stream_icon', s.stream_icon,
                        'direct_source', s.direct_source -- Adicione outras colunas de stream que você precisa
                    )
                )
                FROM channels s
                WHERE s.connection_id = p_connection_id
                  AND s.stream_type = p_stream_type
                  AND s.category_id = c.category_id
            ),
            '[]'::jsonb
        ) AS streams
    FROM
        categories c
    WHERE
        c.connection_id = p_connection_id
        AND c.stream_type = p_stream_type;
END;
$$;