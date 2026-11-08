-- Split authors.bio into a short summary (About Us card) and a long description (author page).
ALTER TABLE authors
  CHANGE COLUMN bio description TEXT,
  ADD COLUMN summary VARCHAR(200) NOT NULL DEFAULT '' AFTER practice_area;
UPDATE authors SET summary = LEFT(COALESCE(description, ''), 200);
