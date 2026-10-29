import "dotenv/config";
import { createDatabase } from "../src/lib/database.js";

if (!process.env.DATABASE_URL) throw new Error("DATABASE_URL is required to seed the database.");
const database = createDatabase(process.env.DATABASE_URL);
const users = [
  { displayName: "Alex Morgan", email: "alex@example.com" },
  { displayName: "Jamie Lee", email: "jamie@example.com" },
  { displayName: "Sam Rivera", email: "sam@example.com" },
  { displayName: "Taylor Chen", email: "taylor@example.com" },
  { displayName: "Jordan Park", email: "jordan@example.com" },
  { displayName: "Casey Williams", email: "casey@example.com" },
];

try {
  for (const user of users) {
    // Re-running seed does not overwrite manual edits or duplicate records.
    await database.user.upsert({ where: { email: user.email }, update: {}, create: user });
  }
  console.info("Seeded fictional example users.");
} finally {
  await database.$disconnect();
}
