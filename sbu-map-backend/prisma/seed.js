// C:\Users\dell\Desktop\WolfieFind\sbu-map-backend\prisma\seed.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Clean up old data
  // We must delete in the correct order to avoid foreign key errors
  await prisma.comment.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.entrance.deleteMany();
  await prisma.building.deleteMany();
  console.log('Cleaned old data.');

  // 2. Create Melville Library (with its entrances and resources)
  const library = await prisma.building.create({
    data: {
      name: 'Melville Library',
      campus_area: 'Academic Mall',
      entrances: {
        create: [
          { name: 'Main Entrance (Fountain)', lat: 40.9149, lon: -73.1232 },
          { name: 'Side Entrance (SAC)', lat: 40.9145, lon: -73.1230 },
        ],
      },
      resources: {
        create: [
          {
            name: 'Printer - 2nd Floor',
            category: 'printer',
            lat: 40.9148,
            lon: -73.1231,
            floor: '2',
            description: 'Located near the main staircase.',
          },
          {
            name: 'Vending Machine - 1st Floor',
            category: 'vending_machine',
            lat: 40.9147,
            lon: -73.1233,
            floor: '1',
            description: 'Near the main entrance.',
          }
        ],
      },
    },
  });
  console.log(`Created building: ${library.name}`);

  // 3. Create an outdoor resource (not tied to a building)
  const outdoorBench = await prisma.resource.create({
    data: {
      name: 'ESS Building Bench',
      category: 'bench',
      lat: 40.9130,
      lon: -73.1200,
      description: 'Faces the fountain.',
      // building_id is null by default
    },
  });
  console.log(`Created outdoor resource: ${outdoorBench.name}`);

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });