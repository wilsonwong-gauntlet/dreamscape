-- Drop existing type if it exists
DROP TYPE IF EXISTS user_role;

-- Create role type
CREATE TYPE user_role AS ENUM ('customer', 'agent', 'admin');

-- Create invite system for agents/admins
CREATE TABLE invites (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT NOT NULL UNIQUE,
    role user_role NOT NULL,
    team_id UUID REFERENCES teams(id),
    token TEXT NOT NULL UNIQUE,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    used_at TIMESTAMP WITH TIME ZONE
);

-- Function to create a new customer
CREATE OR REPLACE FUNCTION handle_new_customer()
RETURNS TRIGGER AS $$
BEGIN
  -- Set role in user metadata
  UPDATE auth.users SET raw_user_meta_data = 
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      '"customer"'
    )
  WHERE id = NEW.id;
  
  -- Create customer record
  INSERT INTO customers (id, email)
  VALUES (NEW.id, NEW.email);
  
  RETURN NEW;
END;
$$ language plpgsql SECURITY DEFINER;

-- Function to validate invite token
CREATE OR REPLACE FUNCTION validate_invite(
  invite_token TEXT,
  invite_email TEXT
) RETURNS invites AS $$
DECLARE
  invite_record invites;
BEGIN
  SELECT * INTO invite_record
  FROM invites
  WHERE token = invite_token
    AND email = invite_email
    AND used_at IS NULL
    AND expires_at > NOW();
    
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invalid or expired invite';
  END IF;

  RETURN invite_record;
END;
$$ language plpgsql SECURITY DEFINER;

-- Function to create a new agent (updated)
CREATE OR REPLACE FUNCTION handle_new_agent(
  token TEXT,
  user_id UUID
) RETURNS void AS $$
DECLARE
  invite_record invites;
  user_email TEXT;
BEGIN
  -- Get user's email
  SELECT email INTO user_email
  FROM auth.users
  WHERE id = user_id;

  -- Validate invite
  invite_record := validate_invite(token, user_email);
  
  -- Set role in user metadata
  UPDATE auth.users SET raw_user_meta_data = 
    jsonb_set(
      COALESCE(raw_user_meta_data, '{}'::jsonb),
      '{role}',
      to_jsonb(invite_record.role::text)
    )
  WHERE id = user_id;
  
  -- Create agent record
  INSERT INTO agents (id, role, team_id)
  VALUES (
    user_id,
    invite_record.role::text,
    invite_record.team_id
  );
  
  -- Mark invite as used
  UPDATE invites
  SET used_at = NOW()
  WHERE id = invite_record.id;
END;
$$ language plpgsql SECURITY DEFINER;

-- Function to create invite for agent/admin
CREATE OR REPLACE FUNCTION create_invite(
  invite_email TEXT,
  invite_role user_role,
  invite_team_id UUID,
  inviter_id UUID
) RETURNS invites AS $$
DECLARE
  invite_record invites;
BEGIN
  -- Verify inviter is an admin
  IF NOT EXISTS (
    SELECT 1 FROM agents
    WHERE id = inviter_id AND agents.role = 'admin'
  ) THEN
    RAISE EXCEPTION 'Only admins can create invites';
  END IF;

  -- Create invite
  INSERT INTO invites (
    email,
    role,
    team_id,
    token,
    expires_at,
    created_by
  )
  VALUES (
    invite_email,
    invite_role,
    invite_team_id,
    encode(gen_random_bytes(32), 'hex'),
    NOW() + INTERVAL '24 hours',
    inviter_id
  )
  RETURNING * INTO invite_record;

  RETURN invite_record;
END;
$$ language plpgsql SECURITY DEFINER;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION create_invite TO authenticated;

-- RLS Policies
ALTER TABLE invites ENABLE ROW LEVEL SECURITY;

-- Only admins can view invites
CREATE POLICY "Admins can view invites"
  ON invites FOR SELECT
  USING (
    auth.uid() IN (
      SELECT id FROM agents WHERE role = 'admin'
    )
  );

-- Only admins can create invites
CREATE POLICY "Admins can create invites"
  ON invites FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT id FROM agents WHERE role = 'admin'
    )
  );

-- Remove the automatic customer trigger since we'll handle roles explicitly
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Function to handle new signups based on context
CREATE OR REPLACE FUNCTION handle_new_signup()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an invite signup
  IF NEW.raw_user_meta_data->>'invite_token' IS NOT NULL THEN
    -- Handle as agent/admin signup
    PERFORM handle_new_agent(
      NEW.raw_user_meta_data->>'invite_token',
      NEW.id
    );
  ELSE
    -- Handle as customer signup
    UPDATE auth.users SET raw_user_meta_data = 
      jsonb_set(
        COALESCE(raw_user_meta_data, '{}'::jsonb),
        '{role}',
        '"customer"'
      )
    WHERE id = NEW.id;
    
    INSERT INTO customers (id, email)
    VALUES (NEW.id, NEW.email);
  END IF;
  
  RETURN NEW;
END;
$$ language plpgsql SECURITY DEFINER;

-- Add new trigger for signup handling
CREATE TRIGGER handle_signup
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_signup();

-- Allow public access to validate_invite function
GRANT EXECUTE ON FUNCTION validate_invite TO anon; 