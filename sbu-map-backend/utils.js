/**
 * Calculates the distance between two GPS coordinates in kilometers
 * using the Haversine formula.
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

/**
 * Finds the closest resource or its building's entrance to a user.
 * @param {object} userLocation - { lat, lon }
 * @param {Array} resources - An array of resource objects from Prisma
 * @returns {object} The closest location { lat, lon } and its details.
 */
export function findClosest(userLocation, resources) {
  let closestDistance = Infinity;
  let closestItem = null;
  let closestLocation = null;

  for (const resource of resources) {
    
    // --- LOGIC CHANGE ---

    // Case 1: INDOOR resource. Path to the building entrance.
    // It has a building, but lat/lon are null.
    if (resource.building) {
      // Resource is inside a building. We must find the closest ENTRANCE.
      if (!resource.building.entrances || resource.building.entrances.length === 0) {
        // Skip this resource if its building has no registered entrances
        continue;
      }

      for (const entrance of resource.building.entrances) {
        const entranceLat = Number(entrance.lat);
        const entranceLon = Number(entrance.lon);

        const distance = calculateDistance(
          userLocation.lat, userLocation.lon,
          entranceLat, entranceLon
        );

        if (distance < closestDistance) {
          closestDistance = distance;
          // Store the *resource* info, but the *entrance* location
          closestItem = resource;
          closestLocation = { lat: entranceLat, lon: entranceLon };
        }
      }
    } 
    // Case 2: OUTDOOR resource. Path to the resource itself.
    // It has lat/lon, but no building.
    else if (resource.lat && resource.lon) {
      const resourceLat = Number(resource.lat);
      const resourceLon = Number(resource.lon);

      const distance = calculateDistance(
        userLocation.lat, userLocation.lon,
        resourceLat, resourceLon
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = resource;
        closestLocation = { lat: resourceLat, lon: resourceLon };
      }
    }
    // --- END LOGIC CHANGE ---
  }

  return {
    resource: closestItem,
    location: closestLocation, // This is now either an entrance (indoor) or the spot (outdoor)
    distance: closestDistance,
  };
}