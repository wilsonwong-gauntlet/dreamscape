-- Create enum type for chat session status
CREATE TYPE chat_session_status AS ENUM ('active', 'ended');

-- Chat sessions table
CREATE TABLE chat_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) NOT NULL,
    status chat_session_status DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    ended_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Chat messages table
CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES chat_sessions(id) NOT NULL,
    sender_type TEXT NOT NULL CHECK (sender_type IN ('customer', 'agent', 'system')),
    sender_id UUID REFERENCES auth.users(id) NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    read_at TIMESTAMP WITH TIME ZONE,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- RLS Policies
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Customers can view their own chat sessions
CREATE POLICY "Customers can view own chat sessions"
    ON chat_sessions
    FOR SELECT
    USING (
        auth.uid() = user_id
        OR 
        EXISTS (
            SELECT 1 FROM agents WHERE agents.id = auth.uid()
        )
    );

-- Customers can create chat sessions
CREATE POLICY "Customers can create chat sessions"
    ON chat_sessions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Messages visible to session participants and agents
CREATE POLICY "View messages if participant or agent"
    ON chat_messages
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND (
                chat_sessions.user_id = auth.uid()
                OR 
                EXISTS (SELECT 1 FROM agents WHERE agents.id = auth.uid())
            )
        )
    );

-- Allow message creation for session participants and agents
CREATE POLICY "Create messages if participant or agent"
    ON chat_messages
    FOR INSERT
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM chat_sessions 
            WHERE chat_sessions.id = chat_messages.session_id 
            AND (
                chat_sessions.user_id = auth.uid()
                OR 
                EXISTS (SELECT 1 FROM agents WHERE agents.id = auth.uid())
            )
        )
    );

-- Create indexes for performance
CREATE INDEX chat_sessions_user_id_idx ON chat_sessions(user_id);
CREATE INDEX chat_messages_session_id_idx ON chat_messages(session_id);
CREATE INDEX chat_messages_sender_id_idx ON chat_messages(sender_id); 