-- Create enum types for status and priority
CREATE TYPE ticket_status AS ENUM ('new', 'open', 'pending', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Teams table
CREATE TABLE teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Agents table (extends auth.users)
CREATE TABLE agents (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    team_id UUID REFERENCES teams(id),
    role TEXT NOT NULL,
    status TEXT DEFAULT 'active',
    skills TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Customers table (extends auth.users)
CREATE TABLE customers (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    external_id TEXT,
    company TEXT,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Tickets table
CREATE TABLE tickets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id),
    assigned_agent_id UUID REFERENCES agents(id),
    team_id UUID REFERENCES teams(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status ticket_status DEFAULT 'new',
    priority ticket_priority DEFAULT 'medium',
    source TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    metadata JSONB DEFAULT '{}'::jsonb,
    custom_fields JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Ticket history for audit trail
CREATE TABLE ticket_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id),
    actor_id UUID REFERENCES auth.users(id),
    action TEXT NOT NULL,
    changes JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Ticket responses/comments
CREATE TABLE ticket_responses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    ticket_id UUID REFERENCES tickets(id),
    author_id UUID REFERENCES auth.users(id),
    content TEXT NOT NULL,
    type TEXT NOT NULL, -- 'ai' or 'human'
    is_internal BOOLEAN DEFAULT false,
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Knowledge base articles
CREATE TABLE kb_articles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    category TEXT,
    tags TEXT[] DEFAULT '{}',
    author_id UUID REFERENCES auth.users(id),
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create indexes for common queries
CREATE INDEX idx_tickets_customer ON tickets(customer_id);
CREATE INDEX idx_tickets_agent ON tickets(assigned_agent_id);
CREATE INDEX idx_tickets_team ON tickets(team_id);
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_ticket_responses_ticket ON ticket_responses(ticket_id);
CREATE INDEX idx_kb_articles_category ON kb_articles(category);

-- Add RLS policies
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE ticket_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE kb_articles ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (to be refined based on requirements)
CREATE POLICY "Customers can view their own tickets"
    ON tickets FOR SELECT
    USING (auth.uid() = customer_id);

CREATE POLICY "Agents can view assigned tickets"
    ON tickets FOR SELECT
    USING (auth.uid() = assigned_agent_id OR 
           auth.uid() IN (SELECT id FROM agents WHERE team_id = tickets.team_id));

-- Add RLS policies for ticket responses
CREATE POLICY "Customers can view responses to their tickets"
    ON ticket_responses FOR SELECT
    USING (
        ticket_id IN (
            SELECT id FROM tickets WHERE customer_id = auth.uid()
        )
    );

CREATE POLICY "Agents can view responses to their tickets"
    ON ticket_responses FOR SELECT
    USING (
        ticket_id IN (
            SELECT id FROM tickets 
            WHERE assigned_agent_id = auth.uid() 
            OR auth.uid() IN (SELECT id FROM agents WHERE team_id = tickets.team_id)
        )
    );

CREATE POLICY "Agents can create responses"
    ON ticket_responses FOR INSERT
    WITH CHECK (
        auth.uid() IN (SELECT id FROM agents)
    );

CREATE POLICY "Customers can create responses to their tickets"
    ON ticket_responses FOR INSERT
    WITH CHECK (
        ticket_id IN (
            SELECT id FROM tickets WHERE customer_id = auth.uid()
        )
    );

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_tickets_updated_at
    BEFORE UPDATE ON tickets
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column();

CREATE TRIGGER update_ticket_responses_updated_at
    BEFORE UPDATE ON ticket_responses
    FOR EACH ROW
    EXECUTE PROCEDURE update_updated_at_column(); 