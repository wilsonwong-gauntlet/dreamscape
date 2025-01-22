-- Add INSERT policy for agents
CREATE POLICY "Agents can create tickets"
    ON tickets FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
        )
    ); 