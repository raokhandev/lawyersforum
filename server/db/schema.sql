-- The database is created and selected by src/setupDb.js (uses DB_NAME).

CREATE TABLE IF NOT EXISTS authors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  title VARCHAR(150) NOT NULL DEFAULT '',
  practice_area VARCHAR(150) NOT NULL DEFAULT '',
  summary VARCHAR(700) NOT NULL DEFAULT '',
  description TEXT,
  email VARCHAR(190) NOT NULL DEFAULT '',
  photo_url VARCHAR(500) NOT NULL DEFAULT '',
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

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

CREATE TABLE IF NOT EXISTS articles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  summary VARCHAR(500) NOT NULL DEFAULT '',
  image_url VARCHAR(500) NOT NULL DEFAULT '',
  tile_image_url VARCHAR(500) NOT NULL DEFAULT '',
  content MEDIUMTEXT NOT NULL,
  author_id INT NULL,
  home_slot VARCHAR(20) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_articles_home_slot (home_slot),
  CONSTRAINT fk_articles_author FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE SET NULL
) ENGINE=InnoDB;

-- The areas of law each article belongs to (an article can have several).
CREATE TABLE IF NOT EXISTS article_practice_areas (
  article_id INT NOT NULL,
  practice_area_id INT NOT NULL,
  PRIMARY KEY (article_id, practice_area_id),
  KEY idx_apa_practice_area (practice_area_id),
  CONSTRAINT fk_apa_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_apa_practice_area FOREIGN KEY (practice_area_id) REFERENCES practice_areas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

-- Jurisdictions (UK and England and Wales are pinned to the top by sort_order; the rest are alphabetical).
CREATE TABLE IF NOT EXISTS jurisdictions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  sort_order INT NOT NULL DEFAULT 100,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_jurisdictions_name (name),
  UNIQUE KEY uq_jurisdictions_slug (slug)
) ENGINE=InnoDB;

INSERT IGNORE INTO jurisdictions (name, slug, sort_order) VALUES
  ('UK', 'uk', 1),
  ('England and Wales', 'england-and-wales', 2),
  ('Bangladesh', 'bangladesh', 100),
  ('Canada', 'canada', 100),
  ('Europe', 'europe', 100),
  ('India', 'india', 100),
  ('Middle East', 'middle-east', 100),
  ('Northern Ireland', 'northern-ireland', 100),
  ('Pakistan', 'pakistan', 100),
  ('Republic of Ireland', 'republic-of-ireland', 100),
  ('Saudi Arabia', 'saudi-arabia', 100),
  ('Scotland', 'scotland', 100),
  ('USA', 'usa', 100);

CREATE TABLE IF NOT EXISTS article_jurisdictions (
  article_id INT NOT NULL,
  jurisdiction_id INT NOT NULL,
  PRIMARY KEY (article_id, jurisdiction_id),
  KEY idx_aj_jurisdiction (jurisdiction_id),
  CONSTRAINT fk_aj_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_aj_jurisdiction FOREIGN KEY (jurisdiction_id) REFERENCES jurisdictions(id) ON DELETE CASCADE
) ENGINE=InnoDB;
