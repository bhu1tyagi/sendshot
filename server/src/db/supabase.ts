import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase credentials');
}

const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Execute raw SQL using Supabase's RPC functionality
 * Note: You must create a SQL function in Supabase that can execute this
 */
export async function executeRawSql(sql: string) {
  return supabase.rpc('execute_sql', { sql_string: sql });
}

export default supabase;
