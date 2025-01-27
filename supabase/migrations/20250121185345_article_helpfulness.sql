-- Create function to increment helpful count
CREATE OR REPLACE FUNCTION increment_article_helpful(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE kb_articles
  SET helpful_count = helpful_count + 1
  WHERE id = article_id;
END;
$$;

-- Create function to increment not helpful count
CREATE OR REPLACE FUNCTION increment_article_not_helpful(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE kb_articles
  SET not_helpful_count = not_helpful_count + 1
  WHERE id = article_id;
END;
$$;

-- Create table to track user feedback
CREATE TABLE kb_article_feedback (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    article_id UUID REFERENCES kb_articles(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id),
    is_helpful BOOLEAN NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Add unique constraint to prevent multiple feedback from same user
CREATE UNIQUE INDEX unique_user_article_feedback 
ON kb_article_feedback(article_id, user_id);

-- Add RLS policies
ALTER TABLE kb_article_feedback ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view their own feedback
CREATE POLICY "Users can view their own feedback"
    ON kb_article_feedback
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow authenticated users to insert feedback
CREATE POLICY "Users can submit feedback"
    ON kb_article_feedback
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Down migration
-- DROP FUNCTION IF EXISTS increment_article_helpful CASCADE;
-- DROP FUNCTION IF EXISTS increment_article_not_helpful CASCADE;
-- DROP TABLE IF EXISTS kb_article_feedback CASCADE; 