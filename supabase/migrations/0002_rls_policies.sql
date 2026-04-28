-- Helper: check if the calling user has admin role
CREATE OR REPLACE FUNCTION is_admin(uid uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1 FROM users WHERE id = uid AND role = 'admin'
  );
$$;

-- ============================================
-- USERS
-- ============================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_public_read" ON users
    FOR SELECT USING (true);

CREATE POLICY "users_self_update" ON users
    FOR UPDATE USING (auth.uid() = id);

-- ============================================
-- GUIDES
-- ============================================
ALTER TABLE guides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "guides_public_read" ON guides
    FOR SELECT USING (true);

CREATE POLICY "guides_self_write" ON guides
    FOR UPDATE USING (
        auth.uid() = user_id OR is_admin(auth.uid())
    );

CREATE POLICY "guides_admin_insert" ON guides
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "guides_admin_delete" ON guides
    FOR DELETE USING (is_admin(auth.uid()));

-- ============================================
-- PLACES
-- ============================================
ALTER TABLE places ENABLE ROW LEVEL SECURITY;

CREATE POLICY "places_public_read" ON places
    FOR SELECT USING (true);

CREATE POLICY "places_admin_write" ON places
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "places_admin_update" ON places
    FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "places_admin_delete" ON places
    FOR DELETE USING (is_admin(auth.uid()));

-- ============================================
-- ROUTES
-- ============================================
ALTER TABLE routes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "routes_public_read" ON routes
    FOR SELECT USING (true);

CREATE POLICY "routes_admin_write" ON routes
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "routes_admin_update" ON routes
    FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "routes_admin_delete" ON routes
    FOR DELETE USING (is_admin(auth.uid()));

-- ============================================
-- ROUTE CHECKPOINTS
-- ============================================
ALTER TABLE route_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "route_checkpoints_public_read" ON route_checkpoints
    FOR SELECT USING (true);

CREATE POLICY "route_checkpoints_admin_write" ON route_checkpoints
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "route_checkpoints_admin_update" ON route_checkpoints
    FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "route_checkpoints_admin_delete" ON route_checkpoints
    FOR DELETE USING (is_admin(auth.uid()));

-- ============================================
-- QUESTS
-- ============================================
ALTER TABLE quests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "quests_public_read" ON quests
    FOR SELECT USING (true);

CREATE POLICY "quests_admin_write" ON quests
    FOR INSERT WITH CHECK (is_admin(auth.uid()));

CREATE POLICY "quests_admin_update" ON quests
    FOR UPDATE USING (is_admin(auth.uid()));

CREATE POLICY "quests_admin_delete" ON quests
    FOR DELETE USING (is_admin(auth.uid()));

-- ============================================
-- SERVICES
-- ============================================
ALTER TABLE services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "services_public_read" ON services
    FOR SELECT USING (true);

CREATE POLICY "services_guide_owner_write" ON services
    FOR INSERT WITH CHECK (
        auth.uid() IN (SELECT user_id FROM guides WHERE id = guide_id)
    );

CREATE POLICY "services_guide_owner_update" ON services
    FOR UPDATE USING (
        auth.uid() IN (SELECT user_id FROM guides WHERE id = guide_id)
        OR is_admin(auth.uid())
    );

CREATE POLICY "services_guide_owner_delete" ON services
    FOR DELETE USING (
        auth.uid() IN (SELECT user_id FROM guides WHERE id = guide_id)
        OR is_admin(auth.uid())
    );

-- ============================================
-- BOOKINGS
-- ============================================
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "bookings_participants_read" ON bookings
    FOR SELECT USING (
        auth.uid() = tourist_id
        OR auth.uid() IN (SELECT user_id FROM guides WHERE id = guide_id)
        OR is_admin(auth.uid())
    );

CREATE POLICY "bookings_tourist_insert" ON bookings
    FOR INSERT WITH CHECK (auth.uid() = tourist_id);

CREATE POLICY "bookings_participants_update" ON bookings
    FOR UPDATE USING (
        auth.uid() = tourist_id
        OR auth.uid() IN (SELECT user_id FROM guides WHERE id = guide_id)
        OR is_admin(auth.uid())
    );

-- ============================================
-- CHECK-INS
-- ============================================
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "check_ins_booking_participants_read" ON check_ins
    FOR SELECT USING (
        auth.uid() = user_id
        OR auth.uid() IN (
            SELECT tourist_id FROM bookings WHERE id = booking_id
            UNION
            SELECT u.id FROM users u
            JOIN guides g ON g.user_id = u.id
            JOIN bookings b ON b.guide_id = g.id
            WHERE b.id = booking_id
        )
        OR is_admin(auth.uid())
    );

CREATE POLICY "check_ins_booking_participants_insert" ON check_ins
    FOR INSERT WITH CHECK (
        auth.uid() = user_id
        OR auth.uid() IN (
            SELECT u.id FROM users u
            JOIN guides g ON g.user_id = u.id
            JOIN bookings b ON b.guide_id = g.id
            WHERE b.id = booking_id
        )
    );

-- ============================================
-- REVIEWS
-- ============================================
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "reviews_public_read" ON reviews
    FOR SELECT USING (true);

CREATE POLICY "reviews_reviewer_insert" ON reviews
    FOR INSERT WITH CHECK (
        auth.uid() = reviewer_id
        AND EXISTS (
            SELECT 1 FROM bookings
            WHERE id = booking_id AND status = 'completed'
            AND tourist_id = auth.uid()
        )
    );

CREATE POLICY "reviews_admin_update" ON reviews
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================
-- DISPUTES
-- ============================================
ALTER TABLE disputes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "disputes_filer_or_admin_read" ON disputes
    FOR SELECT USING (
        auth.uid() = filed_by OR is_admin(auth.uid())
    );

CREATE POLICY "disputes_filer_insert" ON disputes
    FOR INSERT WITH CHECK (auth.uid() = filed_by);

CREATE POLICY "disputes_admin_update" ON disputes
    FOR UPDATE USING (is_admin(auth.uid()));

-- ============================================
-- COMPLETION PROOFS
-- ============================================
ALTER TABLE completion_proofs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "completion_proofs_public_read" ON completion_proofs
    FOR SELECT USING (true);

-- Service role inserts proofs (bypasses RLS automatically)
-- No INSERT policy needed for anon/authenticated roles
