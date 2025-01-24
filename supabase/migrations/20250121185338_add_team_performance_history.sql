-- Create team performance history table
CREATE TABLE IF NOT EXISTS team_performance_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
    period_start TIMESTAMP WITH TIME ZONE NOT NULL,
    period_end TIMESTAMP WITH TIME ZONE NOT NULL,
    metrics JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure we don't have overlapping periods for the same team
    CONSTRAINT unique_team_period UNIQUE (team_id, period_start, period_end),
    -- Ensure period_end is after period_start
    CONSTRAINT valid_period CHECK (period_end > period_start)
);

-- Create indexes for common queries
CREATE INDEX idx_team_performance_history_team_id ON team_performance_history(team_id);
CREATE INDEX idx_team_performance_history_period ON team_performance_history(period_start, period_end);

-- Create performance goals table
CREATE TABLE IF NOT EXISTS performance_goals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    metric_name TEXT NOT NULL,
    target_value FLOAT NOT NULL,
    warning_threshold FLOAT NOT NULL,
    critical_threshold FLOAT NOT NULL,
    period TEXT NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

    -- Ensure end_date is after start_date
    CONSTRAINT valid_goal_period CHECK (end_date > start_date),
    -- Ensure thresholds make sense
    CONSTRAINT valid_thresholds CHECK (
        critical_threshold <= warning_threshold AND
        warning_threshold <= target_value
    )
);

-- Create index for active goals
CREATE INDEX idx_performance_goals_active ON performance_goals(start_date, end_date);

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_performance_goals_updated_at
    BEFORE UPDATE ON performance_goals
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();