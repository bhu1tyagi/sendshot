import fs from 'fs';
import path from 'path';
import supabase from './supabase';

/**
 * Run database migrations by generating instructions to run manually
 * Since Supabase JS client doesn't support direct SQL execution,
 * we'll generate instructions for manual execution
 */
export async function runMigrations() {
  try {
    console.log('Starting database migrations...');
    // Instead of trying to execute migrations directly (which won't work),
    // generate instructions and log them
    const instructionsPath = generateMigrationInstructions();
    console.log(`⚠️ IMPORTANT: Please run the SQL manually using the instructions at: ${instructionsPath}`);
    
    // Mark this as a "successful" migration run, even though it's manual
    console.log('Database migration instructions generated successfully');
    return instructionsPath;
  } catch (error) {
    console.error('Error preparing migrations:', error);
    throw error;
  }
}

/**
 * Create migration instructions to execute manually
 */
export function generateMigrationInstructions() {
  try {
    console.log('Generating migration instructions...');
    const migrationsDir = path.join(__dirname, 'migrations');
    
    // Read all migration files
    const migrationFiles = fs.readdirSync(migrationsDir)
      .filter(file => file.endsWith('.sql'))
      .sort(); // Execute in alphabetical order
    
    console.log(`Found ${migrationFiles.length} migration files`);
    let instructions = '# Database Migration Instructions\n\n';
    instructions += 'Run the following SQL statements in your Supabase SQL Editor:\n\n';
    
    for (const migrationFile of migrationFiles) {
      const migrationPath = path.join(migrationsDir, migrationFile);
      const sql = fs.readFileSync(migrationPath, 'utf8');
      
      instructions += `## ${migrationFile}\n\`\`\`sql\n${sql}\n\`\`\`\n\n`;
    }
    
    const outputPath = path.join(__dirname, 'migration_instructions.md');
    fs.writeFileSync(outputPath, instructions);
    
    console.log(`Migration instructions generated at: ${outputPath}`);
    return outputPath;
  } catch (error) {
    console.error('Error generating migration instructions:', error);
    throw error;
  }
} 