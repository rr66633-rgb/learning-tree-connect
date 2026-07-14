import mysql from 'mysql2/promise';

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
  const [rows] = await conn.execute(
    "SELECT id, name, email, phone, role, organizationId, isActive FROM users WHERE email LIKE '%review%' OR email LIKE '%demo%' OR phone = '0500000000' OR phone = '0500000001' OR id IN (5310007, 5310008, 10050019, 17460001)"
  );
  console.log(JSON.stringify(rows, null, 2));
  await conn.end();
}
main();
