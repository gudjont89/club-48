-- ============================================================
-- SEED DATA: All 48 grounds, teams, and team_seasons for 2025
-- ============================================================

-- Clear existing seed data (from schema file)
TRUNCATE public.team_seasons, public.fixtures, public.visits, public.teams, public.grounds RESTART IDENTITY CASCADE;

-- ============================================================
-- GROUNDS (unique physical venues)
-- ============================================================
INSERT INTO public.grounds (name, city, latitude, longitude, capacity, surface) VALUES
  -- Besta deild grounds
  ('Víkingsvöllur',         'Reykjavík',        64.1275, -21.8550,  3500, 'artificial'),
  ('Kópavogsvöllur',        'Kópavogur',        64.1050, -21.8860,  3009, 'artificial'),
  ('Vodafonevöllurinn',     'Reykjavík',        64.1280, -21.8806,  3060, 'artificial'),
  ('Samsung völlurinn',     'Garðabær',         64.0887, -21.9200,  1500, 'artificial'),
  ('Kaplakriki',            'Hafnarfjörður',    64.0670, -21.9710,  6450, 'artificial'),
  ('KR-völlur',             'Reykjavík',        64.1420, -21.8720,  2781, 'artificial'),
  ('Laugardalsvöllur',      'Reykjavík',        64.1445, -21.8730,  9800, 'grass'),
  ('Þórólfsvöllur',         'Akranes',          64.3210, -22.0750,  2500, 'artificial'),
  ('Hasteinsvöllur',        'Vestmannaeyjar',   63.4400, -20.2700,  3540, 'grass'),
  ('Akureyrarvöllur',       'Akureyri',         65.6835, -18.0878,  2550, 'artificial'),
  ('Torfnesvöllur',         'Ísafjörður',       66.0700, -23.1250,  1200, 'artificial'),
  ('Mosfellsvöllur',        'Mosfellsbær',      64.1668, -21.6970,  1000, 'artificial'),
  -- 1. deild grounds
  ('Þórsárvöllur',          'Akureyri',         65.6700, -18.1050,  1500, 'artificial'),
  ('Fylkisvöllur',          'Reykjavík',        64.1154, -21.8834,  2000, 'artificial'),
  -- Kópavogsvöllur already inserted (id=2), shared by HK
  ('Nettóvöllurinn',        'Keflavík',         64.0040, -22.5580,  3000, 'artificial'),
  ('Grindavíkurvöllur',     'Grindavík',        63.8420, -22.4340,  1500, 'artificial'),
  ('Leiknishæð',            'Reykjavík',        64.1180, -21.8130,   500, 'artificial'),
  ('Þróttarvöllurinn',      'Reykjavík',        64.1350, -21.8950,  1200, 'artificial'),
  ('Selfossvöllur',         'Selfoss',          63.9346, -21.0013,  2000, 'grass'),
  ('Húsavíkurvöllur',       'Húsavík',          66.0450, -17.3380,   800, 'artificial'),
  ('Njarðvíkurvöllur',      'Njarðvík',         63.9770, -22.6680,  1000, 'artificial'),
  ('Álftanesvöllur',        'Álftanes',         64.1000, -21.9800,   800, 'artificial'),
  ('Fjölnisvöllur',         'Reykjavík',        64.1115, -21.8525,  1200, 'artificial'),
  -- 2. deild grounds
  ('Seltjarnarnesvöllur',   'Seltjarnarnes',    64.1540, -21.9960,   800, 'artificial'),
  ('Dalvíkurvöllur',        'Dalvík',           65.9710, -18.5250,   600, 'artificial'),
  ('Linnetsvöllur',         'Garðabær',         64.0880, -21.9320,  1000, 'artificial'),
  ('Ásvallalaug',           'Hafnarfjörður',    64.0680, -21.9500,  1000, 'artificial'),
  ('Vogavöllur',            'Vogar',            63.9810, -22.3770,   500, 'artificial'),
  ('Kornavöllur',           'Reykjavík',        64.1200, -21.8100,   600, 'artificial'),
  ('Ólafsvíkurvöllur',      'Ólafsvík',         64.8940, -23.7140,   500, 'artificial'),
  -- Kópavogsvöllur already inserted (id=2), shared by Kári
  ('Eskifjarðarvöllur',     'Eskifjörður',      65.0730, -14.0150,   500, 'artificial'),
  ('Víðisvöllur',           'Garður',           64.0620, -22.6870,   500, 'artificial'),
  ('Ægisvöllur',            'Reyðarfjörður',    65.0330, -14.2040,   400, 'artificial'),
  ('Huginnsvöllur',         'Seyðisfjörður',    65.2590, -14.0060,   400, 'artificial'),
  -- 3. deild grounds
  ('HR-völlur',             'Kópavogur',        64.1020, -21.8750,   500, 'artificial'),
  ('Grenivíkurvöllur',      'Grenivík',         65.9470, -18.1750,   300, 'grass'),
  ('Leiknisv. Fáskrúðsf.',  'Fáskrúðsfjörður', 65.0310, -13.8680,   300, 'artificial'),
  ('Tindastólsvöllur',      'Sauðárkrókur',     65.7490, -19.6400,  1200, 'artificial'),
  ('Sandgerðisvöllur',      'Sandgerði',        64.0370, -22.7100,   500, 'artificial'),
  ('Ólafsfjarðarvöllur',    'Ólafsfjörður',     66.0730, -18.6560,   500, 'artificial'),
  ('Augnabliksvöllur',      'Kópavogur',        64.1000, -21.8680,   500, 'artificial'),
  ('Grundarfjarðarvöllur',  'Grundarfjörður',   64.9260, -23.2580,   400, 'artificial'),
  ('ÍH-völlur',             'Hafnarfjörður',    64.0650, -21.9620,   500, 'artificial'),
  ('KFK-völlur',            'Kópavogur',        64.1060, -21.8900,   500, 'artificial'),
  ('Árborgsvöllur',         'Selfoss',          63.9340, -21.0020,   800, 'artificial'),
  ('Stykkishólmsvöllur',    'Stykkishólmur',    65.0750, -22.7300,   400, 'artificial'),
  ('Sindri-völlur',         'Fjarðabyggð',      65.0316, -13.8197,   600, 'artificial'),
  ('Melavöllur',            'Akureyri',         65.6790, -18.0920,  3200, 'artificial');

-- ============================================================
-- TEAMS (48 clubs)
-- ============================================================
INSERT INTO public.teams (name, short_name, city) VALUES
  -- Besta deild (1-12)
  ('Víkingur Reykjavík',    'Víkingur R',       'Reykjavík'),
  ('Breiðablik',            'Breiðablik',       'Kópavogur'),
  ('Valur',                 'Valur',            'Reykjavík'),
  ('Stjarnan',              'Stjarnan',         'Garðabær'),
  ('FH Hafnarfjörður',      'FH',              'Hafnarfjörður'),
  ('KR Reykjavík',          'KR',              'Reykjavík'),
  ('Fram Reykjavík',        'Fram',            'Reykjavík'),
  ('ÍA Akranes',            'ÍA',              'Akranes'),
  ('ÍBV Vestmannaeyjar',    'ÍBV',             'Vestmannaeyjar'),
  ('KA Akureyri',           'KA',              'Akureyri'),
  ('Vestri',                'Vestri',           'Ísafjörður'),
  ('Afturelding',           'Afturelding',      'Mosfellsbær'),
  -- 1. deild (13-24)
  ('Þór Akureyri',          'Þór',             'Akureyri'),
  ('Fylkir',                'Fylkir',           'Reykjavík'),
  ('HK Kópavogur',          'HK',              'Kópavogur'),
  ('Keflavík',              'Keflavík',         'Keflavík'),
  ('Grindavík',             'Grindavík',        'Grindavík'),
  ('Leiknir Reykjavík',     'Leiknir R',        'Reykjavík'),
  ('Þróttur Reykjavík',     'Þróttur R',        'Reykjavík'),
  ('UMF Selfoss',           'Selfoss',          'Selfoss'),
  ('Völsungur',             'Völsungur',        'Húsavík'),
  ('Njarðvík',              'Njarðvík',         'Njarðvík'),
  ('ÍR Reykjavík',          'ÍR',              'Álftanes'),
  ('Fjölnir',               'Fjölnir',          'Reykjavík'),
  -- 2. deild (25-36)
  ('Grótta',                'Grótta',           'Seltjarnarnes'),
  ('Dalvík/Reynir',         'Dalvík/Reynir',    'Dalvík'),
  ('KFG Garðabær',          'KFG',             'Garðabær'),
  ('Haukar',                'Haukar',           'Hafnarfjörður'),
  ('Þróttur Vogar',         'Þróttur V',        'Vogar'),
  ('Kormákur/Hvöt',         'Kormákur',         'Reykjavík'),
  ('Víkingur Ólafsvík',     'Víkingur Ó',       'Ólafsvík'),
  ('Kári',                  'Kári',             'Kópavogur'),
  ('KFA Austfjarða',        'KFA',             'Eskifjörður'),
  ('Víðir',                 'Víðir',            'Garður'),
  ('Ægir',                  'Ægir',             'Reyðarfjörður'),
  ('Huginn',                'Huginn',           'Seyðisfjörður'),
  -- 3. deild (37-48)
  ('Hvíti Riddarinn',       'Hvíti R',          'Kópavogur'),
  ('Magni',                 'Magni',            'Grenivík'),
  ('Leiknir Fáskrúðsf.',    'Leiknir F',        'Fáskrúðsfjörður'),
  ('Tindastóll',            'Tindastóll',       'Sauðárkrókur'),
  ('Reynir Sandgerði',      'Reynir S',         'Sandgerði'),
  ('KF Fjallabyggð',        'KF',              'Ólafsfjörður'),
  ('Augnablik',             'Augnablik',        'Kópavogur'),
  ('Grundarfjörður',        'Grundarfj.',       'Grundarfjörður'),
  ('ÍH Hafnarfjörður',      'ÍH',              'Hafnarfjörður'),
  ('KFK Kópavogur',         'KFK',             'Kópavogur'),
  ('Árborg',                'Árborg',           'Selfoss'),
  ('Snæfellsnes/ÍF',        'Snæfellsnes',      'Stykkishólmur');

-- ============================================================
-- TEAM_SEASONS (2025 season — maps team → division + ground)
-- Ground IDs reference the insert order above
-- ============================================================
INSERT INTO public.team_seasons (team_id, season, division, ground_id) VALUES
  -- Besta deild (division 1)
  (1,  2025, 1, 1),   -- Víkingur R @ Víkingsvöllur
  (2,  2025, 1, 2),   -- Breiðablik @ Kópavogsvöllur
  (3,  2025, 1, 3),   -- Valur @ Vodafonevöllurinn
  (4,  2025, 1, 4),   -- Stjarnan @ Samsung völlurinn
  (5,  2025, 1, 5),   -- FH @ Kaplakriki
  (6,  2025, 1, 6),   -- KR @ KR-völlur
  (7,  2025, 1, 7),   -- Fram @ Laugardalsvöllur
  (8,  2025, 1, 8),   -- ÍA @ Þórólfsvöllur
  (9,  2025, 1, 9),   -- ÍBV @ Hasteinsvöllur
  (10, 2025, 1, 10),  -- KA @ Akureyrarvöllur
  (11, 2025, 1, 11),  -- Vestri @ Torfnesvöllur
  (12, 2025, 1, 12),  -- Afturelding @ Mosfellsvöllur
  -- 1. deild (division 2)
  (13, 2025, 2, 13),  -- Þór @ Þórsárvöllur
  (14, 2025, 2, 14),  -- Fylkir @ Fylkisvöllur
  (15, 2025, 2, 2),   -- HK @ Kópavogsvöllur (shared)
  (16, 2025, 2, 15),  -- Keflavík @ Nettóvöllurinn
  (17, 2025, 2, 16),  -- Grindavík @ Grindavíkurvöllur
  (18, 2025, 2, 17),  -- Leiknir R @ Leiknishæð
  (19, 2025, 2, 18),  -- Þróttur R @ Þróttarvöllurinn
  (20, 2025, 2, 19),  -- Selfoss @ Selfossvöllur
  (21, 2025, 2, 20),  -- Völsungur @ Húsavíkurvöllur
  (22, 2025, 2, 21),  -- Njarðvík @ Njarðvíkurvöllur
  (23, 2025, 2, 22),  -- ÍR @ Álftanesvöllur
  (24, 2025, 2, 23),  -- Fjölnir @ Fjölnisvöllur
  -- 2. deild (division 3)
  (25, 2025, 3, 24),  -- Grótta @ Seltjarnarnesvöllur
  (26, 2025, 3, 25),  -- Dalvík/Reynir @ Dalvíkurvöllur
  (27, 2025, 3, 26),  -- KFG @ Linnetsvöllur
  (28, 2025, 3, 27),  -- Haukar @ Ásvallalaug
  (29, 2025, 3, 28),  -- Þróttur V @ Vogavöllur
  (30, 2025, 3, 29),  -- Kormákur @ Kornavöllur
  (31, 2025, 3, 30),  -- Víkingur Ó @ Ólafsvíkurvöllur
  (32, 2025, 3, 2),   -- Kári @ Kópavogsvöllur (shared)
  (33, 2025, 3, 31),  -- KFA @ Eskifjarðarvöllur
  (34, 2025, 3, 32),  -- Víðir @ Víðisvöllur
  (35, 2025, 3, 33),  -- Ægir @ Ægisvöllur
  (36, 2025, 3, 34),  -- Huginn @ Huginnsvöllur
  -- 3. deild (division 4)
  (37, 2025, 4, 35),  -- Hvíti R @ HR-völlur
  (38, 2025, 4, 36),  -- Magni @ Grenivíkurvöllur
  (39, 2025, 4, 37),  -- Leiknir F @ Leiknisv. Fáskrúðsf.
  (40, 2025, 4, 38),  -- Tindastóll @ Tindastólsvöllur
  (41, 2025, 4, 39),  -- Reynir S @ Sandgerðisvöllur
  (42, 2025, 4, 40),  -- KF @ Ólafsfjarðarvöllur
  (43, 2025, 4, 41),  -- Augnablik @ Augnabliksvöllur
  (44, 2025, 4, 42),  -- Grundarfj. @ Grundarfjarðarvöllur
  (45, 2025, 4, 43),  -- ÍH @ ÍH-völlur
  (46, 2025, 4, 44),  -- KFK @ KFK-völlur
  (47, 2025, 4, 45),  -- Árborg @ Árborgsvöllur
  (48, 2025, 4, 46);  -- Snæfellsnes @ Stykkishólmsvöllur
