# Database Migration Instructions

Run the following SQL statements in your Supabase SQL Editor:

## 0_setup_execute_sql_function.sql
```sql
-- Create a function that can execute arbitrary SQL
-- This needs to be run by a superuser/admin in Supabase
CREATE OR REPLACE FUNCTION execute_sql(sql_string TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- This runs with the privileges of the function creator
AS $$
BEGIN
  EXECUTE sql_string;
  RETURN jsonb_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  RETURN jsonb_build_object(
    'success', false,
    'error', SQLERRM,
    'detail', SQLSTATE
  );
END;
$$; 
```

## create_tokens_table.sql
```sql
-- Create tokens table
CREATE TABLE IF NOT EXISTS tokens (
  id UUID PRIMARY KEY,
  address TEXT NOT NULL,
  name TEXT NOT NULL,
  symbol TEXT NOT NULL,
  logo_uri TEXT,
  creator_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  initial_price DECIMAL NOT NULL,
  current_price DECIMAL,
  price_change_24h DECIMAL,
  total_supply TEXT NOT NULL,
  holders INTEGER,
  protocol_type TEXT NOT NULL CHECK (protocol_type IN ('pumpfun', 'raydium', 'tokenmill', 'meteora'))
);

-- Create index on creator_id for faster lookup
CREATE INDEX IF NOT EXISTS tokens_creator_id_idx ON tokens(creator_id);

-- Add RLS policies
ALTER TABLE tokens ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read tokens
CREATE POLICY tokens_read_policy ON tokens
  FOR SELECT
  USING (true);

-- Only allow the creator to update or delete their own tokens
CREATE POLICY tokens_update_policy ON tokens
  FOR UPDATE
  USING (auth.uid()::text = creator_id);

CREATE POLICY tokens_delete_policy ON tokens
  FOR DELETE
  USING (auth.uid()::text = creator_id);

-- Only allow authenticated users to insert tokens (and must set creator_id to their user ID)
CREATE POLICY tokens_insert_policy ON tokens
  FOR INSERT
  WITH CHECK (auth.uid()::text = creator_id);

-- Add a function to update current_price and price_change_24h
CREATE OR REPLACE FUNCTION update_token_prices()
RETURNS TRIGGER AS $$
BEGIN
  -- Calculate price change percentage
  IF OLD.current_price IS NOT NULL AND NEW.current_price IS NOT NULL AND OLD.current_price > 0 THEN
    NEW.price_change_24h := ((NEW.current_price - OLD.current_price) / OLD.current_price) * 100;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update price_change_24h whenever current_price is updated
CREATE TRIGGER update_token_prices_trigger
BEFORE UPDATE ON tokens
FOR EACH ROW
WHEN (OLD.current_price IS DISTINCT FROM NEW.current_price)
EXECUTE FUNCTION update_token_prices(); 
```

## create_users_table.sql
```sql
-- Create users table if it doesn't exist
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  provider TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ NOT NULL,
  profile_pic_url TEXT,
  description TEXT
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS users_username_idx ON users(username);
CREATE INDEX IF NOT EXISTS users_provider_idx ON users(provider); 
```

