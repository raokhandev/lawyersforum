-- Allow longer summaries so the About Us card is filled.
ALTER TABLE authors MODIFY COLUMN summary VARCHAR(700) NOT NULL DEFAULT '';
