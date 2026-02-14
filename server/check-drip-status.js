import db from './config/database.js';

async function checkDripFeedStatus() {
  try {
    console.log('🔍 Checking all drip feed orders...\n');
    
    // Find all parent drip feed orders
    const [parentOrders] = await db.query(`
      SELECT 
        id,
        service_id,
        link,
        quantity,
        status,
        dripfeed_runs as runs,
        dripfeed_interval as run_interval,
        dripfeed_current_run as current_run,
        created_at
      FROM orders 
      WHERE parent_order_id IS NULL 
        AND dripfeed_runs > 0
      ORDER BY created_at DESC
      LIMIT 10
    `);

    if (parentOrders.length === 0) {
      console.log('❌ No drip feed orders found');
      process.exit(0);
    }

    console.log(`Found ${parentOrders.length} drip feed parent order(s):\n`);

    for (const parent of parentOrders) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`📦 Parent Order #${parent.id}`);
      console.log(`   Service ID: ${parent.service_id}`);
      console.log(`   Link: ${parent.link}`);
      console.log(`   Status: ${parent.status}`);
      console.log(`   Total quantity: ${parent.quantity}`);
      console.log(`   Runs configured: ${parent.runs}`);
      console.log(`   Current run: ${parent.current_run || 0}/${parent.runs}`);
      console.log(`   Interval: ${parent.run_interval} minutes (${Math.round(parent.run_interval / 1440)} days)`);
      console.log(`   Created: ${parent.created_at}`);

      // Get all sub-orders for this parent
      const [subOrders] = await db.query(`
        SELECT 
          id,
          quantity,
          remains,
          status,
          provider_order_id,
          created_at,
          updated_at
        FROM orders 
        WHERE parent_order_id = ?
        ORDER BY created_at ASC
      `, [parent.id]);

      console.log(`\n   📊 Sub-orders: ${subOrders.length}/${parent.runs} created\n`);

      if (subOrders.length === 0) {
        console.log('   ⚠️  NO SUB-ORDERS YET - First run not executed!');
        console.log('   💡 Check if CRON is running and next_run_at is in the past\n');
        continue;
      }

      subOrders.forEach((sub, index) => {
        const isExecuted = sub.provider_order_id && sub.provider_order_id !== '';
        const isSynced = sub.remains !== sub.quantity || sub.status === 'Completed';
        
        console.log(`   ${index + 1}. Sub-order #${sub.id}`);
        console.log(`      Quantity: ${sub.quantity}`);
        console.log(`      Remains: ${sub.remains}`);
        console.log(`      Status: ${sub.status}`);
        console.log(`      Provider Order ID: ${sub.provider_order_id || '❌ NOT SET'}`);
        console.log(`      Created: ${sub.created_at}`);
        console.log(`      Updated: ${sub.updated_at || 'Never'}`);
        
        if (!isExecuted) {
          console.log(`      ❌ NOT EXECUTED - No provider_order_id`);
        } else if (!isSynced) {
          console.log(`      ⚠️  EXECUTED but NOT SYNCED (remains = quantity)`);
        } else {
          console.log(`      ✅ EXECUTED and SYNCED`);
        }
        console.log('');
      });

      // Summary
      const executed = subOrders.filter(s => s.provider_order_id && s.provider_order_id !== '').length;
      const synced = subOrders.filter(s => s.remains !== s.quantity || s.status === 'Completed').length;
      const completed = subOrders.filter(s => s.status === 'Completed').length;

      console.log(`   📈 Summary:`);
      console.log(`      Executed: ${executed}/${subOrders.length}`);
      console.log(`      Synced: ${synced}/${subOrders.length}`);
      console.log(`      Completed: ${completed}/${subOrders.length}`);
      
      if (subOrders.length === 0) {
        console.log(`\n   ⚠️  No sub-orders created yet!`);
        console.log(`      Expected first run: Immediately after parent creation`);
        console.log(`      Parent created: ${parent.created_at}`);
        console.log(`      💡 CRON should have created first sub-order already!`);
        console.log(`      💡 Check if CRON job is running!`);
      } else if (subOrders.length < parent.runs) {
        const lastSubOrder = subOrders[subOrders.length - 1];
        const theoreticalNextRun = new Date(lastSubOrder.created_at);
        theoreticalNextRun.setMinutes(theoreticalNextRun.getMinutes() + parent.run_interval);
        const now = new Date();
        const isPast = theoreticalNextRun < now;
        
        console.log(`\n   ⏰ Next run schedule:`);
        console.log(`      Last run: ${lastSubOrder.created_at}`);
        console.log(`      Interval: ${parent.run_interval} minutes`);
        console.log(`      Expected next: ${theoreticalNextRun.toISOString()}`);
        console.log(`      Status: ${isPast ? '⚠️  OVERDUE - should execute now!' : '⏳ Scheduled for future'}`);
        if (isPast) {
          const overdueMinutes = Math.floor((now - theoreticalNextRun) / 1000 / 60);
          console.log(`      💡 Overdue by: ${overdueMinutes} minutes`);
          console.log(`      💡 Check if CRON job is running!`);
        }
      }
      
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 Troubleshooting:');
    console.log('   1. Check if CRON is running: ps aux | grep node');
    console.log('   2. Check CRON logs in server terminal');
    console.log('   3. Verify next_run_at dates are in the past');
    console.log('   4. Check provider API connectivity');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkDripFeedStatus();
