-- Add satisfaction score to tickets
ALTER TABLE tickets
ADD COLUMN satisfaction_score INTEGER CHECK (satisfaction_score >= 1 AND satisfaction_score <= 5);

-- Add index for performance
CREATE INDEX idx_tickets_satisfaction ON tickets(satisfaction_score);

-- Update team metrics view to include satisfaction metrics
CREATE OR REPLACE VIEW team_metrics AS
SELECT 
  t.id as team_id,
  t.name as team_name,
  COUNT(tk.id) as total_tickets,
  COUNT(CASE WHEN tk.status = 'resolved' THEN 1 END) as resolved_tickets,
  ROUND(AVG(tk.satisfaction_score)::numeric, 2) as avg_satisfaction,
  COUNT(tk.satisfaction_score) as satisfaction_responses
FROM teams t
LEFT JOIN tickets tk ON tk.team_id = t.id
GROUP BY t.id, t.name; 