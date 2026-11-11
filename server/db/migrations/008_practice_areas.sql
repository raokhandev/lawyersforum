-- Areas of law (practice areas). Each article belongs to one; the site menu lists them and each has its own page.
CREATE TABLE IF NOT EXISTS practice_areas (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_practice_areas_name (name),
  UNIQUE KEY uq_practice_areas_slug (slug)
) ENGINE=InnoDB;

INSERT IGNORE INTO practice_areas (name, slug) VALUES
  ('Civil Litigation', 'civil-litigation'),
  ('Commercial and Residential Property', 'commercial-and-residential-property'),
  ('Driving Offences', 'driving-offences'),
  ('Employment', 'employment'),
  ('Landlord and Tenant', 'landlord-and-tenant'),
  ('Personal Injury', 'personal-injury'),
  ('Private and Business Immigration', 'private-and-business-immigration'),
  ('Wills and Probate', 'wills-and-probate');

ALTER TABLE articles
  ADD COLUMN practice_area_id INT NULL AFTER author_id,
  ADD CONSTRAINT fk_articles_practice_area FOREIGN KEY (practice_area_id) REFERENCES practice_areas(id) ON DELETE SET NULL;
