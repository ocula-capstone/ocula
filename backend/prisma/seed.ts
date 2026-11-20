import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client';

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DIRECT_URL }),
});

const branches = [
  { code: 'PASAY', name: 'MRB Optical Clinic Pasay' },
  { code: 'TAGUIG', name: 'MRB Optical Clinic Taguig' },
];

async function main() {
  for (const branch of branches) {
    await prisma.branch.upsert({
      where: { code: branch.code },
      update: { name: branch.name },
      create: branch,
    });
  }
  console.log(`Seeded ${branches.length} branches.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
