import db from './config/database.js';
import axios from 'axios';

async function syncOrders() {
  try {
    console.log('🔄 Forcing order synchronization with provider APIs...\n');

    // Get provider info (prefer 'default', fallback to first available)
    const [providers] = await db.query(`
      SELECT name, api_key, api_url 
      FROM providers 
      WHERE name = 'default'
      LIMIT 1
    `);
    
    if (providers.length === 0) {
      // Fallback: get first provider
      const [fallbackProviders] = await db.query(`
        SELECT name, api_key, api_url 
        FROM providers 
        ORDER BY id ASC
        LIMIT 1
      `);
      
      if (fallbackProviders.length === 0) {
        console.log('❌ No providers found in database!');
        console.log('💡 Add a provider first or run: node fix-provider.js');
        process.exit(1);
      }
      
      providers.push(fallbackProviders[0]);
      console.log(`⚠️  Using provider: ${providers[0].name} (no "default" provider found)`);
    } else {
      console.log(`✅ Using provider: ${providers[0].name}`);
    }
    
    const provider = providers[0];
    console.log(`   API URL: ${provider.api_url}`);
    console.log(`   API Key: ${provider.api_key.substring(0, 20)}...\n`);

    // Get all orders that need syncing
    const [orders] = await db.query(`
      SELECT 
        id,
        provider_order_id,
        quantity,
        remains,
        status
      FROM orders
      WHERE provider_order_id IS NOT NULL 
        AND status != 'completed'
        AND status != 'cancelled'
      ORDER BY created_at DESC
    `);

    if (orders.length === 0) {
      console.log('✅ No orders to sync');
      process.exit(0);
    }

    console.log(`Found ${orders.length} order(s) to sync\n`);

    let syncedCount = 0;

    for (const order of orders) {
      console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
      console.log(`📦 Order #${order.id}`);
      console.log(`   Provider Order ID: ${order.provider_order_id}`);
      console.log(`   Current Status: ${order.status}`);
      console.log(`   Before: remains=${order.remains}, quantity=${order.quantity}`);

      try {
        // Call provider API to get order status
        const apiUrl = provider.api_url || 'https://justanotherpanel.com/api/v2';
        
        console.log(`   🔍 Calling provider API: ${apiUrl}`);
        
        const response = await axios.post(apiUrl, {
          key: provider.api_key,
          action: 'status',
          order: order.provider_order_id
        }, {
          timeout: 10000
        });

        console.log(`   📡 API Response:`, JSON.stringify(response.data, null, 2));

        if (response.data && typeof response.data === 'object') {
          const remains = parseInt(response.data.remains) || 0;
          const charge = parseFloat(response.data.charge) || order.charge;
          const start_count = parseInt(response.data.start_count) || 0;
          const providerStatus = response.data.status;

          // Map provider status to our status
          let newStatus = order.status;
          if (providerStatus === 'Completed' || remains === 0) {
            newStatus = 'completed';
          } else if (providerStatus === 'Partial') {
            newStatus = 'processing';
          } else if (providerStatus === 'In progress' || providerStatus === 'Processing') {
            newStatus = 'processing';
          } else if (providerStatus === 'Pending') {
            newStatus = 'pending';
          } else if (providerStatus === 'Canceled' || providerStatus === 'Cancelled') {
            newStatus = 'cancelled';
          }

          // Update order in database
          await db.query(`
            UPDATE orders 
            SET remains = ?, 
                charge = ?,
                status = ?,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = ?
          `, [remains, charge, newStatus, order.id]);

          console.log(`   ✅ Synced successfully!`);
          console.log(`      After: remains=${remains}, status=${newStatus}`);
          console.log(`      Delivered: ${order.quantity - remains}/${order.quantity}`);
          
          syncedCount++;
        } else {
          console.log(`   ⚠️  Invalid API response format`);
        }
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          console.log(`   ❌ Timeout - Provider API took too long`);
        } else if (error.response) {
          console.log(`   ❌ API Error:`, error.response.data);
        } else {
          console.log(`   ❌ Error:`, error.message);
        }
      }

      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`\n✅ Sync complete: ${syncedCount}/${orders.length} orders synced`);
    console.log('\n💡 Run check-drip-status.js again to verify the sync\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

syncOrders();
