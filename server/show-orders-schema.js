import db from './config/database.js';

async function showOrdersSchema() {
  try {
    console.log('🔍 Checking orders table schema...\n');
    
    const [columns] = await db.query('DESCRIBE orders');
    
    console.log('📋 Orders table columns:\n');
    columns.forEach(col => {
      console.log(`   ${col.Field.padEnd(25)} ${col.Type.padEnd(20)} ${col.Null === 'YES' ? 'NULL' : 'NOT NULL'}`);
    });
    
    console.log('\n✅ Schema retrieved successfully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

showOrdersSchema();
