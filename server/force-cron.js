import { manualProcess, manualSync } from './lib/cron.js';

const action = process.argv[2] || 'sync';

console.log(`🔄 Forcing CRON execution: ${action}\n`);

try {
  let result;
  
  if (action === 'drip') {
    console.log('📦 Processing drip feed orders...');
    result = await manualProcess();
    console.log('\n✅ Drip feed processing completed!');
    console.log(`   Processed: ${result.processed || 0} orders`);
  } else if (action === 'sync') {
    console.log('🔄 Syncing order statuses...');
    result = await manualSync();
    console.log('\n✅ Order sync completed!');
    console.log(`   Synced: ${result.synced || 0} orders`);
    console.log(`   Errors: ${result.errors || 0}`);
    console.log(`   Total: ${result.total || 0}`);
  } else {
    console.log('❌ Invalid action. Use:');
    console.log('   node force-cron.js sync   - Sync order statuses');
    console.log('   node force-cron.js drip   - Process drip feed orders');
    process.exit(1);
  }
  
  console.log('\n💡 Check the output above for any errors');
  console.log('💡 Run: node check-drip-status.js to verify the results\n');
  process.exit(0);
} catch (error) {
  console.error('\n❌ CRON execution failed:', error.message);
  process.exit(1);
}
