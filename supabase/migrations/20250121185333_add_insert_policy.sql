-- Add UPDATE policies for tickets
CREATE POLICY "Agents can update tickets"
    ON tickets FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM agents WHERE 
            -- Agent is assigned to the ticket
            id = tickets.assigned_agent_id
            -- Or agent is in the team assigned to the ticket
            OR team_id = tickets.team_id
        )
    );

-- Add INSERT policies for tickets
CREATE POLICY "Agents can create tickets"
    ON tickets FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT id FROM agents)
    );

-- Add DELETE policies for tickets (optional, based on your requirements)
CREATE POLICY "Agents can delete tickets"
    ON tickets FOR DELETE
    USING (
        auth.uid() IN (
            SELECT id FROM agents WHERE 
            -- Agent is assigned to the ticket
            id = tickets.assigned_agent_id
            -- Or agent is in the team assigned to the ticket
            OR team_id = tickets.team_id
        )
    ); 