// C:\Users\dell\Desktop\WolfieFind\sbu-map-backend\prisma\seed.js

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Start seeding...');

  // 1. Clean up old data
  await prisma.comment.deleteMany();
  await prisma.vote.deleteMany();
  await prisma.submission.deleteMany();
  await prisma.resource.deleteMany();
  await prisma.entrance.deleteMany();
  await prisma.building.deleteMany();
  console.log('Cleaned old data.');

  // 2. Create Buildings
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
            // lat and lon are NULL for indoor resources
            floor: '2',
            description: 'Located near the main staircase.',
          },
          {
            name: 'Vending Machine - 1st Floor',
            category: 'vending_machine',
            // lat and lon are NULL for indoor resources
            floor: '1',
            description: 'Near the main entrance.',
          },
        ],
      },
    },
  });
  console.log(`Created building: ${library.name}`);

  const javits = await prisma.building.create({
    data: {
      name: 'Javits Center',
      campus_area: 'Academic Mall',
      entrances: {
        create: [{ name: 'Main Lecture Hall Entrance', lat: 40.9157, lon: -73.1219 }],
      },
    },
  });
  console.log(`Created building: ${javits.name}`);

  const sac = await prisma.building.create({
    data: {
      name: 'Student Activities Center (SAC)',
      campus_area: 'Academic Mall',
      entrances: {
        create: [
          { name: 'Main Entrance (by Bus Loop)', lat: 40.9139, lon: -73.1230 },
          { name: 'Auditorium Entrance', lat: 40.9141, lon: -73.1235 },
        ],
      },
      resources: {
        create: [
          {
            name: 'Drinking Fountain by Auditorium',
            category: 'drinking_water_filler',
            floor: '1',
            description: 'Outside the main auditorium doors.'
            // lat and lon are NULL
          }
        ]
      }
    },
  });
  console.log(`Created building: ${sac.name}`);

  const staller = await prisma.building.create({
    data: {
      name: 'Staller Center',
      campus_area: 'Academic Mall',
      entrances: {
        create: [{ name: 'Main Entrance', lat: 40.9158, lon: -73.1245 }],
      },
    },
  });
  console.log(`Created building: ${staller.name}`);


  // 3. Create an outdoor resource (not tied to a building)
  const outdoorBench = await prisma.resource.create({
    data: {
      name: 'ESS Building Bench',
      category: 'bench',
      lat: 40.9130, // Has lat/lon
      lon: -73.1200, // Has lat/lon
      description: 'Faces the fountain.',
      building_id: null // No building
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