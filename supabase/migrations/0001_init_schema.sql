-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT UNIQUE,
    wallet_address TEXT UNIQUE,
    display_name TEXT NOT NULL,
    avatar_url TEXT,
    role TEXT NOT NULL DEFAULT 'tourist' CHECK (role IN ('tourist', 'guide', 'admin')),
    xp INTEGER NOT NULL DEFAULT 0,
    rank TEXT NOT NULL DEFAULT 'novice',
    total_completions INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- GUIDES (extends users with guide-specific data)
-- ============================================
CREATE TABLE guides (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    license_number TEXT,
    license_document_url TEXT,
    bio TEXT,
    languages TEXT[] DEFAULT '{}',
    specialties TEXT[] DEFAULT '{}',
    years_experience INTEGER DEFAULT 0,
    is_verified BOOLEAN NOT NULL DEFAULT false,
    verified_at TIMESTAMPTZ,
    verified_by UUID REFERENCES users(id),
    is_suspended BOOLEAN NOT NULL DEFAULT false,
    reputation_pda TEXT,
    on_chain_score NUMERIC(5,2),
    on_chain_reviews INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- PLACES (verified locations)
-- ============================================
CREATE TABLE places (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    category TEXT NOT NULL CHECK (category IN (
        'trailhead', 'checkpoint', 'summit', 'teahouse',
        'viewpoint', 'temple', 'village', 'activity_center'
    )),
    latitude NUMERIC(10,7) NOT NULL,
    longitude NUMERIC(10,7) NOT NULL,
    altitude_meters INTEGER,
    region TEXT NOT NULL,
    qr_code_hash TEXT,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ROUTES
-- ============================================
CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('easy', 'moderate', 'challenging', 'extreme')),
    duration_days INTEGER NOT NULL,
    distance_km NUMERIC(6,1),
    max_altitude_meters INTEGER,
    region TEXT NOT NULL,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- ROUTE CHECKPOINTS (ordered stops on a route)
-- ============================================
CREATE TABLE route_checkpoints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID NOT NULL REFERENCES routes(id) ON DELETE CASCADE,
    place_id UUID NOT NULL REFERENCES places(id),
    sequence_order INTEGER NOT NULL,
    is_required BOOLEAN NOT NULL DEFAULT true,
    UNIQUE(route_id, sequence_order)
);

-- ============================================
-- QUESTS (story-driven challenges at places)
-- ============================================
CREATE TABLE quests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    route_id UUID REFERENCES routes(id),
    place_id UUID REFERENCES places(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    story_text TEXT,
    quest_type TEXT NOT NULL CHECK (quest_type IN (
        'visit', 'photo', 'learn', 'interact', 'collect'
    )),
    xp_reward INTEGER NOT NULL DEFAULT 10,
    difficulty TEXT NOT NULL DEFAULT 'easy',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- SERVICES (guide offerings)
-- ============================================
CREATE TABLE services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    guide_id UUID NOT NULL REFERENCES guides(id) ON DELETE CASCADE,
    route_id UUID REFERENCES routes(id),
    title TEXT NOT NULL,
    description TEXT,
    price_usd NUMERIC(10,2) NOT NULL,
    max_group_size INTEGER NOT NULL DEFAULT 8,
    includes TEXT[] DEFAULT '{}',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- BOOKINGS
-- ============================================
CREATE TABLE bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tourist_id UUID NOT NULL REFERENCES users(id),
    guide_id UUID NOT NULL REFERENCES guides(id),
    service_id UUID NOT NULL REFERENCES services(id),
    route_id UUID REFERENCES routes(id),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN (
        'pending', 'confirmed', 'active', 'completed',
        'disputed', 'refunded', 'cancelled'
    )),
    start_date DATE NOT NULL,
    end_date DATE,
    total_price_usd NUMERIC(10,2) NOT NULL,
    escrow_pda TEXT,
    escrow_tx_signature TEXT,
    milestones_total INTEGER NOT NULL DEFAULT 1,
    milestones_completed INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- CHECK-INS
-- ============================================
CREATE TABLE check_ins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    place_id UUID NOT NULL REFERENCES places(id),
    quest_id UUID REFERENCES quests(id),
    method TEXT NOT NULL CHECK (method IN ('gps', 'qr', 'guide_confirm', 'gps_qr')),
    latitude NUMERIC(10,7),
    longitude NUMERIC(10,7),
    guide_signature TEXT,
    photo_url TEXT,
    verified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- ============================================
-- REVIEWS
-- ============================================
CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    reviewer_id UUID NOT NULL REFERENCES users(id),
    guide_id UUID NOT NULL REFERENCES guides(id),
    rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    comment TEXT,
    is_flagged BOOLEAN NOT NULL DEFAULT false,
    on_chain_updated BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(booking_id, reviewer_id)
);

-- ============================================
-- DISPUTES
-- ============================================
CREATE TABLE disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    filed_by UUID NOT NULL REFERENCES users(id),
    category TEXT NOT NULL CHECK (category IN (
        'no_show', 'safety', 'billing', 'quality', 'other'
    )),
    description TEXT NOT NULL,
    evidence_urls TEXT[] DEFAULT '{}',
    status TEXT NOT NULL DEFAULT 'open' CHECK (status IN (
        'open', 'under_review', 'resolved_refund',
        'resolved_partial', 'resolved_dismissed'
    )),
    resolved_by UUID REFERENCES users(id),
    resolution_notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    resolved_at TIMESTAMPTZ
);

-- ============================================
-- COMPLETION PROOFS (links to on-chain cNFTs)
-- ============================================
CREATE TABLE completion_proofs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID NOT NULL REFERENCES bookings(id),
    user_id UUID NOT NULL REFERENCES users(id),
    route_id UUID REFERENCES routes(id),
    nft_mint_address TEXT,
    mint_tx_signature TEXT,
    metadata_uri TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
