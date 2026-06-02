-- CreateEnum for DebtStatus if not exists
DO $$ BEGIN
  CREATE TYPE "DebtStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- CreateTable HomeworkDebtRequest
CREATE TABLE IF NOT EXISTS "HomeworkDebtRequest" (
    "id" SERIAL NOT NULL,
    "studentId" INTEGER NOT NULL,
    "lessonId" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "DebtStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resolvedAt" TIMESTAMP(3),

    CONSTRAINT "HomeworkDebtRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable DebtEvidence
CREATE TABLE IF NOT EXISTS "DebtEvidence" (
    "id" SERIAL NOT NULL,
    "debtRequestId" INTEGER NOT NULL,
    "fileName" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DebtEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "HomeworkDebtRequest_studentId_lessonId_key" ON "HomeworkDebtRequest"("studentId", "lessonId");

-- AddForeignKey
ALTER TABLE "HomeworkDebtRequest" ADD CONSTRAINT "HomeworkDebtRequest_studentId_fkey" 
  FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HomeworkDebtRequest" ADD CONSTRAINT "HomeworkDebtRequest_lessonId_fkey" 
  FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "DebtEvidence" ADD CONSTRAINT "DebtEvidence_debtRequestId_fkey" 
  FOREIGN KEY ("debtRequestId") REFERENCES "HomeworkDebtRequest"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
