/* REPLACE: sbu-map-backend/prisma/seed.js */
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// --- New Extended Data ---
const newData = {
  "MellvilleLibraryResources": {
    "1": { "name": "Printer - Mellville Library", "category": "printer", "floor": 1, "description": "Below main Staircase." },
    "2": { "name": "Drinking water - Mellville Library", "category": "drinking_water", "floor": 1, "description": "Near the restrooms." },
    "3": { "name": "Study Room A - Mellville Library", "category": "study_room", "floor": 2, "description": "Second floor, next to the computer lab." },
    "4": { "name": "Restrooms - Mellville Library", "category": "restroom", "floor": 1, "description": "First floor, near the main entrance." },
    "5": { "name": "Computer Lab - Mellville Library", "category": "computer_lab", "floor": 2, "description": "Second floor, beside Study Room A." },
    "6": { "name": "Elevator - Mellville Library", "category": "elevator", "floor": 1, "description": "Near the main entrance, provides access to all floors." },
    "7": { "name": "Cafeteria - Mellville Library", "category": "cafeteria", "floor": 1, "description": "First floor, adjacent to the reading area." },
    "8": { "name": "Information Desk - Mellville Library", "category": "information_desk", "floor": 1, "description": "Located at the main entrance for assistance." },
    "9": { "name": "Book Return - Mellville Library", "category": "book_return", "floor": 1, "description": "Next to the Information Desk." },
    "10": { "name": "Quiet Study Area - Mellville Library", "category": "quiet_study", "floor": 2, "description": "Second floor, at the back of the library." },
    "11": { "name": "Group Study Room B - Mellville Library", "category": "group_study_room", "floor": 2, "description": "Second floor, near the Quiet Study Area." },
    "12": { "name": "Charging Spot - Mellville Library", "category": "charging_spot", "floor": 1, "description": "Central Reading room." }
  },
  "OutsideMellvilleLibrary": {
    "1": { "name": "Bike Rack - Outside Mellville Library", "category": "bike_rack", "latitude": 40.914943, "longitude": -73.122649, "description": "Located near the main entrance of the library." },
    "2": { "name": "Bus Stop - Outside Mellville Library", "category": "bus_stop", "latitude": 40.914315, "longitude": -73.124717, "description": "Across the street from the library entrance." },
    "3": { "name": "Garden Area - Outside Mellville Library", "category": "garden_area", "latitude": 40.915230, "longitude": -73.122006, "description": "To the left of the main entrance, featuring benches and greenery." },
    "4": { "name": "SINC Sites - Outside Mellville Library", "category": "study_room", "latitude": 40.914943, "longitude": -73.122649, "description": "left of International Student Center. South Entrance" }
  },
  "SACPlaza": {
    "1": { "name": "SAC Plaza Benches", "category": "bench", "latitude": 40.914600, "longitude": -73.123600, "description": "Benches surrounding the fountain area." },
    "2": { "name": "Food Trucks - SAC Plaza", "category": "food_truck", "latitude": 40.914700, "longitude": -73.123500, "description": "Food trucks located near SAC Plaza." }
  },
  "SACIndoors": {
    "1": { "name": "SAC Indoor Printer", "category": "printer", "floor": 1, "description": "Near the West entrance of SAC , up the stairs ." },
    "2": { "name": "SAC Indoor Restrooms", "category": "restroom", "floor": 1, "description": "Located on the first floor down the hallway to the right from the West entrance." },
    "3": { "name": "SAC Ballroom A & B", "category": "ballroom", "floor": 1, "description": "Located on the first floor down the hallway to the right from the West entrance." },
    "4": { "name": "Dunkin Donuts - SAC", "category": "food", "floor": 1, "description": "up the stairs near West entrance." }
  },
  "JavitzConferenceCenter": {
    "1": { "name": "Javitz Printer", "category": "printer", "floor": 1, "description": "Located on the first floor near the central seating room." },
    "2": { "name": "Javitz Restrooms", "category": "restroom", "floor": 1, "description": "Located on the first floor near the central seating room." },
    "3": { "name": "Gender Neutral Restroom - Javitz", "category": "gender_neutral_bathrooms", "floor": 2, "description": "Located on the second floor." },
    "4": { "name": "Study Area - Javitz", "category": "study_room", "floor": 2, "description": "Located on the second floor." }
  },
  "StonyBrookUnion": {
    "1": { "name": "SBU Union Printer", "category": "printer", "floor": 1, "description": "Located near the main entrance." },
    "2": { "name": "SBU Union Restrooms", "category": "restroom", "floor": 1, "description": "Located near the main entrance." },
    "3": { "name": "SBU Pantry - SBU Union", "category": "pantry", "floor": 0, "description": "located on floor below the main entrance. take the stairs down." },
    "4": { "name": "Gaming room - SBU Union", "category": "gaming_room", "floor": 2, "description": "Located on the floor below the main entrance. take the stairs down." }
  },
  "Photographicspots": {
    "1": { "name": "Stony Brook University Sign", "category": "photographic_spot", "latitude": 40.915147, "longitude": -73.119026, "description": "Main sign at the entrance of Stony Brook University." },
    "2": { "name": "Wolfie Statue", "category": "photographic_spot", "latitude": 40.914706, "longitude": -73.122777, "description": "North of SAC behind a bench." }
  },
  "diningspots": {
    "1": { "name": "The East Side Dining", "category": "restaurant", "latitude": 40.916876, "longitude": -73.120842, "description": "Adjacent to Chavez hall." },
    "2": { "name": "The West Side Dining", "category": "restaurant", "latitude": 40.912991, "longitude": -73.130442, "description": "Adjacent to Dewey Hall." }
  }
};
// --- End New Data ---


/**
 * Standardizes category names to match the app's internal logic
 */
function standardizeCategory(category) {
  const categoryMap = {
    "drinking_water": "drinking_water_filler",
    "restroom": "toilets",
    "computer_lab": "computer_labs",
    "charging_spot": "charging_spots",
    "bus_stop": "bus_stops",
    "food_truck": "food_trucks",
    "restaurant": "restaurants",
    "photographic_spot": "photographic_spots",
    "gaming_room": "game_room",
  };
  return categoryMap[category] || category;
}

/**
 * Formats an indoor resource object for Prisma create
 */
function formatIndoorResource(resource) {
  return {
    name: resource.name,
    category: standardizeCategory(resource.category),
    floor: String(resource.floor), // Convert floor number to string
    description: resource.description,
  };
}

/**
 * Formats an outdoor resource object for Prisma create
 */
function formatOutdoorResource(resource) {
  return {
    name: resource.name,
    category: standardizeCategory(resource.category),
    lat: resource.latitude,  // Rename key
    lon: resource.longitude, // Rename key
    description: resource.description,
    building_id: null,
  };
}

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

  // 2. Define building structure, preserving existing entrances
  const buildingsData = {
    "Melville Library": {
      campus_area: "Academic Mall",
      entrances: [
        { name: 'Main Entrance (Fountain)', lat: 40.9149, lon: -73.1232 },
        { name: 'Side Entrance (SAC)', lat: 40.9145, lon: -73.1230 },
      ],
      resources: [],
    },
    "Student Activities Center (SAC)": {
      campus_area: "Academic Mall",
      entrances: [
        { name: 'Main Entrance (by Bus Loop)', lat: 40.9139, lon: -73.1230 },
        { name: 'Auditorium Entrance', lat: 40.9141, lon: -73.1235 },
      ],
      resources: [],
    },
    "Javits Center": {
      campus_area: "Academic Mall",
      entrances: [
        { name: 'Main Lecture Hall Entrance', lat: 40.9157, lon: -73.1219 }
      ],
      resources: [],
    },
    "Staller Center": {
      campus_area: "Academic Mall",
      entrances: [
        { name: 'Main Entrance', lat: 40.9158, lon: -73.1245 }
      ],
      resources: [],
    },
    "Stony Brook Union": {
      campus_area: "Academic Mall",
      entrances: [
        //
        // --- THIS IS THE FIX ---
        // Added the main entrance coordinates for the SBU Union
        //
        { name: 'Main Entrance', lat: 40.91655, lon: -73.12234 }
      ],
      resources: [],
    }
  };

  // 3. Populate indoor resources from new data
  for (const resource of Object.values(newData.MellvilleLibraryResources)) {
    buildingsData["Melville Library"].resources.push(formatIndoorResource(resource));
  }
  for (const resource of Object.values(newData.SACIndoors)) {
    buildingsData["Student Activities Center (SAC)"].resources.push(formatIndoorResource(resource));
  }
  for (const resource of Object.values(newData.JavitzConferenceCenter)) {
    buildingsData["Javits Center"].resources.push(formatIndoorResource(resource));
  }
  for (const resource of Object.values(newData.StonyBrookUnion)) {
    buildingsData["Stony Brook Union"].resources.push(formatIndoorResource(resource));
  }
  
  // 4. Create buildings with their entrances and indoor resources
  for (const [name, data] of Object.entries(buildingsData)) {
    // This try/catch will help debug if the Javits error happens again
    try {
      await prisma.building.create({
        data: {
          name: name,
          campus_area: data.campus_area,
          entrances: {
            create: data.entrances,
          },
          resources: {
            create: data.resources,
          },
        },
      });
      console.log(`Created building: ${name} with ${data.resources.length} resources.`);
    } catch (error) {
      console.error(`Failed to create building: ${name}`);
      console.error(error);
      // If it's the unique constraint error, log more details
      if (error.code === 'P2002') {
        console.error('This is a unique constraint error. Check for duplicate categories in the data for this building:', data.resources.map(r => r.category));
      }
      process.exit(1); // Exit on failure
    }
  }

  // 5. Populate and create all outdoor resources
  const outdoorResourcesToCreate = [];
  
  // Helper to process outdoor groups
  const processOutdoorGroup = (group) => {
    for (const resource of Object.values(group)) {
      outdoorResourcesToCreate.push(formatOutdoorResource(resource));
    }
  };
  
  processOutdoorGroup(newData.OutsideMellvilleLibrary);
  processOutdoorGroup(newData.SACPlaza);
  processOutdoorGroup(newData.Photographicspots);
  processOutdoorGroup(newData.diningspots);

  // Add any other standalone outdoor resources from the old seed file (e.g., ESS Bench)
  outdoorResourcesToCreate.push({
    name: 'ESS Building Bench',
    category: 'bench',
    lat: 40.9130,
    lon: -73.1200,
    description: 'Faces the fountain.',
    building_id: null
  });

  await prisma.resource.createMany({
    data: outdoorResourcesToCreate,
  });
  console.log(`Created ${outdoorResourcesToCreate.length} outdoor resources.`);
  
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