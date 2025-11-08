-- CreateTable
CREATE TABLE "buildings" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "campus_area" TEXT,

    CONSTRAINT "buildings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "entrances" (
    "id" SERIAL NOT NULL,
    "building_id" INTEGER NOT NULL,
    "name" TEXT,
    "lat" DECIMAL(65,30) NOT NULL,
    "lon" DECIMAL(65,30) NOT NULL,

    CONSTRAINT "entrances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "resources" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "lat" DECIMAL(65,30) NOT NULL,
    "lon" DECIMAL(65,30) NOT NULL,
    "building_id" INTEGER,
    "floor" TEXT,
    "description" TEXT,

    CONSTRAINT "resources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "submissions" (
    "id" SERIAL NOT NULL,
    "submitter_id" TEXT NOT NULL,
    "submitter_name" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "category" TEXT NOT NULL,
    "lat" DECIMAL(65,30) NOT NULL,
    "lon" DECIMAL(65,30) NOT NULL,
    "building_name_suggestion" TEXT,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',

    CONSTRAINT "submissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "votes" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "vote_type" INTEGER NOT NULL,

    CONSTRAINT "votes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comments" (
    "id" SERIAL NOT NULL,
    "submission_id" INTEGER NOT NULL,
    "user_id" TEXT NOT NULL,
    "user_name" TEXT,
    "comment" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "comments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "votes_submission_id_user_id_key" ON "votes"("submission_id", "user_id");

-- AddForeignKey
ALTER TABLE "entrances" ADD CONSTRAINT "entrances_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "resources" ADD CONSTRAINT "resources_building_id_fkey" FOREIGN KEY ("building_id") REFERENCES "buildings"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "votes" ADD CONSTRAINT "votes_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "comments" ADD CONSTRAINT "comments_submission_id_fkey" FOREIGN KEY ("submission_id") REFERENCES "submissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
