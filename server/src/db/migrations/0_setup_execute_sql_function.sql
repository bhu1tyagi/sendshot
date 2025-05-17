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