-- Create function to increment article views
CREATE OR REPLACE FUNCTION increment_article_views(article_id UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE kb_articles
  SET view_count = view_count + 1
  WHERE id = article_id;
END;
$$;

-- Create function to increment counters
CREATE OR REPLACE FUNCTION increment()
RETURNS integer
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN 1;
END;
$$;

-- Add policy to allow the increment_article_views function to update articles
CREATE POLICY "Allow increment_article_views to update view count"
    ON kb_articles
    FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Add policy to allow anyone to update view count
CREATE POLICY "Anyone can update view count"
    ON kb_articles
    FOR UPDATE
    USING (true)
    WITH CHECK (true); 