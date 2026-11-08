-- Lets the admin choose the order of authors on the About Us page.
ALTER TABLE authors ADD COLUMN sort_order INT NOT NULL DEFAULT 0;
SET @i := 0;
UPDATE authors SET sort_order = (@i := @i + 1) ORDER BY name;
