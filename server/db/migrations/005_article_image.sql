-- Optional image for each article.
ALTER TABLE articles ADD COLUMN image_url VARCHAR(500) NOT NULL DEFAULT '' AFTER summary;
