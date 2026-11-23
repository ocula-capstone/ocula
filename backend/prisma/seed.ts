import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/common/password.js';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

const branches = [
  { code: 'PASAY', name: 'MRB Optical Clinic Pasay' },
  { code: 'TAGUIG', name: 'MRB Optical Clinic Taguig' },
];

async function seedBranches() {
  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: { name: branch.name },
      create: branch,
    });
  }
  console.log(`Branches: ${branches.length} ready.`);
}

// OCULA has exactly one admin. It is created once from .env and must change its password on first login.
async function seedAdmin() {
  const existing = await prisma.user.findFirst({ where: { role: 'admin' } });
  if (existing) {
    console.log(`Admin: already exists (${existing.email}), left unchanged.`);
    return;
  }

  const email = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.ADMIN_INITIAL_PASSWORD;
  if (!email || !password || password.length < 12) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_INITIAL_PASSWORD (at least 12 characters) in backend/.env to create the admin.',
    );
  }

  await prisma.user.create({
    data: {
      email,
      passwordHash: await hashPassword(password),
      fullName: process.env.ADMIN_FULL_NAME?.trim() || 'OCULA Administrator',
      role: 'admin',
      mustChangePassword: true,
    },
  });
  console.log(
    `Admin: created ${email}. It must change its password on first login.`,
  );
}

async function main() {
  await seedBranches();
  await seedAdmin();
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
