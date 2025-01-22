-- Enable RLS on agents table
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to view agent data
CREATE POLICY "Anyone can view agent data"
    ON agents FOR SELECT
    USING (true);

-- Only admins can insert/update agent data
CREATE POLICY "Only admins can manage agents"
    ON agents FOR ALL
    USING (
        auth.uid() IN (
            SELECT id FROM agents WHERE role = 'admin'
        )
    ); 