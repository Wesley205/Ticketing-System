-- Canonical first-release ticket taxonomy.
-- Existing historical values remain valid; new submissions should use canonical values.
ALTER TABLE service_requests
  DROP CONSTRAINT IF EXISTS service_requests_category_check;

ALTER TABLE service_requests
  DROP CONSTRAINT IF EXISTS chk_service_requests_category;

ALTER TABLE service_requests
  ADD CONSTRAINT chk_service_requests_category CHECK (category IN (
    'Account Access', 'Computer', 'Network', 'Printing', 'Software', 'Email',
    'Security', 'Phone and Calls', 'Other',
    'Printer', 'Internet', 'Hardware', 'Access', 'Infrastructure', 'Telecommunications'
  ));

UPDATE service_catalog_items
SET category = CASE category
  WHEN 'Access' THEN 'Account Access'
  WHEN 'Hardware' THEN 'Computer'
  WHEN 'Telecommunications' THEN 'Phone and Calls'
  WHEN 'Internet' THEN 'Network'
  ELSE category
END,
updated_at = NOW()
WHERE category IN ('Access', 'Hardware', 'Telecommunications', 'Internet');

CREATE INDEX IF NOT EXISTS idx_service_requests_canonical_category
  ON service_requests(category, subcategory);
