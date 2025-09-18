CREATE OR REPLACE FUNCTION get_dashboard_stats(p_connection_id bigint)
RETURNS TABLE (
    total_live_channels bigint,
    total_vod bigint,
    total_series bigint,
    total_categories bigint
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        (SELECT count(*) FROM public.channels WHERE connection_id = p_connection_id AND stream_type = 'live') as total_live_channels,
        (SELECT count(*) FROM public.channels WHERE connection_id = p_connection_id AND stream_type = 'movie') as total_vod,
        (SELECT count(*) FROM public.channels WHERE connection_id = p_connection_id AND stream_type = 'series') as total_series,
        (SELECT count(*) FROM public.categories WHERE connection_id = p_connection_id) as total_categories;
END;
$$ LANGUAGE plpgsql;