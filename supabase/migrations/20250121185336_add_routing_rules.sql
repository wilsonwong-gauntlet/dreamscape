-- Create enum for rule action types
CREATE TYPE rule_action_type AS ENUM ('assign_team', 'assign_agent');

-- Create routing rules table
CREATE TABLE routing_rules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    team_id UUID REFERENCES teams(id),
    is_active BOOLEAN DEFAULT true,
    priority INTEGER NOT NULL, -- Lower number = higher priority
    conditions JSONB NOT NULL, -- Array of conditions to match
    action rule_action_type NOT NULL,
    action_target UUID NOT NULL, -- Team ID or Agent ID depending on action type
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for active rules ordered by priority
CREATE INDEX idx_active_routing_rules ON routing_rules(is_active, priority) WHERE is_active = true;

-- Add RLS policies
ALTER TABLE routing_rules ENABLE ROW LEVEL SECURITY;

-- Only admins can manage routing rules
CREATE POLICY "Admins can manage routing rules"
    ON routing_rules
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
            AND agents.role = 'admin'
        )
    );

-- All agents can view routing rules
CREATE POLICY "Agents can view routing rules"
    ON routing_rules
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
        )
    );

-- Function to evaluate routing rules for a ticket
CREATE OR REPLACE FUNCTION evaluate_routing_rules(ticket_data JSONB)
RETURNS TABLE (
    rule_id UUID,
    action rule_action_type,
    action_target UUID
) AS $$
DECLARE
    rule RECORD;
    condition_met BOOLEAN;
    condition_item JSONB;
BEGIN
    -- Loop through active rules in priority order
    FOR rule IN 
        SELECT id, conditions, action, action_target
        FROM routing_rules
        WHERE is_active = true
        ORDER BY priority ASC
    LOOP
        condition_met := true;
        
        -- Check each condition in the rule
        FOR condition_item IN SELECT * FROM jsonb_array_elements(rule.conditions)
        LOOP
            -- Evaluate condition based on field, operator, and value
            -- ticket_data should contain all relevant ticket fields
            IF NOT evaluate_condition(
                ticket_data,
                condition_item->>'field',
                condition_item->>'operator',
                condition_item->>'value'
            ) THEN
                condition_met := false;
                EXIT;
            END IF;
        END LOOP;

        -- If all conditions are met, return this rule's action
        IF condition_met THEN
            RETURN QUERY SELECT rule.id, rule.action, rule.action_target;
            RETURN;
        END IF;
    END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Helper function to evaluate a single condition
CREATE OR REPLACE FUNCTION evaluate_condition(
    ticket_data JSONB,
    field TEXT,
    operator TEXT,
    value JSONB
) RETURNS BOOLEAN AS $$
DECLARE
    field_value JSONB;
BEGIN
    -- Get the field value from ticket data
    field_value := ticket_data->field;
    
    -- Handle different operator types
    CASE operator
        WHEN 'equals' THEN
            RETURN field_value = value;
        WHEN 'not_equals' THEN
            RETURN field_value != value;
        WHEN 'contains' THEN
            RETURN field_value::text LIKE '%' || value::text || '%';
        WHEN 'in' THEN
            RETURN field_value <@ value; -- Is contained by
        WHEN 'not_in' THEN
            RETURN NOT (field_value <@ value);
        WHEN 'greater_than' THEN
            RETURN (field_value::text::numeric > value::text::numeric);
        WHEN 'less_than' THEN
            RETURN (field_value::text::numeric < value::text::numeric);
        ELSE
            RETURN false;
    END CASE;
EXCEPTION
    WHEN OTHERS THEN
        -- If any error occurs during evaluation, return false
        RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE; 