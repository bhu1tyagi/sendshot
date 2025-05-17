// Create migrations bucket
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

async function setupMigrationsBucket() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    console.error('Missing Supabase credentials');
    process.exit(1);
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Create migrations bucket if it doesn't exist
    const { data, error } = await supabase.storage.createBucket('migrations', {
      public: false,
    });
    
    if (error && error.message !== 'Bucket already exists') {
      throw error;
    }
    
    console.log('Migrations bucket created or already exists');
  } catch (error) {
    console.error('Error creating migrations bucket:', error);
  }
}

setupMigrationsBucket(); 