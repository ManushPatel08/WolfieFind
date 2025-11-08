/*
  Warnings:

  - You are about to drop the column `building_name_suggestion` on the `submissions` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "submissions" DROP COLUMN "building_name_suggestion",
ADD COLUMN     "building_id" INTEGER;

-- CreateIndex
CREATE INDEX "submissions_category_building_id_status_idx" ON "submissions"("category", "building_id", "status");

-- AddForeignKey
ALTER TABLE "submissions" ADD CONSTRAINT "submissions_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;
