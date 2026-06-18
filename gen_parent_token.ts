import { sdk } from "./server/_core/sdk";
async function main() {
  const token = await sdk.createSessionToken("parent_4", {
    name: "أحمد الغامدي",
    expiresInMs: 1000 * 60 * 60 * 24,
  });
  console.log(token);
}
main().catch(console.error);
