import bcrypt from 'bcryptjs';
import db from './config/database.js';

async function checkAllUsers() {
  try {
    console.log('🔍 Checking all users in database...\n');
    
    const [users] = await db.query('SELECT id, name, email, role, status, password, created_at FROM users ORDER BY created_at DESC');
    
    if (users.length === 0) {
      console.log('❌ No users found in database');
      process.exit(1);
    }

    console.log(`Found ${users.length} user(s):\n`);

    for (const user of users) {
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log(`👤 User #${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
      console.log(`   Status: ${user.status} ${user.status === 'approved' ? '✅' : user.status === 'pending' ? '⏳' : '🚫'}`);
      console.log(`   Created: ${user.created_at}`);
      console.log(`   Password hash: ${user.password}`);
      console.log(`   Hash length: ${user.password.length} ${user.password.length === 60 ? '✅' : '⚠️ Should be 60!'}`);
      console.log(`   Hash format: ${user.password.startsWith('$2a$') || user.password.startsWith('$2b$') ? '✅ bcrypt' : '❌ Invalid!'}`);
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n💡 To reset a password, run:');
    console.log('   node reset-password.js <email> <new-password>');
    
    // Check for users that need approval
    const pendingUsers = users.filter(u => u.status === 'pending');
    if (pendingUsers.length > 0) {
      console.log(`\n⏳ ${pendingUsers.length} user(s) pending approval:`);
      pendingUsers.forEach(u => console.log(`   - ${u.email}`));
      console.log('\nTo approve a user, run this SQL:');
      console.log(`   UPDATE users SET status = 'approved' WHERE email = 'user@example.com';`);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

checkAllUsers();
