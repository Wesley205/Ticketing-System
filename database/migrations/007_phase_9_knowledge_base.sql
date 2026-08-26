ALTER TABLE knowledge_base_articles
    ADD COLUMN IF NOT EXISTS category VARCHAR(80) NOT NULL DEFAULT 'General',
    ADD COLUMN IF NOT EXISTS visibility_scope VARCHAR(30) NOT NULL DEFAULT 'all_users',
    ADD COLUMN IF NOT EXISTS department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS current_revision_number INTEGER NOT NULL DEFAULT 1,
    ADD COLUMN IF NOT EXISTS last_reviewed_at TIMESTAMP,
    ADD COLUMN IF NOT EXISTS search_keywords TEXT,
    ADD COLUMN IF NOT EXISTS usefulness_score INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS helpful_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS not_helpful_count INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS view_count INTEGER NOT NULL DEFAULT 0;

ALTER TABLE knowledge_base_articles
    DROP CONSTRAINT IF EXISTS chk_knowledge_base_visibility_scope;

ALTER TABLE knowledge_base_articles
    ADD CONSTRAINT chk_knowledge_base_visibility_scope
    CHECK (visibility_scope IN ('all_users','department','operational_only'));

CREATE INDEX IF NOT EXISTS idx_knowledge_base_category_status
    ON knowledge_base_articles(category, status, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_visibility_status
    ON knowledge_base_articles(visibility_scope, status, department_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_title_search
    ON knowledge_base_articles USING GIN (
        to_tsvector('simple', COALESCE(title, '') || ' ' || COALESCE(summary, '') || ' ' || COALESCE(body, '') || ' ' || COALESCE(search_keywords, ''))
    );

CREATE TABLE IF NOT EXISTS knowledge_base_article_revisions (
    revision_id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES knowledge_base_articles(article_id) ON DELETE CASCADE,
    revision_number INTEGER NOT NULL,
    title VARCHAR(200) NOT NULL,
    summary TEXT,
    body TEXT NOT NULL,
    category VARCHAR(80) NOT NULL,
    visibility_scope VARCHAR(30) NOT NULL,
    department_id INTEGER REFERENCES departments(department_id) ON DELETE SET NULL,
    search_keywords TEXT,
    change_note TEXT,
    changed_by_user_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_kb_revision_nonblank_title CHECK (BTRIM(title) <> ''),
    CONSTRAINT chk_kb_revision_nonblank_body CHECK (BTRIM(body) <> '')
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_kb_article_revision_number
    ON knowledge_base_article_revisions(article_id, revision_number);
CREATE INDEX IF NOT EXISTS idx_kb_revisions_article_created
    ON knowledge_base_article_revisions(article_id, created_at DESC);

CREATE TABLE IF NOT EXISTS knowledge_base_article_relations (
    relation_id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES knowledge_base_articles(article_id) ON DELETE CASCADE,
    relation_type VARCHAR(30) NOT NULL,
    asset_id INTEGER REFERENCES assets(asset_id) ON DELETE CASCADE,
    asset_type VARCHAR(50),
    ticket_category VARCHAR(30),
    ticket_subcategory VARCHAR(100),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_kb_relation_type CHECK (
        relation_type IN ('asset','asset_type','ticket_category')
    ),
    CONSTRAINT chk_kb_relation_payload CHECK (
        (relation_type = 'asset' AND asset_id IS NOT NULL)
        OR (relation_type = 'asset_type' AND asset_type IS NOT NULL)
        OR (relation_type = 'ticket_category' AND ticket_category IS NOT NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_kb_relations_article_type
    ON knowledge_base_article_relations(article_id, relation_type);
CREATE INDEX IF NOT EXISTS idx_kb_relations_ticket_category
    ON knowledge_base_article_relations(ticket_category, ticket_subcategory);
CREATE INDEX IF NOT EXISTS idx_kb_relations_asset_type
    ON knowledge_base_article_relations(asset_type);

CREATE TABLE IF NOT EXISTS knowledge_base_article_feedback (
    feedback_id SERIAL PRIMARY KEY,
    article_id INTEGER NOT NULL REFERENCES knowledge_base_articles(article_id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    request_id INTEGER REFERENCES service_requests(request_id) ON DELETE SET NULL,
    is_helpful BOOLEAN NOT NULL,
    feedback_note TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kb_feedback_article_created
    ON knowledge_base_article_feedback(article_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_kb_feedback_article_helpful
    ON knowledge_base_article_feedback(article_id, is_helpful);

INSERT INTO knowledge_base_article_revisions (
    article_id,
    revision_number,
    title,
    summary,
    body,
    category,
    visibility_scope,
    department_id,
    search_keywords,
    change_note,
    changed_by_user_id,
    created_at
)
SELECT
    article_id,
    1,
    title,
    summary,
    body,
    category,
    visibility_scope,
    department_id,
    search_keywords,
    'Backfilled initial revision during Phase 9 migration',
    created_by_user_id,
    created_at
FROM knowledge_base_articles article
WHERE NOT EXISTS (
    SELECT 1
    FROM knowledge_base_article_revisions revision
    WHERE revision.article_id = article.article_id
      AND revision.revision_number = 1
);
