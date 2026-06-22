/**
 * Create demo accounts for Nasha'a platform
 * Run with: node scripts/create-demo-accounts.mjs
 */
import crypto from 'crypto';
import mysql from 'mysql2/promise';

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

async function main() {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('DATABASE_URL not set');
    process.exit(1);
  }

  const connection = await mysql.createConnection(dbUrl);
  
  const accounts = [
    {
      name: 'مدير النظام',
      email: 'admin@nashaa.sa',
      phone: '0500000001',
      password: 'Nashaa@2026',
      role: 'super_admin',
      isActive: true,
    },
    {
      name: 'مديرة حضانة شجرة التعلم',
      email: 'nursery@nashaa.sa',
      phone: '0500000002',
      password: 'Nashaa@2026',
      role: 'admin',
      isActive: true,
    },
    {
      name: 'المعلمة نورة',
      email: 'teacher@nashaa.sa',
      phone: '0500000003',
      password: 'Nashaa@2026',
      role: 'teacher',
      isActive: true,
    },
    {
      name: 'أم سارة',
      email: 'parent@nashaa.sa',
      phone: '0500000004',
      password: 'Nashaa@2026',
      role: 'parent',
      isActive: true,
    },
  ];

  for (const account of accounts) {
    const hashedPassword = hashPassword(account.password);
    const openId = `demo_${account.role}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    
    // Check if account already exists
    const [existing] = await connection.execute(
      'SELECT id FROM users WHERE email = ?',
      [account.email]
    );
    
    if (existing.length > 0) {
      // Update existing account
      await connection.execute(
        'UPDATE users SET password = ?, role = ?, isActive = ?, name = ? WHERE email = ?',
        [hashedPassword, account.role, account.isActive ? 1 : 0, account.name, account.email]
      );
      console.log(`Updated: ${account.email} (${account.role})`);
    } else {
      // Insert new account
      await connection.execute(
        'INSERT INTO users (openId, name, email, phone, password, role, isActive, organizationId) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        [openId, account.name, account.email, account.phone, hashedPassword, account.role, account.isActive ? 1 : 0, 1]
      );
      console.log(`Created: ${account.email} (${account.role})`);
    }
  }

  console.log('\n=== Demo Accounts Created ===');
  console.log('Super Admin: admin@nashaa.sa / Nashaa@2026');
  console.log('Nursery Admin: nursery@nashaa.sa / Nashaa@2026');
  console.log('Teacher: teacher@nashaa.sa / Nashaa@2026');
  console.log('Parent: parent@nashaa.sa / Nashaa@2026');
  
  await connection.end();
}

main().catch(console.error);
