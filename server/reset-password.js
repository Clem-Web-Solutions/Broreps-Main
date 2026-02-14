import bcrypt from 'bcryptjs';
import db from './config/database.js';

const email = process.argv[2];
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.log('Usage: node reset-password.js <email> <new-password>');
  console.log('Example: node reset-password.js user@example.com MyNewPassword123');
  process.exit(1);
}

async function resetPassword() {
  try {
    // Check if user exists
    const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
    
    if (users.length === 0) {
      console.log('❌ No user found with email:', email);
      process.exit(1);
    }

    const user = users[0];
    console.log('\n📋 User found:');
    console.log('   ID:', user.id);
    console.log('   Name:', user.name);
    console.log('   Email:', user.email);
    console.log('   Role:', user.role);
    console.log('   Status:', user.status);
    console.log('   Current password hash:', user.password);
    console.log('   Hash length:', user.password.length);

    // Generate new hash
    console.log('\n🔐 Generating new password hash...');
    const newHash = await bcrypt.hash(newPassword, 10);
    console.log('   New hash:', newHash);
    console.log('   New hash length:', newHash.length);

    // Test the new hash immediately
    console.log('\n🧪 Testing new hash...');
    const testResult = await bcrypt.compare(newPassword, newHash);
    console.log('   Test result:', testResult ? '✅ VALID' : '❌ FAILED');

    if (!testResult) {
      console.log('❌ Hash generation failed! Aborting.');
      process.exit(1);
    }

    // Update password in database
    console.log('\n💾 Updating password in database...');
    await db.query('UPDATE users SET password = ? WHERE email = ?', [newHash, email]);
    console.log('✅ Password updated successfully!');

    // Verify update
    const [updated] = await db.query('SELECT password FROM users WHERE email = ?', [email]);
    console.log('\n✅ Verification:');
    console.log('   Stored hash:', updated[0].password);
    console.log('   Hash matches:', updated[0].password === newHash ? '✅ YES' : '❌ NO');

    // Final test
    console.log('\n🧪 Final test - comparing with stored hash...');
    const finalTest = await bcrypt.compare(newPassword, updated[0].password);
    console.log('   Result:', finalTest ? '✅ SUCCESS - Login will work!' : '❌ FAILED');

    console.log('\n✨ You can now login with:');
    console.log('   Email:', email);
    console.log('   Password:', newPassword);

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

resetPassword();
