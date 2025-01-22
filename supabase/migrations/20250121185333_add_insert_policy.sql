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

-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Allow customers to view their own data
CREATE POLICY "Users can view own customer profile"
    ON customers FOR SELECT
    USING (auth.uid() = id);

-- Create a function to handle new user signups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.customers (id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to automatically create customer profiles
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user(); 