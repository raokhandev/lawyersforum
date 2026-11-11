-- An article can now belong to several areas of law: move from articles.practice_area_id to a link table.
CREATE TABLE IF NOT EXISTS article_practice_areas (
  article_id INT NOT NULL,
  practice_area_id INT NOT NULL,
  PRIMARY KEY (article_id, practice_area_id),
  KEY idx_apa_practice_area (practice_area_id),
  CONSTRAINT fk_apa_article FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE,
  CONSTRAINT fk_apa_practice_area FOREIGN KEY (practice_area_id) REFERENCES practice_areas(id) ON DELETE CASCADE
) ENGINE=InnoDB;

INSERT IGNORE INTO article_practice_areas (article_id, practice_area_id)
  SELECT id, practice_area_id FROM articles WHERE practice_area_id IS NOT NULL;

ALTER TABLE articles DROP FOREIGN KEY fk_articles_practice_area;
ALTER TABLE articles DROP COLUMN practice_area_id;
