-- Jurisdictions: like areas of law, each article can belong to several, the site menu lists them and each has a page.
-- sort_order pins UK and England and Wales to the top of the menu; everything else (sort_order 100) is alphabetical.
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
  ('Europe', 'europe', 100),
  ('India', 'india', 100),
  ('Northern Ireland', 'northern-ireland', 100),
  ('Pakistan', 'pakistan', 100),
  ('Republic of Ireland', 'republic-of-ireland', 100),
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
