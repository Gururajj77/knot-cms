-- When 1, in-place sync updates linked slugs only and does not remove Framer rows missing from Notion.
ALTER TABLE projects ADD COLUMN preserve_unlinked_framer_rows INTEGER NOT NULL DEFAULT 0;
