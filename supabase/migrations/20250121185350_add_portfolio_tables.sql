-- Create asset types enum
CREATE TYPE asset_type AS ENUM ('stock', 'bond', 'etf', 'mutual_fund', 'crypto', 'cash');

-- Create portfolios table
CREATE TABLE portfolios (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create holdings table
CREATE TABLE holdings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) NOT NULL,
    symbol TEXT NOT NULL,
    asset_type asset_type NOT NULL,
    quantity DECIMAL NOT NULL,
    average_price DECIMAL NOT NULL,
    current_price DECIMAL,
    last_price_update TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create transactions table for history
CREATE TABLE portfolio_transactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    portfolio_id UUID REFERENCES portfolios(id) NOT NULL,
    holding_id UUID REFERENCES holdings(id) NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('buy', 'sell')),
    quantity DECIMAL NOT NULL,
    price DECIMAL NOT NULL,
    total_amount DECIMAL NOT NULL,
    transaction_date TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create customer teams table for managing client-agent relationships
CREATE TABLE customer_teams (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    customer_id UUID REFERENCES customers(id) NOT NULL,
    team_id UUID REFERENCES teams(id) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    UNIQUE(customer_id, team_id)
);

-- Enable RLS
ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;
ALTER TABLE holdings ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_teams ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Portfolios: customers can view and manage their own portfolios
CREATE POLICY "Users can manage their own portfolios"
    ON portfolios
    USING (customer_id = auth.uid());

-- Holdings: users can manage holdings in their portfolios
CREATE POLICY "Users can manage holdings in their portfolios"
    ON holdings
    USING (
        portfolio_id IN (
            SELECT id FROM portfolios
            WHERE customer_id = auth.uid()
        )
    );

-- Allow admins to manage holdings
CREATE POLICY "Admins can manage holdings"
    ON holdings
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
            AND agents.role = 'admin'
        )
    );

-- Transactions: users can view transactions in their portfolios
CREATE POLICY "Users can view their portfolio transactions"
    ON portfolio_transactions
    USING (
        portfolio_id IN (
            SELECT id FROM portfolios
            WHERE customer_id = auth.uid()
        )
    );

-- Allow admins to manage transactions
CREATE POLICY "Admins can manage transactions"
    ON portfolio_transactions
    FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
            AND agents.role = 'admin'
        )
    );

-- Allow agents to view client portfolios they manage
CREATE POLICY "Agents can view managed client portfolios"
    ON portfolios
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
            AND (
                agents.role = 'admin'
                OR agents.team_id IN (
                    SELECT team_id FROM customer_teams
                    WHERE customer_id = portfolios.customer_id
                )
            )
        )
    );

-- Allow admins to create and manage client portfolios
CREATE POLICY "Admins can manage client portfolios"
    ON portfolios
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
            AND agents.role = 'admin'
        )
    );
-- Customer teams policies
CREATE POLICY "Admins can manage customer teams"
    ON customer_teams
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
            AND agents.role = 'admin'
        )
    );

CREATE POLICY "Team members can view their customer relationships"
    ON customer_teams
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM agents
            WHERE agents.id = auth.uid()
            AND agents.team_id = customer_teams.team_id
        )
    );

-- Create indexes
CREATE INDEX idx_holdings_portfolio ON holdings(portfolio_id);
CREATE INDEX idx_holdings_symbol ON holdings(symbol);
CREATE INDEX idx_portfolio_customer ON portfolios(customer_id);
CREATE INDEX idx_transactions_portfolio ON portfolio_transactions(portfolio_id);
CREATE INDEX idx_transactions_holding ON portfolio_transactions(holding_id);
CREATE INDEX idx_customer_teams_customer ON customer_teams(customer_id);
CREATE INDEX idx_customer_teams_team ON customer_teams(team_id);

-- Add trigger for updated_at
CREATE TRIGGER update_portfolios_updated_at
    BEFORE UPDATE ON portfolios
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_holdings_updated_at
    BEFORE UPDATE ON holdings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customer_teams_updated_at
    BEFORE UPDATE ON customer_teams
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 
