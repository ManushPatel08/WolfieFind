/*
  Warnings:

  - A unique constraint covering the columns `[category,building_id]` on the table `resources` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "resources" ALTER COLUMN "lat" DROP NOT NULL,
ALTER COLUMN "lon" DROP NOT NULL;

-- AlterTable
ALTER TABLE "submissions" ALTER COLUMN "lat" DROP NOT NULL,
ALTER COLUMN "lon" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "resources_category_building_id_key" ON "resources"("category", "building_id");
