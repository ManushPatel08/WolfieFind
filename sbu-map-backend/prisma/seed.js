/* REPLACE: sbu-map-backend/prisma/seed.js */
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

  // 2. Create Buildings and their INDOOR resources
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
            name: 'Vending Machine - 1st Floor',
            category: 'vending_machine',
            floor: '1',
            description: 'Near the main entrance.',
          },
          {
            name: 'Printer - Mellville Library',
            category: 'printer', // Standardized
            floor: '1',
            description: 'Below main Staircase.'
          },
          {
            name: 'Drinking water - Mellville Library',
            category: 'drinking_water_filler', // Standardized
            floor: '1',
            description: 'Near the restrooms.'
          },
          {
            name: 'Study Room A - Mellville Library',
            category: 'study_room',
            floor: '2',
            description: 'Second floor, next to the computer lab.'
          },
          {
            name: 'Restrooms - Mellville Library',
            category: 'toilets', // Standardized
            floor: '1',
            description: 'First floor, near the main entrance.'
          },
          {
            name: 'Computer Lab - Mellville Library',
            category: 'computer_labs', // Standardized
            floor: '2',
            description: 'Second floor, beside Study Room A.'
          },
          {
            name: 'Elevator - Mellville Library',
            category: 'elevator',
            floor: '1',
            description: 'Near the main entrance, provides access to all floors.'
          },
          {
            name: 'Cafeteria - Mellville Library',
            category: 'cafeteria',
            floor: '1',
            description: 'First floor, adjacent to the reading area.'
          },
          {
            name: 'Information Desk - Mellville Library',
            category: 'information_desk',
            floor: '1',
            description: 'Located at the main entrance for assistance.'
          },
          {
            name: 'Book Return - Mellville Library',
            category: 'book_return',
            floor: '1',
            description: 'Next to the Information Desk.'
          },
          {
            name: 'Quiet Study Area - Mellville Library',
            category: 'quiet_study',
            floor: '2',
            description: 'Second floor, at the back of the library.'
          },
          {
            name: 'Group Study Room B - Mellville Library',
            category: 'group_study_room',
            floor: '2',
            description: 'Second floor, near the Quiet Study Area.'
          },
          {
            name: 'Charging Spot - Mellville Library',
            category: 'charging_spots', // Standardized
            floor: '1',
            description: 'Central Reading room.'
          }
        ],
      },
    },
  });
  console.log(`Created building: ${library.name}`);

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
          },
          {
            name: 'SAC Indoor Printer',
            category: 'printer',
            floor: '1',
            description: 'Near the West entrance of SAC , up the stairs .'
          },
          {
            name: 'SAC Indoor Restrooms',
            category: 'toilets', // Standardized
            floor: '1',
            description: 'Located on the first floor down the hallway to the right from the West entrance.'
          },
          {
            name: 'SAC Ballroom A & B',
            category: 'ballroom',
            floor: '1',
            description: 'Located on the first floor down the hallway to the right from the West entrance.'
          },
          {
            name: 'Dunkin Donuts - SAC',
            category: 'food',
            floor: '1',
            description: 'up the stairs near West entrance.'
          }
        ]
      }
    },
  });
  console.log(`Created building: ${sac.name}`);

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

  // 3. Create OUTDOOR resources
  await prisma.resource.create({
    data: {
      name: 'ESS Building Bench',
      category: 'bench',
      lat: 40.9130,
      lon: -73.1200,
      description: 'Faces the fountain.',
      building_id: null
    },
  });

  await prisma.resource.createMany({
    data: [
      {
        name: 'Bike Rack - Outside Mellville Library',
        category: 'bike_rack',
        lat: 40.914943,
        lon: -73.122649,
        description: 'Located near the main entrance of the library.',
        building_id: null
      },
      {
        name: 'Bus Stop - Outside Mellville Library',
        category: 'bus_stops', // Standardized
        lat: 40.914315,
        lon: -73.124717,
        description: 'Across the street from the library entrance.',
        building_id: null
      },
      {
        name: 'Garden Area - Outside Mellville Library',
        category: 'garden_area',
        lat: 40.915230,
        lon: -73.122006,
        description: 'To the left of the main entrance, featuring benches and greenery.',
        building_id: null
      },
      {
        name: 'SINC Sites - Outside Mellville Library',
        category: 'study_room', 
        lat: 40.914943,
        lon: -73.122649,
        description: 'left of International Student Center. South Entrance',
        building_id: null
      },
      {
        name: 'SAC Plaza Benches',
        category: 'bench',
        lat: 40.914600,
        lon: -73.123600,
        description: 'Benches surrounding the fountain area.',
        building_id: null
      },
      {
        name: 'Food Trucks - SAC Plaza',
        category: 'food_trucks', // Standardized
        lat: 40.914700,
        lon: -73.123500,
        description: 'Food trucks located near SAC Plaza.',
        building_id: null
      }
    ]
  });

  console.log('Outdoor resources created.');
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