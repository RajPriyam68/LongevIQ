import { execFileSync } from 'node:child_process';
import path from 'node:path';

const repoRoot = path.resolve(process.cwd(), '../..');
const schemaPath = path.join(repoRoot, 'apps/api/prisma/schema.prisma');

export default function setup() {
  process.env.DATABASE_URL ??= 'postgresql://longeviq:longeviq@localhost:5432/longeviq_test';
  if (!process.env.DATABASE_URL) {
    console.warn('DATABASE_URL not set; skipping database migration for integration tests.');
    return;
  }
  execFileSync('npx', ['prisma', 'migrate', 'deploy', '--schema', schemaPath], {
    cwd: repoRoot,
    stdio: 'inherit',
    env: process.env,
  });
}
