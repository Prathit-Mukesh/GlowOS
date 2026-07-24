-- =============================================================================
-- Seed: a handful of curated products per module/budget tier.
-- These are the ONLY products the AI is ever allowed to reference (by id).
-- Founder-managed via /admin in production. URLs are placeholders.
-- =============================================================================
insert into public.products (module, name, budget_tier, url, evidence_note, active) values
  ('skin',  'Gentle daily gel cleanser',      't500',  'https://example.com/p/cleanser-basic', 'Fragrance-free cleansers reduce irritation. Evidence: strong.', true),
  ('skin',  'Broad-spectrum SPF 50 sunscreen','t500',  'https://example.com/p/spf50',          'Daily sunscreen is the single best-evidenced skin habit. Evidence: strong.', true),
  ('skin',  'Ceramide moisturiser',           't1500', 'https://example.com/p/ceramide-moist', 'Ceramides support the skin barrier. Evidence: moderate.', true),
  ('body',  'Resistance band set',            't500',  'https://example.com/p/bands',          'Resistance training builds strength at home. Evidence: strong.', true),
  ('body',  'Adjustable dumbbells',           't5000', 'https://example.com/p/dumbbells',      'Progressive overload drives strength gains. Evidence: strong.', true),
  ('style', 'Wrinkle-release fabric spray',   't500',  'https://example.com/p/fabric-spray',   'Crisp clothes read as put-together. Evidence: practical.', true),
  ('mind',  'Guided-breathing pocket card',   't500',  'https://example.com/p/breath-card',    'Slow breathing lowers acute stress. Evidence: moderate.', true),
  ('voice', 'Clip-on lapel microphone',       't1500', 'https://example.com/p/lapel-mic',      'Clear audio helps you hear your own pace. Evidence: practical.', true)
on conflict do nothing;
