import db from './config/database.js';

async function renameProvider() {
  try {
    console.log('🔧 Renaming provider "BulkMedya" to "default"...\n');
    
    // Rename provider
    await db.query("UPDATE providers SET name = 'default' WHERE name = 'BulkMedya'");
    
    // Verify
    const [providers] = await db.query("SELECT * FROM providers WHERE name = 'default'");
    
    if (providers.length > 0) {
      console.log('✅ Provider renamed successfully!\n');
      console.log('Provider details:');
      console.log(`   Name: ${providers[0].name}`);
      console.log(`   API Key: ${providers[0].api_key.substring(0, 20)}...`);
      console.log(`   API URL: ${providers[0].api_url}`);
      console.log('\n💡 You can now run: node force-sync.js');
    } else {
      console.log('❌ Failed to rename provider');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

renameProvider();
