-- Drop existing objects
DROP TABLE IF EXISTS kb_articles CASCADE;
DROP TABLE IF EXISTS kb_categories CASCADE;
DROP TYPE IF EXISTS article_status CASCADE;
DROP FUNCTION IF EXISTS generate_unique_slug CASCADE;
DROP FUNCTION IF EXISTS set_article_slug CASCADE;
DROP FUNCTION IF EXISTS match_kb_articles CASCADE;

-- Enable vector extension first
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum for article status
CREATE TYPE article_status AS ENUM ('draft', 'published', 'archived');

-- Create categories table
CREATE TABLE kb_categories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    description TEXT,
    parent_id UUID REFERENCES kb_categories(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create articles table
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    slug TEXT UNIQUE,
    content TEXT NOT NULL,
    category_id UUID REFERENCES kb_categories(id),
    status article_status DEFAULT 'draft',
    author_id UUID,
    content_vector vector(1536), -- For OpenAI embeddings
    view_count INTEGER DEFAULT 0,
    helpful_count INTEGER DEFAULT 0,
    not_helpful_count INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Add RLS to categories
ALTER TABLE kb_categories ENABLE ROW LEVEL SECURITY;

-- Update RLS policies for kb_categories
DROP POLICY IF EXISTS "Categories are viewable by all" ON kb_categories;
DROP POLICY IF EXISTS "Authenticated users can manage categories" ON kb_categories;

-- Everyone can view categories
CREATE POLICY "Categories are viewable by all"
    ON kb_categories FOR SELECT
    USING (true);

-- Only authenticated users can manage categories
CREATE POLICY "Authenticated users can manage categories"
    ON kb_categories FOR INSERT
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update categories"
    ON kb_categories FOR UPDATE
    USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete categories"
    ON kb_categories FOR DELETE
    USING (auth.role() = 'authenticated');

-- Add RLS to articles
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;

-- Create function to generate slug
CREATE OR REPLACE FUNCTION generate_unique_slug(title TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    new_slug TEXT;
    counter INTEGER := 1;
BEGIN
    -- Convert title to lowercase and replace spaces/special chars with hyphens
    base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9]+', '-', 'g'));
    -- Remove leading/trailing hyphens
    base_slug := trim(both '-' from base_slug);
    
    new_slug := base_slug;
    -- Check if slug exists and append number if needed
    WHILE EXISTS (SELECT 1 FROM kb_articles WHERE slug = new_slug) LOOP
        counter := counter + 1;
        new_slug := base_slug || '-' || counter::text;
    END LOOP;
    
    RETURN new_slug;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically generate slug
CREATE OR REPLACE FUNCTION set_article_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL THEN
        NEW.slug := generate_unique_slug(NEW.title);
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_article_slug
    BEFORE INSERT OR UPDATE ON kb_articles
    FOR EACH ROW
    EXECUTE FUNCTION set_article_slug();

-- Update RLS policies for kb_articles

-- Everyone can view published articles
CREATE POLICY "Published articles are viewable by all"
    ON kb_articles FOR SELECT
    USING (status = 'published');

-- Authenticated users can view all articles
CREATE POLICY "Authenticated users can view all articles"
    ON kb_articles FOR SELECT
    USING (auth.role() = 'authenticated');

-- Only authenticated users can manage articles
CREATE POLICY "Authenticated users can manage articles"
    ON kb_articles FOR ALL
    USING (auth.role() = 'authenticated');

-- Create indexes
CREATE INDEX idx_kb_articles_category ON kb_articles(category_id);
CREATE INDEX idx_kb_articles_status ON kb_articles(status);
CREATE INDEX idx_kb_articles_slug ON kb_articles(slug);
CREATE INDEX idx_kb_categories_slug ON kb_categories(slug);

-- Create vector similarity search function
CREATE OR REPLACE FUNCTION match_kb_articles(
    query_embedding vector(1536),
    similarity_threshold float,
    match_count int
)
RETURNS TABLE (
    id uuid,
    title text,
    content text,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        kb_articles.id,
        kb_articles.title,
        kb_articles.content,
        1 - (kb_articles.content_vector <=> query_embedding) as similarity
    FROM kb_articles
    WHERE 1 - (kb_articles.content_vector <=> query_embedding) > similarity_threshold
        AND status = 'published'
    ORDER BY similarity DESC
    LIMIT match_count;
END;
$$; 