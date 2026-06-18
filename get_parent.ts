import { getDb } from './server/db';
import { eq } from 'drizzle-orm';
import { users, loyaltyPoints } from './drizzle/schema';

async function main() {
  const db = await getDb();
  const parents = await db.select().from(users).where(eq(users.role, 'parent')).limit(5);
  for (const p of parents) {
    const points = await db.select().from(loyaltyPoints).where(eq(loyaltyPoints.userId, p.id));
    console.log(`ID: ${p.id}, Name: ${p.name}, OpenID: ${p.openId}, Points: ${points[0]?.points || 0}`);
  }
}
main().then(() => process.exit(0));
