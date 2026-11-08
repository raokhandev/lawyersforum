-- Allow longer summaries so the About Us card can be filled.
ALTER TABLE authors MODIFY COLUMN summary VARCHAR(500) NOT NULL DEFAULT '';
