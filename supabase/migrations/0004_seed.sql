-- Seed: 5 Nepal routes, 15 places, 3 verified guides, 10 quests

-- ============================================
-- ADMIN USER (seed only — real admins use Supabase Auth)
-- ============================================
INSERT INTO users (id, email, display_name, role)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin@tourchain.app', 'TourChain Admin', 'admin');

-- ============================================
-- ROUTES
-- ============================================
INSERT INTO routes (id, name, description, difficulty, duration_days, distance_km, max_altitude_meters, region, is_active)
VALUES
  ('10000000-0000-0000-0000-000000000001',
   'Everest Base Camp Trek',
   'The classic high-altitude pilgrimage to the foot of the world''s highest mountain, passing Sherpa villages, ancient monasteries, and dramatic Himalayan scenery.',
   'challenging', 14, 130.0, 5364, 'Khumbu', true),

  ('10000000-0000-0000-0000-000000000002',
   'Annapurna Circuit',
   'A full circumnavigation of the Annapurna massif crossing the Thorong La pass at 5,416 m — one of the great classic treks of the world.',
   'challenging', 18, 210.0, 5416, 'Annapurna', true),

  ('10000000-0000-0000-0000-000000000003',
   'Langtang Valley Trek',
   'A quieter alternative to the Everest and Annapurna regions, offering intimate views of Langtang Lirung and a warm welcome in Tamang villages.',
   'moderate', 9, 65.0, 4984, 'Langtang', true),

  ('10000000-0000-0000-0000-000000000004',
   'Manaslu Circuit Trek',
   'A rugged remote circuit around the eighth-highest mountain in the world, requiring a special restricted-area permit and rewarding trekkers with raw, crowd-free Himalayan beauty.',
   'extreme', 16, 177.0, 5160, 'Gorkha', true),

  ('10000000-0000-0000-0000-000000000005',
   'Poon Hill Sunrise Trek',
   'A short, rewarding trek from Pokhara to Poon Hill, famous for its panoramic dawn view of Dhaulagiri, Annapurna South, and Machapuchare.',
   'easy', 4, 40.0, 3210, 'Annapurna', true);

-- ============================================
-- PLACES (15 real locations with lat/lng)
-- ============================================
INSERT INTO places (id, name, description, category, latitude, longitude, altitude_meters, region, is_active)
VALUES
  -- Everest region
  ('20000000-0000-0000-0000-000000000001',
   'Lukla Airport (Tenzing–Hillary Airport)',
   'The starting point for most Everest treks — one of the world''s most dramatic airstrips at 2,860 m.',
   'trailhead', 27.6869, 86.7298, 2860, 'Khumbu', true),

  ('20000000-0000-0000-0000-000000000002',
   'Namche Bazaar',
   'The busy Sherpa trading hub and acclimatisation stop at 3,440 m, gateway to the high Khumbu.',
   'village', 27.8054, 86.7139, 3440, 'Khumbu', true),

  ('20000000-0000-0000-0000-000000000003',
   'Tengboche Monastery',
   'The most famous monastery in the Khumbu region, perched on a ridge with a full Everest panorama.',
   'temple', 27.8362, 86.7642, 3867, 'Khumbu', true),

  ('20000000-0000-0000-0000-000000000004',
   'Everest Base Camp',
   'The legendary camp at 5,364 m where Everest expeditions begin. Standing here is proof of commitment.',
   'summit', 28.0026, 86.8528, 5364, 'Khumbu', true),

  -- Annapurna region
  ('20000000-0000-0000-0000-000000000005',
   'Besisahar Trailhead',
   'The traditional starting village of the Annapurna Circuit at 760 m, in the Marsyangdi river valley.',
   'trailhead', 28.2303, 84.3836, 760, 'Annapurna', true),

  ('20000000-0000-0000-0000-000000000006',
   'Manang Village',
   'High-altitude Annapurna acclimatisation village at 3,519 m with views of Annapurna III and Gangapurna.',
   'village', 28.6699, 84.0188, 3519, 'Annapurna', true),

  ('20000000-0000-0000-0000-000000000007',
   'Thorong La Pass',
   'The 5,416 m high point of the Annapurna Circuit — one of the highest trekking passes in the world.',
   'summit', 28.7902, 83.9297, 5416, 'Annapurna', true),

  ('20000000-0000-0000-0000-000000000008',
   'Muktinath Temple',
   'Sacred Hindu and Buddhist pilgrimage site at 3,800 m, with 108 water spouts and an eternal flame.',
   'temple', 28.8175, 83.8722, 3800, 'Mustang', true),

  -- Langtang region
  ('20000000-0000-0000-0000-000000000009',
   'Syabrubesi',
   'Entry point for the Langtang Valley trek at 1,503 m, a small Tamang village near the Tibetan border.',
   'trailhead', 28.1583, 85.3425, 1503, 'Langtang', true),

  ('20000000-0000-0000-0000-000000000010',
   'Kyanjin Gompa',
   'A remote monastery at 3,870 m at the head of Langtang Valley, with views of Langtang Lirung.',
   'temple', 28.2121, 85.5712, 3870, 'Langtang', true),

  -- Ghorepani / Poon Hill region
  ('20000000-0000-0000-0000-000000000011',
   'Ghorepani Village',
   'Rhododendron-forested teahouse village at 2,860 m, the overnight base for the Poon Hill sunrise.',
   'village', 28.4008, 83.7004, 2860, 'Annapurna', true),

  ('20000000-0000-0000-0000-000000000012',
   'Poon Hill Viewpoint',
   'The 3,210 m hilltop with a panoramic view of Dhaulagiri, Annapurna South, Hiunchuli, and Machapuchare at sunrise.',
   'viewpoint', 28.4003, 83.6936, 3210, 'Annapurna', true),

  -- Manaslu region
  ('20000000-0000-0000-0000-000000000013',
   'Soti Khola Trailhead',
   'Starting point of the Manaslu Circuit at 700 m, where the road ends and the trail begins.',
   'trailhead', 28.2914, 84.8622, 700, 'Gorkha', true),

  ('20000000-0000-0000-0000-000000000014',
   'Lho Village',
   'Remote Nubri village at 3,180 m with direct views of Manaslu''s south face and an ancient gompa.',
   'village', 28.5826, 84.7229, 3180, 'Gorkha', true),

  -- Laughing Island (quest endpoint)
  ('20000000-0000-0000-0000-000000000015',
   'Fewa Lake Island (Laughing Island)',
   'A small forested island in Pokhara''s Fewa Lake accessible by rowboat, home to a small Barahi temple and a quiet spot for reflection after a long trek.',
   'activity_center', 28.2109, 83.9563, 820, 'Pokhara', true);

-- ============================================
-- GUIDE USERS
-- ============================================
INSERT INTO users (id, email, display_name, role)
VALUES
  ('30000000-0000-0000-0000-000000000001', 'pemba@tourchain.app', 'Pemba Sherpa', 'guide'),
  ('30000000-0000-0000-0000-000000000002', 'dawa@tourchain.app', 'Dawa Tamang', 'guide'),
  ('30000000-0000-0000-0000-000000000003', 'lakpa@tourchain.app', 'Lakpa Lama', 'guide');

-- ============================================
-- GUIDES (verified)
-- ============================================
INSERT INTO guides (id, user_id, license_number, bio, languages, specialties, years_experience, is_verified, verified_at, verified_by, is_suspended)
VALUES
  ('40000000-0000-0000-0000-000000000001',
   '30000000-0000-0000-0000-000000000001',
   'NTB-2019-EBC-00142',
   'Born in Namche Bazaar and raised in the shadow of Everest. I have summited Island Peak four times and guided over 200 trekkers to Everest Base Camp since 2012. I speak Nepali, Sherpa, English, and basic Japanese. Safety and cultural education are my priorities.',
   ARRAY['Nepali', 'English', 'Sherpa', 'Japanese'],
   ARRAY['Everest region', 'high-altitude', 'acclimatisation', 'cultural tours'],
   12, true, now(), '00000000-0000-0000-0000-000000000001', false),

  ('40000000-0000-0000-0000-000000000002',
   '30000000-0000-0000-0000-000000000002',
   'NTB-2021-ANN-00389',
   'Third-generation Tamang guide from Besisahar. The Annapurna Circuit is my home trail — I know every teahouse owner and every weather pattern. I specialise in small-group cultural immersion treks with no stone unturned.',
   ARRAY['Nepali', 'English', 'Tamang', 'Hindi'],
   ARRAY['Annapurna', 'Manaslu', 'cultural immersion', 'flora and fauna'],
   8, true, now(), '00000000-0000-0000-0000-000000000001', false),

  ('40000000-0000-0000-0000-000000000003',
   '30000000-0000-0000-0000-000000000003',
   'NTB-2022-LNG-00512',
   'Langtang local with deep roots in the Tamang community. After the 2015 earthquake reshaped Langtang Valley, I helped rebuild the trail and the tourism economy. I guide treks with an emphasis on responsible travel and community benefit.',
   ARRAY['Nepali', 'English', 'Tibetan'],
   ARRAY['Langtang', 'Tamang heritage trail', 'community-based tourism', 'photography'],
   6, true, now(), '00000000-0000-0000-0000-000000000001', false);

-- ============================================
-- QUESTS (10 quests including Laughing Island endpoint)
-- ============================================
INSERT INTO quests (id, route_id, place_id, title, description, story_text, quest_type, xp_reward, difficulty, is_active)
VALUES
  ('50000000-0000-0000-0000-000000000001',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000002',
   'Sherpa Gateway',
   'Arrive in Namche Bazaar and visit the Sherpa Museum.',
   'Every expedition to Everest passes through Namche. The Sherpa people have guided mountaineers for over a century. Visit the museum and find the wall of first-ascent photos. What year did the first woman summit Everest?',
   'learn', 25, 'easy', true),

  ('50000000-0000-0000-0000-000000000002',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000003',
   'The Prayer Wheel at Tengboche',
   'Spin the large prayer wheel at Tengboche Monastery three times before sunset.',
   'Tengboche Monastery was founded in 1916. Locals say each spin of the great wheel sends ten thousand prayers to the sky. The wheel faces Ama Dablam. Spin it and listen to the resonance — what do you hear?',
   'interact', 30, 'easy', true),

  ('50000000-0000-0000-0000-000000000003',
   '10000000-0000-0000-0000-000000000001',
   '20000000-0000-0000-0000-000000000004',
   'Top of the World''s Foot',
   'Reach Everest Base Camp and photograph the Khumbu Icefall.',
   'You are standing where Sir Edmund Hillary and Tenzing Norgay began their final push in 1953. The Khumbu Icefall ahead is one of the most dangerous sections of the summit route. Photograph it. You have earned this view.',
   'photo', 100, 'challenging', true),

  ('50000000-0000-0000-0000-000000000004',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000006',
   'Acclimatisation Day in Manang',
   'Spend a rest day in Manang and attend a free altitude-sickness talk at the health post.',
   'Manang''s Himalayan Rescue Association runs a daily talk on altitude sickness at 3 PM. Every year, climbers who skip this talk pay the price above Thorong La. Attend it. Knowledge here is survival.',
   'learn', 20, 'easy', true),

  ('50000000-0000-0000-0000-000000000005',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000007',
   'Cross the Roof of the Circuit',
   'Cross Thorong La Pass (5,416 m) from east to west before 10 AM.',
   'Thorong La must be crossed before the afternoon wind arrives. You will start in darkness. By the time the sun rises behind Annapurna III, you should be at the cairn. Place a stone. The wind will carry your intention west.',
   'visit', 150, 'challenging', true),

  ('50000000-0000-0000-0000-000000000006',
   '10000000-0000-0000-0000-000000000002',
   '20000000-0000-0000-0000-000000000008',
   'The 108 Spouts of Muktinath',
   'Wash your hands under all 108 water spouts at Muktinath Temple.',
   'Muktinath is sacred to both Hindus and Buddhists. The 108 spouts represent the 108 beads of a prayer mala. Hindu pilgrims walk the full circuit barefoot in the cold water. Walk it. Count them.',
   'interact', 50, 'moderate', true),

  ('50000000-0000-0000-0000-000000000007',
   '10000000-0000-0000-0000-000000000003',
   '20000000-0000-0000-0000-000000000010',
   'Langtang Lirung at Dawn',
   'Photograph Langtang Lirung (7,227 m) from Kyanjin Gompa at sunrise.',
   'Langtang Valley was devastated by an avalanche triggered by the 2015 earthquake. The village was rebuilt from scratch. Kyanjin Gompa survived. From its roof at dawn, Langtang Lirung turns gold before the rest of the world wakes up.',
   'photo', 60, 'moderate', true),

  ('50000000-0000-0000-0000-000000000008',
   '10000000-0000-0000-0000-000000000005',
   '20000000-0000-0000-0000-000000000012',
   'Poon Hill Sunrise',
   'Reach Poon Hill viewpoint before sunrise and photograph the Annapurna range lit by first light.',
   'The alarm goes at 4:30 AM. You hike 45 minutes in darkness with a headlamp. Then the sky turns orange and Dhaulagiri, Annapurna South, Hiunchuli, and Machapuchare all glow at once. No filter needed.',
   'photo', 40, 'easy', true),

  ('50000000-0000-0000-0000-000000000009',
   '10000000-0000-0000-0000-000000000004',
   '20000000-0000-0000-0000-000000000014',
   'Manaslu Face View',
   'Photograph the south face of Manaslu from Lho Village.',
   'From Lho''s ancient stone courtyard, Manaslu fills the entire northern sky. At 8,163 m it is the eighth-highest mountain on Earth. Most people have never heard of it. You are among the few who see it up close.',
   'photo', 80, 'extreme', true),

  ('50000000-0000-0000-0000-000000000010',
   NULL,
   '20000000-0000-0000-0000-000000000015',
   'Laughing Island',
   'Reach the island in Fewa Lake by rowboat and meditate for 10 minutes at the Barahi Temple.',
   'Pokhara''s Fewa Lake holds a secret. The small island in the middle is called "Laughing Island" by locals because whoever reaches it by their own effort — after a long trek — tends to laugh when they arrive. No reason. Just joy. Rowboat only. No motor.',
   'interact', 35, 'easy', true);
