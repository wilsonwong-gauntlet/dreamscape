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