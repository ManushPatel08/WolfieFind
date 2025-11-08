/**
 * Calculates the distance between two GPS coordinates in kilometers
 * using the Haversine formula.
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
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
    // Note: Prisma returns lat/lon as Decimal objects, so we convert to Number
    const resourceLat = Number(resource.lat);
    const resourceLon = Number(resource.lon);
    
    // Check if the resource is outdoors (no building_id)
    if (!resource.building) {
      const distance = calculateDistance(
        userLocation.lat, userLocation.lon,
        resourceLat, resourceLon
      );

      if (distance < closestDistance) {
        closestDistance = distance;
        closestItem = resource;
        closestLocation = { lat: resourceLat, lon: resourceLon };
      }
    } else {
      // Resource is inside a building. We must find the closest ENTRANCE.
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
  }

  return {
    resource: closestItem,
    location: closestLocation,
    distance: closestDistance,
  };
}