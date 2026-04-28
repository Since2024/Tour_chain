CREATE MATERIALIZED VIEW leaderboard AS
SELECT
    u.id,
    u.display_name,
    u.avatar_url,
    u.xp,
    u.rank,
    u.total_completions,
    COUNT(DISTINCT ci.place_id) AS unique_places_visited,
    RANK() OVER (ORDER BY u.xp DESC) AS position
FROM users u
LEFT JOIN check_ins ci ON ci.user_id = u.id AND ci.verified = true
WHERE u.role = 'tourist'
GROUP BY u.id
ORDER BY u.xp DESC;

CREATE UNIQUE INDEX leaderboard_id_idx ON leaderboard (id);

CREATE OR REPLACE FUNCTION refresh_leaderboard()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    REFRESH MATERIALIZED VIEW CONCURRENTLY leaderboard;
END;
$$;
