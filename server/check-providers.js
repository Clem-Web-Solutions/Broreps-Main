import db from './config/database.js';

async function checkProviders() {
  try {
    console.log('🔍 Checking providers table...\n');
    
    // Check all providers
    const [providers] = await db.query('SELECT * FROM providers');
    
    if (providers.length === 0) {
      console.log('❌ No providers found in database!\n');
      console.log('💡 You need to add a provider. Run this SQL:\n');
      console.log(`INSERT INTO providers (name, api_key, api_url) VALUES 
        ('default', 'YOUR_API_KEY_HERE', 'https://justanotherpanel.com/api/v2');`);
      process.exit(1);
    }

    console.log(`Found ${providers.length} provider(s):\n`);
    
    providers.forEach((provider, index) => {
      console.log(`${index + 1}. Provider: ${provider.name}`);
      console.log(`   API Key: ${provider.api_key ? provider.api_key.substring(0, 20) + '...' : '❌ NOT SET'}`);
      console.log(`   API URL: ${provider.api_url || 'Not set'}`);
      console.log(`   Created: ${provider.created_at}`);
      console.log('');
    });

    // Check if default provider exists
    const defaultProvider = providers.find(p => p.name === 'default');
    if (!defaultProvider) {
      console.log('⚠️  No "default" provider found!');
      console.log('💡 The sync script looks for a provider with name="default"');
      console.log('\n💡 Fix: Either rename your provider to "default" or add a default provider:\n');
      console.log(`UPDATE providers SET name = 'default' WHERE name = '${providers[0].name}';`);
      console.log('\nOR\n');
      console.log(`INSERT INTO providers (name, api_key, api_url) VALUES 
        ('default', 'YOUR_API_KEY', 'https://justanotherpanel.com/api/v2');`);
    } else {
      console.log('✅ Default provider found!');
      console.log(`   API Key: ${defaultProvider.api_key}`);
      console.log(`   API URL: ${defaultProvider.api_url || 'https://justanotherpanel.com/api/v2'}`);
    }

    // Check if orders are linked to providers
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('🔍 Checking order-provider relationships...\n');
    
    const [ordersWithProvider] = await db.query(`
      SELECT 
        o.id,
        o.provider_order_id,
        o.status,
        p.name as provider_name,
        p.api_key as provider_api_key
      FROM orders o
      LEFT JOIN providers p ON p.name = 'default'
      WHERE o.provider_order_id IS NOT NULL
      LIMIT 5
    `);

    if (ordersWithProvider.length === 0) {
      console.log('ℹ️  No orders with provider_order_id found');
    } else {
      console.log(`Found ${ordersWithProvider.length} order(s) with provider data:\n`);
      ordersWithProvider.forEach(order => {
        console.log(`Order #${order.id}:`);
        console.log(`   Provider Order ID: ${order.provider_order_id}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Provider Name: ${order.provider_name || '❌ NOT LINKED'}`);
        console.log(`   Provider API Key: ${order.provider_api_key ? order.provider_api_key.substring(0, 20) + '...' : '❌ NOT FOUND'}`);
        console.log('');
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkProviders();
