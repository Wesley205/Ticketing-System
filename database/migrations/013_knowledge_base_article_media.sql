CREATE TABLE IF NOT EXISTS knowledge_base_article_media (
    media_id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES knowledge_base_articles(article_id) ON DELETE CASCADE,
    uploaded_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    file_name VARCHAR(180) NOT NULL,
    storage_key VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    file_size_bytes INTEGER NOT NULL DEFAULT 0,
    caption TEXT,
    alt_text TEXT NOT NULL,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ,
    CONSTRAINT chk_kb_article_media_mime
        CHECK (mime_type IN ('image/jpeg', 'image/png', 'image/webp')),
    CONSTRAINT chk_kb_article_media_file_size
        CHECK (file_size_bytes > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kb_article_media_storage_key
    ON knowledge_base_article_media(storage_key);

CREATE INDEX IF NOT EXISTS idx_kb_article_media_article_order
    ON knowledge_base_article_media(article_id, sort_order, created_at)
    WHERE deleted_at IS NULL;
