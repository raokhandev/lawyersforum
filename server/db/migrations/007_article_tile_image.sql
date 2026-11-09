-- A second article image: the background of the article tile (button). image_url stays the image at the top of the
-- article, which is also used as the link-preview (social sharing) image.
ALTER TABLE articles ADD COLUMN tile_image_url VARCHAR(500) NOT NULL DEFAULT '' AFTER image_url;
UPDATE articles SET tile_image_url = image_url;
