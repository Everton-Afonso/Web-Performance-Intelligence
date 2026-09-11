import { execFileSync } from "node:child_process";
import { rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const testDbPath = resolve(root, "prisma", "test.db");

/**
 * Prepares the SQLite test database used by PrismaRepository tests:
 * removes any previous database and applies the test schema.
 */
export default function globalSetup(): void {
  rmSync(testDbPath, { force: true });

  const prismaCli = resolve(root, "node_modules", "prisma", "build", "index.js");
  execFileSync(
    process.execPath,
    [prismaCli, "db", "push", "--schema", "prisma/schema.test.prisma", "--skip-generate"],
    {
      cwd: root,
      env: { ...process.env, DATABASE_URL_TEST: "file:./test.db" },
      stdio: "ignore"
    }
  );
}