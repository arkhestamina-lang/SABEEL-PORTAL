-- CreateEnum for HabitType if not exists
DO $$ BEGIN
  CREATE TYPE "HabitType" AS ENUM ('READING', 'LISTENING', 'REVISION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable HomeworkPhoto
CREATE TABLE IF NOT EXISTS "HomeworkPhoto" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateTable HomeworkSubmission
CREATE TABLE IF NOT EXISTS "HomeworkSubmission" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id")
);

-- CreateTable HomeworkMiss
CREATE TABLE IF NOT EXISTS "HomeworkMiss" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HomeworkMiss_pkey" PRIMARY KEY ("id")
);

-- CreateTable QuranEntry
CREATE TABLE IF NOT EXISTS "QuranEntry" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "pagesCompleted" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "QuranEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable HabitEntry
CREATE TABLE IF NOT EXISTS "HabitEntry" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reading" BOOLEAN NOT NULL DEFAULT false,
    "listening" BOOLEAN NOT NULL DEFAULT false,
    "revision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HabitEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable AttendanceMark
CREATE TABLE IF NOT EXISTS "AttendanceMark" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "present" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AttendanceMark_pkey" PRIMARY KEY ("id")
);

-- CreateTable AbsenceEvidence (if not exists)
CREATE TABLE IF NOT EXISTS "AbsenceEvidence" (
    "id" SERIAL NOT NULL,
    "absenceRequestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AbsenceEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable DebtEvidence (if not exists - already created in previous migration but need to handle if not)
CREATE TABLE IF NOT EXISTS "DebtEvidence" (
    "id" SERIAL NOT NULL,
    "debtRequestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtEvidence_pkey" PRIMARY KEY ("id")
);

-- Add foreign keys for HomeworkPhoto
ALTER TABLE "HomeworkPhoto" ADD CONSTRAINT "HomeworkPhoto_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HomeworkPhoto" ADD CONSTRAINT "HomeworkPhoto_lessonId_fkey" 
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign keys for HomeworkSubmission
ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HomeworkSubmission" ADD CONSTRAINT "HomeworkSubmission_lessonId_fkey" 
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign keys for HomeworkMiss
ALTER TABLE "HomeworkMiss" ADD CONSTRAINT "HomeworkMiss_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HomeworkMiss" ADD CONSTRAINT "HomeworkMiss_lessonId_fkey" 
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign keys for QuranEntry
ALTER TABLE "QuranEntry" ADD CONSTRAINT "QuranEntry_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign keys for HabitEntry
ALTER TABLE "HabitEntry" ADD CONSTRAINT "HabitEntry_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign keys for AttendanceMark
ALTER TABLE "AttendanceMark" ADD CONSTRAINT "AttendanceMark_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AttendanceMark" ADD CONSTRAINT "AttendanceMark_lessonId_fkey" 
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add foreign keys for AbsenceEvidence
ALTER TABLE "AbsenceEvidence" ADD CONSTRAINT "AbsenceEvidence_absenceRequestId_fkey" 
  FOREIGN KEY ("absenceRequestId") REFERENCES "AbsenceRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Add unique constraints where needed
CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkSubmission_studentId_lessonId_key" ON "HomeworkSubmission"("studentId", "lessonId");
CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkMiss_studentId_lessonId_key" ON "HomeworkMiss"("studentId", "lessonId");
CREATE UNIQUE INDEX IF NOT EXISTS "QuranEntry_studentId_weekStart_key" ON "QuranEntry"("studentId", "weekStart");
CREATE UNIQUE INDEX IF NOT EXISTS "HabitEntry_studentId_date_key" ON "HabitEntry"("studentId", "date");
CREATE UNIQUE INDEX IF NOT EXISTS "AttendanceMark_studentId_lessonId_key" ON "AttendanceMark"("studentId", "lessonId");
