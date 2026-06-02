-- AddColumn to Lesson table
ALTER TABLE "Lesson" ADD COLUMN "isCancelled" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN "isExtra" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Lesson" ADD COLUMN "note" TEXT;
ALTER TABLE "Lesson" ADD COLUMN "meetingUrl" TEXT;
