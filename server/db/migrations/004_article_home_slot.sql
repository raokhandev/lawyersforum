-- Lets the admin pin an article to a position on the home page main section.
-- Slots: featured, left1, left2, bottom1, bottom2, bottom3. UNIQUE allows many NULLs (unpinned).
ALTER TABLE articles ADD COLUMN home_slot VARCHAR(20) NULL, ADD UNIQUE KEY uq_articles_home_slot (home_slot);
