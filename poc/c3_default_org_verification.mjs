// PoC/verification for C3 -- organizationId nullable with .default(1) across tenant tables.
// Statically parses the REAL drizzle/schema.ts you uploaded (no drizzle-orm dependency
// needed for this -- it's plain text scanning of your actual schema file) and:
//   1. Lists every table carrying `organizationId: int(...).default(1)` (nullable + defaulted)
//   2. Simulates, in plain JS, what a Drizzle insert does when a required-looking field
//      is simply omitted from the values object -- i.e. reproduces the actual failure mode.
import { readFileSync } from "node:fs";

const schemaPath = new URL("../drizzle/schema.ts", import.meta.url);
const schema = readFileSync(schemaPath, "utf8");

const lines = schema.split("\n");
let currentTable = null;
const affected = [];
lines.forEach((line, i) => {
  const tableMatch = line.match(/export const (\w+) = mysqlTable\("(\w+)"/);
  if (tableMatch) currentTable = { varName: tableMatch[1], sqlName: tableMatch[2] };
  if (/organizationId.*\.default\(1\)/.test(line) && currentTable) {
    affected.push({ ...currentTable, line: i + 1, raw: line.trim() });
  }
});

console.log("=".repeat(80));
console.log(`C3 verification -- organizationId nullable+default(1) tables in drizzle/schema.ts`);
console.log("=".repeat(80));
console.log(`\nFound ${affected.length} tables with this exact pattern:\n`);
affected.forEach(a => console.log(`  line ${a.line}: ${a.sqlName.padEnd(28)} -- ${a.raw}`));

console.log("\n" + "-".repeat(80));
console.log("Simulated consequence: what happens when an insert omits organizationId");
console.log("-".repeat(80));

// This mirrors exactly how mysql2 / drizzle handles an omitted column with a
// schema-level DEFAULT: the column is left out of the generated INSERT column list
// entirely, and MySQL substitutes the schema default at insert time.
function simulateInsert(table, values) {
  const columns = Object.keys(values);
  const placeholders = columns.map(() => "?").join(", ");
  const sql = `INSERT INTO ${table} (${columns.join(", ")}) VALUES (${placeholders})`;
  return { sql, boundValues: Object.values(values), note: columns.includes("organizationId")
    ? "organizationId explicitly bound -- safe"
    : "organizationId NOT in the column list -- MySQL will silently substitute DEFAULT 1" };
}

const devForgotOrgId = { firstName: "Test", lastName: "Child", classId: 5 }; // no organizationId set
const result = simulateInsert("children", devForgotOrgId);
console.log("\nDeveloper writes: db.insert(children).values({ firstName: 'Test', lastName: 'Child', classId: 5 })");
console.log("Generated SQL:   ", result.sql);
console.log("Outcome:         ", result.note);
console.log("\n>> No exception is thrown anywhere in this path -- TypeScript allows it because the");
console.log(">> column is optional (nullable + has a default), and MySQL silently fills in 1.");
console.log(">> The row is now silently attached to organization #1 regardless of which");
console.log(">> organization the calling request actually belonged to.");
