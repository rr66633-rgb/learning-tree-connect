import { drizzle } from "drizzle-orm/mysql2";
import { users, loyaltyRewards } from "../drizzle/schema";

/**
 * Production Setup Script
 * -----------------------
 * This script initializes the production database with:
 * 1. Default loyalty rewards catalog
 * 
 * NOTE: The admin user is automatically created on first OAuth login
 * by the platform owner. Teachers and parents should be added via
 * the User Management interface in the admin dashboard.
 * 
 * Usage: npx tsx server/seed.ts
 */
async function setup() {
  const db = drizzle(process.env.DATABASE_URL!);

  console.log("Initializing production database...");

  // ============ LOYALTY REWARDS CATALOG ============
  const rewardsData = [
    { name: "Free Day", nameAr: "يوم مجاني", description: "One free day of attendance", descriptionAr: "يوم حضور مجاني للطفل", pointsCost: 500, organizationId: 1 },
    { name: "Activity Kit", nameAr: "حقيبة أنشطة", description: "Educational activity kit", descriptionAr: "حقيبة أنشطة تعليمية منزلية", pointsCost: 300, organizationId: 1 },
    { name: "Photo Album", nameAr: "ألبوم صور", description: "Monthly photo album", descriptionAr: "ألبوم صور شهري للطفل", pointsCost: 200, organizationId: 1 },
    { name: "10% Discount", nameAr: "خصم 10%", description: "10% off next month fees", descriptionAr: "خصم 10% على رسوم الشهر القادم", pointsCost: 1000, organizationId: 1 },
    { name: "Extra Class", nameAr: "حصة إضافية", description: "One extra enrichment class", descriptionAr: "حصة إثرائية إضافية مجانية", pointsCost: 400, organizationId: 1 },
  ];

  for (const reward of rewardsData) {
    await db.insert(loyaltyRewards).values(reward).onDuplicateKeyUpdate({ set: { nameAr: reward.nameAr } });
  }

  console.log("Production setup completed successfully!");
  console.log(`- ${rewardsData.length} loyalty rewards initialized`);
  console.log("");
  console.log("Next steps:");
  console.log("1. Login as admin via the OAuth portal");
  console.log("2. Add teachers and parents from the User Management page");
  console.log("3. Add children and link them to their parents");
  
  process.exit(0);
}

setup().catch(e => { console.error(e); process.exit(1); });
