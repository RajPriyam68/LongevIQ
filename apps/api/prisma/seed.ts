import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';
import { env } from '../src/config/env.js';

const prisma = new PrismaClient();

async function upsertUser(input: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: 'USER' | 'DOCTOR' | 'ADMIN';
  emailVerified: boolean;
}) {
  const passwordHash = await argon2.hash(input.password, {
    type: argon2.argon2id,
    memoryCost: 19_456,
    timeCost: 2,
    parallelism: 1,
  });

  const user = await prisma.user.upsert({
    where: { email: input.email },
    update: {
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      emailVerified: input.emailVerified,
      isActive: true,
    },
    create: {
      email: input.email,
      passwordHash,
      firstName: input.firstName,
      lastName: input.lastName,
      role: input.role,
      emailVerified: input.emailVerified,
    },
  });

  console.log(`Seeded ${input.role}: ${user.email}`);
}

async function main() {
  await upsertUser({
    email: process.env.SEED_ADMIN_EMAIL ?? 'admin@longeviq.dev',
    password: process.env.SEED_ADMIN_PASSWORD ?? 'AdminPass123!',
    firstName: 'Admin',
    lastName: 'LongevIQ',
    role: 'ADMIN',
    emailVerified: true,
  });

  await upsertUser({
    email: process.env.SEED_DOCTOR_EMAIL ?? 'doctor@longeviq.dev',
    password: process.env.SEED_DOCTOR_PASSWORD ?? 'DoctorPass123!',
    firstName: 'Dr. Sarah',
    lastName: 'Chen',
    role: 'DOCTOR',
    emailVerified: true,
  });

  await upsertUser({
    email: process.env.SEED_USER_EMAIL ?? 'demo@longeviq.dev',
    password: process.env.SEED_USER_PASSWORD ?? 'DemoPass123!',
    firstName: 'Alex',
    lastName: 'Rivera',
    role: 'USER',
    emailVerified: true,
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
