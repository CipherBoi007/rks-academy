-- Dev-only demo catalogue: the 12 products from the Store screenshot. Images are crops under frontend/public/demo/.

INSERT INTO product (id, brand, category, name, description, price, mrp, rating, review_count, stock, tag_label,
                     advertised, ad_placement, ad_headline, ad_highlight, ad_copy, ad_image, sort_order) VALUES
    (1,  'Yonex',   'RACKETS',      'Astrox 77 Pro', 'Head-heavy attacking racket for steep, powerful smashes. Ideal for advanced and tournament players.',
         11490.00, 13990.00, 4.8, 126, 6, '18% OFF', TRUE, 'HERO', 'SMASH HARDER', 'THIS SEASON', 'free stringing for RKS players.', '/demo/banners/hero-smash.jpg', 1),
    (2,  'Li-Ning', 'RACKETS',      'Windstorm 72', 'Ultra-light 72g frame for fast defence and quick doubles exchanges.',
         6299.00, 6999.00, 4.6, 88, 14, '10% OFF', FALSE, NULL, NULL, NULL, NULL, NULL, 2),
    (3,  'Yonex',   'RACKETS',      'Nanoray Light 18i', 'Even-balance starter racket, pre-strung. Ideal for beginners.',
         2690.00, 2990.00, 4.5, 212, 30, NULL, FALSE, NULL, NULL, NULL, NULL, NULL, 3),
    (4,  'Yonex',   'SHUTTLECOCKS', 'Mavis 350 Nylon (Tube of 6)', 'Durable nylon shuttle with feather-like flight. Used in all academy drills.',
         1150.00, 1250.00, 4.7, 540, 120, 'ACADEMY PRICE', TRUE, 'INLINE', NULL, NULL, NULL, NULL, 4),
    (5,  'Yonex',   'SHUTTLECOCKS', 'Aerosensa AS-30 Feather (12)', 'Tournament-grade goose feather shuttles for match practice.',
         3250.00, 3490.00, 4.9, 97, 40, NULL, FALSE, NULL, NULL, NULL, NULL, NULL, 5),
    (6,  'Li-Ning', 'SHOES',        'Saga Lite Court Shoe', 'Lightweight non-marking court shoe with a cushioned midsole.',
         3499.00, 4299.00, 4.4, 64, 9, '19% OFF', TRUE, 'STRIP', NULL, NULL, NULL, NULL, 6),
    (7,  'Yonex',   'SHOES',        'Power Cushion 65Z3', 'Premium court shoe with Power Cushion+ shock absorption.',
         8990.00, 10990.00, 4.8, 151, 5, '₹2,000 OFF', FALSE, NULL, NULL, NULL, NULL, NULL, 7),
    (8,  'Yonex',   'GRIPS',        'Super Grap AC102 (3 pack)', 'Tacky overgrip, 0.6mm. Three grips per pack.',
         420.00, 480.00, 4.6, 310, 60, NULL, FALSE, NULL, NULL, NULL, NULL, NULL, 8),
    (9,  'Li-Ning', 'GRIPS',        'Cotton Towel Grip', 'Absorbent towel grip for players with sweaty palms.',
         249.00, 299.00, 4.2, 45, 80, 'COMBO DEAL', FALSE, NULL, NULL, NULL, NULL, NULL, 9),
    (10, 'Yonex',   'BAGS',         'Pro Thermobag 6-in-1', 'Thermal-lined bag for six rackets, with a separate shoe compartment.',
         4890.00, 5490.00, 4.7, 73, 7, '11% OFF', FALSE, NULL, NULL, NULL, NULL, NULL, 10),
    (11, 'RKS',     'JERSEYS',      'RKS Academy Match Jersey', 'Official academy match jersey in breathable dri-fit fabric.',
         599.00, 799.00, 4.9, 186, 150, 'PLAYERS ₹599', FALSE, NULL, NULL, NULL, NULL, NULL, 11),
    (12, 'RKS',     'JERSEYS',      'RKS Training Tee + Shorts', 'Training set for daily sessions, sized for juniors and adults.',
         899.00, 1099.00, 4.6, 58, 90, NULL, FALSE, NULL, NULL, NULL, NULL, NULL, 12);
SELECT setval('product_id_seq', 12);

INSERT INTO product_image (product_id, position, url) VALUES
    (1, 0, '/demo/products/astrox-77-pro.jpg'),
    (1, 1, '/demo/products/nanoray-light-18i.jpg'),
    (1, 2, '/demo/products/cotton-towel-grip.jpg'),
    (2, 0, '/demo/products/windstorm-72.jpg'),
    (3, 0, '/demo/products/nanoray-light-18i.jpg'),
    (4, 0, '/demo/products/mavis-350.jpg'),
    (5, 0, '/demo/products/aerosensa-as-30.jpg'),
    (6, 0, '/demo/products/saga-lite.jpg'),
    (7, 0, '/demo/products/power-cushion-65z3.jpg'),
    (8, 0, '/demo/products/super-grap-ac102.jpg'),
    (9, 0, '/demo/products/cotton-towel-grip.jpg'),
    (10, 0, '/demo/products/pro-thermobag.jpg'),
    (11, 0, '/demo/products/rks-match-jersey.jpg'),
    (12, 0, '/demo/products/rks-training-tee.jpg');

INSERT INTO product_spec (product_id, position, label, value) VALUES
    (1, 0, 'Flex', 'Medium'), (1, 1, 'Frame', 'HM Graphite / Namd'), (1, 2, 'Balance', 'Head heavy'),
    (1, 3, 'Max tension', '28 lbs'),
    (2, 0, 'Weight', '72 g'), (2, 1, 'Balance', 'Even'), (2, 2, 'Flex', 'Medium'), (2, 3, 'Max tension', '30 lbs'),
    (3, 0, 'Weight', '5U (approx. 78 g)'), (3, 1, 'Balance', 'Even'), (3, 2, 'Strung', 'Yes, factory strung'),
    (4, 0, 'Type', 'Nylon'), (4, 1, 'Pack', '6 shuttles'), (4, 2, 'Cap', 'Green (slow) / Blue (medium)'),
    (5, 0, 'Type', 'Goose feather'), (5, 1, 'Pack', '12 shuttles'), (5, 2, 'Grade', 'Tournament'),
    (6, 0, 'Sole', 'Non-marking rubber'), (6, 1, 'Upper', 'Breathable mesh'), (6, 2, 'Weight', 'Approx. 290 g'),
    (7, 0, 'Cushioning', 'Power Cushion+'), (7, 1, 'Sole', 'Non-marking rubber'), (7, 2, 'Fit', 'Regular'),
    (8, 0, 'Thickness', '0.6 mm'), (8, 1, 'Pack', '3 grips'), (8, 2, 'Feel', 'Tacky'),
    (9, 0, 'Material', 'Cotton terry'), (9, 1, 'Length', '1.1 m'),
    (10, 0, 'Capacity', '6 rackets'), (10, 1, 'Compartments', '2 + shoe pocket'), (10, 2, 'Lining', 'Thermal'),
    (11, 0, 'Fabric', 'Dri-fit polyester'), (11, 1, 'Print', 'Academy crest and name'),
    (12, 0, 'Fabric', 'Polyester blend'), (12, 1, 'Set', 'Tee + shorts');

INSERT INTO product_variant (product_id, position, group_name, value) VALUES
    (1, 0, 'Weight / Grip', '4U G5'), (1, 1, 'Weight / Grip', '4U G6'), (1, 2, 'Weight / Grip', '3U G5'),
    (2, 0, 'Grip', 'S1'), (2, 1, 'Grip', 'S2'),
    (3, 0, 'Grip', 'G4'), (3, 1, 'Grip', 'G5'),
    (4, 0, 'Speed', 'Slow (green)'), (4, 1, 'Speed', 'Medium (blue)'),
    (5, 0, 'Speed', '77'), (5, 1, 'Speed', '78'),
    (6, 0, 'Size (UK)', '6'), (6, 1, 'Size (UK)', '7'), (6, 2, 'Size (UK)', '8'), (6, 3, 'Size (UK)', '9'),
    (7, 0, 'Size (UK)', '6'), (7, 1, 'Size (UK)', '7'), (7, 2, 'Size (UK)', '8'), (7, 3, 'Size (UK)', '9'),
    (8, 0, 'Colour', 'White'), (8, 1, 'Colour', 'Assorted'),
    (9, 0, 'Colour', 'Blue'), (9, 1, 'Colour', 'Black'),
    (10, 0, 'Colour', 'Green'), (10, 1, 'Colour', 'Black'),
    (11, 0, 'Size', 'XS'), (11, 1, 'Size', 'S'), (11, 2, 'Size', 'M'), (11, 3, 'Size', 'L'), (11, 4, 'Size', 'XL'),
    (12, 0, 'Size', 'XS'), (12, 1, 'Size', 'S'), (12, 2, 'Size', 'M'), (12, 3, 'Size', 'L');
