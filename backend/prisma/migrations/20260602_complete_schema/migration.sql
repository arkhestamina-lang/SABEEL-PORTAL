-- Add missing columns to Group
ALTER TABLE "Group" ADD COLUMN IF NOT EXISTS "starostaId" INTEGER UNIQUE;
ALTER TABLE "Group" ADD CONSTRAINT "Group_starostaId_fkey" FOREIGN KEY ("starostaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add missing columns to Lesson
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isCancelled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isExtra" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT;

-- Add missing columns to User
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "telegramUsername" TEXT;

-- HomeworkPhoto
CREATE TABLE IF NOT EXISTS "HomeworkPhoto" (
    "id" SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES "User"("id"),
    "lessonId" INTEGER NOT NULL REFERENCES "Lesson"("id"),
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HomeworkSubmission
CREATE TABLE IF NOT EXISTS "HomeworkSubmission" (
    "id" SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES "User"("id"),
    "lessonId" INTEGER NOT NULL REFERENCES "Lesson"("id"),
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("studentId", "lessonId")
);

-- HomeworkMiss
CREATE TABLE IF NOT EXISTS "HomeworkMiss" (
    "id" SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES "User"("id"),
    "lessonId" INTEGER NOT NULL REFERENCES "Lesson"("id"),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("studentId", "lessonId")
);

-- QuranEntry
CREATE TABLE IF NOT EXISTS "QuranEntry" (
    "id" SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES "User"("id"),
    "weekStart" TIMESTAMP(3) NOT NULL,
    "pagesCompleted" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("studentId", "weekStart")
);

-- HabitEntry
CREATE TABLE IF NOT EXISTS "HabitEntry" (
    "id" SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES "User"("id"),
    "date" TIMESTAMP(3) NOT NULL,
    "reading" BOOLEAN NOT NULL DEFAULT false,
    "listening" BOOLEAN NOT NULL DEFAULT false,
    "revision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("studentId", "date")
);

-- AttendanceMark
CREATE TABLE IF NOT EXISTS "AttendanceMark" (
    "id" SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES "User"("id"),
    "lessonId" INTEGER NOT NULL REFERENCES "Lesson"("id"),
    "present" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE("studentId", "lessonId")
);

-- AbsenceEvidence
CREATE TABLE IF NOT EXISTS "AbsenceEvidence" (
    "id" SERIAL PRIMARY KEY,
    "absenceRequestId" INTEGER NOT NULL REFERENCES "AbsenceRequest"("id"),
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- HomeworkDebtRequest
CREATE TABLE IF NOT EXISTS "HomeworkDebtRequest" (
    "id" SERIAL PRIMARY KEY,
    "studentId" INTEGER NOT NULL REFERENCES "User"("id"),
    "lessonId" INTEGER NOT NULL REFERENCES "Lesson"("id"),
    "reason" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),
    UNIQUE("studentId", "lessonId")
);

-- DebtEvidence
CREATE TABLE IF NOT EXISTS "DebtEvidence" (
    "id" SERIAL PRIMARY KEY,
    "debtRequestId" INTEGER NOT NULL REFERENCES "HomeworkDebtRequest"("id"),
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
