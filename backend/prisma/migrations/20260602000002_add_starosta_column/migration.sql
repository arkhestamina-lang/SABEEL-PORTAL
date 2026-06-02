-- AddColumn to Group table
ALTER TABLE "Group" ADD COLUMN "starostaId" INTEGER;

-- AddForeignKey
ALTER TABLE "Group" ADD CONSTRAINT "Group_starostaId_fkey" 
  FOREIGN KEY ("starostaId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Group_starostaId_key" ON "Group"("starostaId");
