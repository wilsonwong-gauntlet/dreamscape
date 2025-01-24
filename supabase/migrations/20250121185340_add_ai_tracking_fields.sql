-- Add AI tracking fields to tickets table
ALTER TABLE tickets 
ADD COLUMN ai_suggested_response BOOLEAN DEFAULT FALSE,
ADD COLUMN ai_response_used BOOLEAN DEFAULT FALSE,
ADD COLUMN ai_confidence_score FLOAT,
ADD COLUMN ai_interaction_count INTEGER DEFAULT 0;

---- Create index for common queries
CREATE INDEX idx_tickets_ai_metrics ON tickets(ai_suggested_response, ai_response_used);

-- Down migration
-- DROP INDEX IF EXISTS idx_tickets_ai_metrics;
-- ALTER TABLE tickets 
-- DROP COLUMN ai_suggested_response,
-- DROP COLUMN ai_response_used,
-- DROP COLUMN ai_confidence_score,
-- DROP COLUMN ai_interaction_count; 