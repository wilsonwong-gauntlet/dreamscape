-- Add new columns to teams table
ALTER TABLE teams
    ADD COLUMN time_zone TEXT NOT NULL DEFAULT 'UTC',
    ADD COLUMN focus_areas TEXT[] DEFAULT '{}',
    ADD COLUMN max_capacity INTEGER,
    ADD COLUMN operating_hours JSONB DEFAULT '{
        "monday": {"start": "09:00", "end": "17:00"},
        "tuesday": {"start": "09:00", "end": "17:00"},
        "wednesday": {"start": "09:00", "end": "17:00"},
        "thursday": {"start": "09:00", "end": "17:00"},
        "friday": {"start": "09:00", "end": "17:00"},
        "saturday": null,
        "sunday": null
    }'::jsonb,
    ADD COLUMN is_backup BOOLEAN DEFAULT false;

-- Add indexes for common queries
CREATE INDEX idx_teams_focus_areas ON teams USING gin(focus_areas);
CREATE INDEX idx_teams_time_zone ON teams(time_zone);

-- Add RLS policies for teams
ALTER TABLE teams ENABLE ROW LEVEL SECURITY;

-- Agents can view all teams
CREATE POLICY "Agents can view teams"
    ON teams FOR SELECT
    USING (auth.uid() IN (SELECT id FROM agents));

-- Only admin agents can modify teams
CREATE POLICY "Admin agents can modify teams"
    ON teams FOR ALL
    USING (auth.uid() IN (SELECT id FROM agents WHERE role = 'admin'))
    WITH CHECK (auth.uid() IN (SELECT id FROM agents WHERE role = 'admin')); 