-- Drop and recreate HomeworkSubmission properly
DROP TABLE IF EXISTS "HomeworkSubmission" CASCADE;

CREATE TABLE "HomeworkSubmission" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomeworkSubmission_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HomeworkSubmission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "HomeworkSubmission_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HomeworkSubmission_studentId_lessonId_key" ON "HomeworkSubmission"("studentId", "lessonId");

-- Ensure all other critical tables exist
CREATE TABLE IF NOT EXISTS "HomeworkPhoto" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomeworkPhoto_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HomeworkPhoto_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id"),
    CONSTRAINT "HomeworkPhoto_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
);

CREATE TABLE IF NOT EXISTS "HomeworkMiss" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HomeworkMiss_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HomeworkMiss_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id"),
    CONSTRAINT "HomeworkMiss_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
);

CREATE TABLE IF NOT EXISTS "QuranEntry" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "pagesCompleted" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "QuranEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "QuranEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "HabitEntry" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "reading" BOOLEAN NOT NULL DEFAULT false,
    "listening" BOOLEAN NOT NULL DEFAULT false,
    "revision" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HabitEntry_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "HabitEntry_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id")
);

CREATE TABLE IF NOT EXISTS "AttendanceMark" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "present" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AttendanceMark_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AttendanceMark_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id"),
    CONSTRAINT "AttendanceMark_lessonId_fkey" FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
);

CREATE TABLE IF NOT EXISTS "AbsenceEvidence" (
    "id" SERIAL NOT NULL,
    "absenceRequestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AbsenceEvidence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "AbsenceEvidence_absenceRequestId_fkey" FOREIGN KEY ("absenceRequestId") REFERENCES "AbsenceRequest"("id")
);

CREATE TABLE IF NOT EXISTS "DebtEvidence" (
    "id" SERIAL NOT NULL,
    "debtRequestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DebtEvidence_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "DebtEvidence_debtRequestId_fkey" FOREIGN KEY ("debtRequestId") REFERENCES "HomeworkDebtRequest"("id")
);

-- Ensure Lesson has all columns
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isCancelled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "isExtra" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "note" TEXT;
ALTER TABLE "Lesson" ADD COLUMN IF NOT EXISTS "meetingUrl" TEXT;
