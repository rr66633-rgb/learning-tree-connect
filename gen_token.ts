import { sdk } from "./server/_core/sdk";

async function main() {
  const ownerOpenId = process.env.OWNER_OPEN_ID;
  if (!ownerOpenId) {
    console.error("OWNER_OPEN_ID not set");
    process.exit(1);
  }
  const token = await sdk.createSessionToken(ownerOpenId, {
    name: process.env.OWNER_NAME || "Admin",
    expiresInMs: 1000 * 60 * 60 * 24, // 1 day
  });
  console.log(token);
}

main().catch(console.error);
