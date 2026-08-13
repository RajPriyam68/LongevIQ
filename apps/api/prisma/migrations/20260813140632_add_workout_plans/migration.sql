-- CreateEnum
CREATE TYPE "WorkoutGoal" AS ENUM ('LOSE_WEIGHT', 'MUSCLE_GAIN', 'GENERAL_FITNESS', 'ENDURANCE');

-- CreateEnum
CREATE TYPE "FitnessLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'ADVANCED');

-- CreateEnum
CREATE TYPE "WorkoutEquipment" AS ENUM ('NONE', 'BASIC', 'FULL_GYM');

-- CreateEnum
CREATE TYPE "WorkoutDayFocus" AS ENUM ('FULL_BODY', 'UPPER_BODY', 'LOWER_BODY', 'PUSH', 'PULL', 'LEGS', 'CORE', 'CARDIO');

-- CreateTable
CREATE TABLE "WorkoutPlan" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "goal" "WorkoutGoal" NOT NULL,
    "fitnessLevel" "FitnessLevel" NOT NULL,
    "equipment" "WorkoutEquipment" NOT NULL,
    "age" INTEGER NOT NULL,
    "sex" "BiologicalSex" NOT NULL,
    "weightKg" DOUBLE PRECISION NOT NULL,
    "heightCm" DOUBLE PRECISION NOT NULL,
    "daysPerWeek" INTEGER NOT NULL,
    "sessionDurationMinutes" INTEGER NOT NULL,
    "strengthSessions" INTEGER NOT NULL,
    "cardioSessions" INTEGER NOT NULL,
    "weeklyMinutes" INTEGER NOT NULL,
    "warmupMinutesPerSession" INTEGER NOT NULL,
    "mainMinutesPerSession" INTEGER NOT NULL,
    "cooldownMinutesPerSession" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WorkoutPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutDay" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "dayNumber" INTEGER NOT NULL,
    "focus" "WorkoutDayFocus" NOT NULL,
    "durationMinutes" INTEGER NOT NULL,
    "warmupMinutes" INTEGER NOT NULL,
    "mainMinutes" INTEGER NOT NULL,
    "cooldownMinutes" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "WorkoutDay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutExercise" (
    "id" TEXT NOT NULL,
    "dayId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER NOT NULL,
    "reps" TEXT NOT NULL,
    "restSeconds" INTEGER NOT NULL,
    "notes" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WorkoutExercise_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WorkoutPlan_userId_createdAt_idx" ON "WorkoutPlan"("userId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "WorkoutDay_planId_dayNumber_key" ON "WorkoutDay"("planId", "dayNumber");

-- CreateIndex
CREATE INDEX "WorkoutExercise_dayId_sortOrder_idx" ON "WorkoutExercise"("dayId", "sortOrder");

-- AddForeignKey
ALTER TABLE "WorkoutPlan" ADD CONSTRAINT "WorkoutPlan_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutDay" ADD CONSTRAINT "WorkoutDay_planId_fkey" FOREIGN KEY ("planId") REFERENCES "WorkoutPlan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutExercise" ADD CONSTRAINT "WorkoutExercise_dayId_fkey" FOREIGN KEY ("dayId") REFERENCES "WorkoutDay"("id") ON DELETE CASCADE ON UPDATE CASCADE;
