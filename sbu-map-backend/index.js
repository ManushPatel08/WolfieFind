/* REPLACE: sbu-map-backend/index.js */
import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import axios from 'axios';
import { findClosest, calculateDistance } from './utils.js';
import { checkJwt } from './authMiddleware.js';

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

// --- Application Logic Constants ---
const VERIFIED_THRESHOLD = 5;

// --- UPDATED & STANDARDIZED CATEGORIES ---
const INDOOR_CATEGORIES = [
  'printer', 'drinking_water_filler', 'toilets', 'computer_labs', 'pantry',
  'game_room', 'gender_neutral_bathrooms', 'parking_service_desk',
  'id_card_desk', 'charging_spots', 'vending_machine',
  'study_room', 'elevator', 'cafeteria', 'information_desk',
  'book_return', 'quiet_study', 'group_study_room', 'ballroom', 'food'
];
const OUTDOOR_PROXIMITY_METERS = {
  'bench': 20,
  'bus_stops': 30, // Standardized
  'food_trucks': 50, // Standardized
  'restaurants': 50,
  'gym': 100,
  'photographic_spots': 100,
  'bike_rack': 30,
  'garden_area': 50,
  'study_room': 50, // For outdoor SINC sites
  'default': 30
};
// --- END UPDATES ---

// Middleware
app.use(cors());
app.use(express.json());

// =======================================
// --- PUBLIC API ROUTES (NO LOGIN) ---
// =======================================

// GET /api/buildings
app.get('/api/buildings', async (req, res) => {
  try {
    const buildings = await prisma.building.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(buildings);
  } catch (error) {
    console.error('Failed to fetch buildings:', error);
    res.status(500).json({ error: 'Failed to fetch buildings' });
  }
});

// GET /api/resources
app.get('/api/resources', async (req, res) => {
  try {
    const resources = await prisma.resource.findMany({
      include: {
        building: true,
      },
    });
    res.json(resources);
  } catch (error) {
    console.error('Failed to fetch resources:', error);
    res.status(500).json({ error: 'Failed to fetch resources' });
  }
});

// GET /api/find-closest
app.get('/api/find-closest', async (req, res) => {
  const { category, lat, lon } = req.query;

  if (!category || !lat || !lon) {
    return res
      .status(400)
      .json({ error: 'Missing required query parameters: category, lat, lon' });
  }

  const userLocation = {
    lat: parseFloat(lat),
    lon: parseFloat(lon),
  };

  try {
    const resources = await prisma.resource.findMany({
      where: { category: category },
      include: {
        building: {
          include: {
            entrances: true,
          },
        },
      },
    });

    if (resources.length === 0) {
      return res.status(404).json({ error: 'No verified resources found for that category' });
    }

    const closestResult = findClosest(userLocation, resources);

    if (!closestResult.resource) {
      return res.status(404).json({ error: 'No reachable resources found for that category.' });
    }

    res.json(closestResult);
  } catch (error) {
    console.error('Failed to find closest resource:', error);
    res.status(500).json({ error: 'Failed to find closest resource' });
  }
});


// GET /api/submissions
app.get('/api/submissions', async (req, res) => {
  try {
    const submissions = await prisma.submission.findMany({
      where: { status: 'pending' },
      include: {
        votes: true,
        comments: true,
        building: true,
      },
      orderBy: {
        votes: {
          _count: 'desc',
        },
      },
    });
    res.json(submissions);
  } catch (error) {
    console.error('Failed to fetch submissions:', error);
    res.status(500).json({ error: 'Failed to fetch submissions' });
  }
});

// =================================================
// --- PROTECTED API ROUTES (LOGIN REQUIRED) ---
// =================================================

// Helper function to nullify duplicates
async function nullifyDuplicates(submission) {
  try {
    if (submission.building_id) {
      // INDOOR: Nullify all other pending submissions for this category+building
      await prisma.submission.updateMany({
        where: {
          category: submission.category,
          building_id: submission.building_id,
          status: 'pending',
          id: { not: submission.id }
        },
        data: { status: 'rejected' }
      });
      console.log(`Nullified indoor duplicates for ${submission.category} in building ${submission.building_id}`);

    } else {
      // OUTDOOR: Nullify pending submissions within proximity
      const proximity = OUTDOOR_PROXIMITY_METERS[submission.category] || OUTDOOR_PROXIMITY_METERS.default;
      const pendingSubmissions = await prisma.submission.findMany({
        where: {
          category: submission.category,
          status: 'pending',
          building_id: null,
          id: { not: submission.id }
        }
      });

      const submissionsToNullify = [];
      for (const pending of pendingSubmissions) {
        if (pending.lat && pending.lon && submission.lat && submission.lon) {
          const distanceKm = calculateDistance(
            Number(submission.lat), Number(submission.lon),
            Number(pending.lat), Number(pending.lon)
          );
          if (distanceKm * 1000 < proximity) {
            submissionsToNullify.push(pending.id);
          }
        }
      }

      if (submissionsToNullify.length > 0) {
        await prisma.submission.updateMany({
          where: { id: { in: submissionsToNullify } },
          data: { status: 'rejected' }
        });
        console.log(`Nullified ${submissionsToNullify.length} outdoor duplicates for ${submission.category}`);
      }
    }
  } catch (error) {
    console.error("Failed to nullify duplicates:", error);
  }
}

// Helper function to verify a submission
async function verifySubmission(submissionId) {
  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId }
    });

    if (!submission || submission.status !== 'pending') {
      console.log(`Submission ${submissionId} already processed or not found.`);
      return;
    }

    // 1. Mark submission as 'verified'
    await prisma.submission.update({
      where: { id: submissionId },
      data: { status: 'verified' }
    });

    // 2. Create a new Resource from this submission
    const newResource = await prisma.resource.create({
      data: {
        name: `Verified ${submission.category.replace(/_/g, ' ')}`,
        category: submission.category,
        lat: submission.lat,
        lon: submission.lon,
        building_id: submission.building_id,
        description: submission.description,
      }
    });
    console.log(`Created new Resource ${newResource.id} from Submission ${submission.id}`);

    // 3. Nullify other pending duplicates
    await nullifyDuplicates(submission);

  } catch (error)
{    console.error(`Failed during verification for submission ${submissionId}:`, error);
    if (error.code === 'P2002') {
      console.log('Duplicate resource blocked by database constraint. This is expected.');
      // Still need to nullify other duplicates even if this one failed to create
      const submission = await prisma.submission.findUnique({ where: { id: submissionId } });
      if (submission) await nullifyDuplicates(submission);
    }
  }
}


// POST a new submission (PROTECTED)
app.post('/api/submissions', checkJwt, async (req, res) => {
  const submitterId = req.auth.payload.sub;
  const {
    category,
    lat, // Can be null
    lon, // Can be null
    description,
    building_id, // Can be null
    submitterName,
  } = req.body;

  if (!category || !submitterId) {
    return res.status(400).json({ error: 'Missing category or user ID' });
  }

  const isIndoor = INDOOR_CATEGORIES.includes(category);
  const parsedLat = lat ? parseFloat(lat) : null;
  const parsedLon = lon ? parseFloat(lon) : null;
  const parsedBuildingId = building_id ? parseInt(building_id) : null;

  try {
    // --- VALIDATION & DUPLICATE CHECKS ---
    if (isIndoor) {
      if (!parsedBuildingId) {
        return res.status(400).json({ error: 'A building must be selected for this indoor category.' });
      }

      const existingResource = await prisma.resource.findFirst({
        where: {
          category: category,
          building_id: parsedBuildingId
        }
      });
      if (existingResource) {
        return res.status(409).json({ error: 'A verified resource for this category already exists in this building.' });
      }

    } else { // OUTDOOR
      if (!parsedLat || !parsedLon) {
        return res.status(400).json({ error: 'A map location must be provided for outdoor categories.' });
      }

      const proximity = OUTDOOR_PROXIMITY_METERS[category] || OUTDOOR_PROXIMITY_METERS.default;
      const existingResources = await prisma.resource.findMany({
        where: { category: category, building_id: null }
      });

      for (const resource of existingResources) {
        const distanceKm = calculateDistance(
          parsedLat, parsedLon,
          Number(resource.lat), Number(resource.lon)
        );
        if (distanceKm * 1000 < proximity) {
          return res.status(409).json({ error: `A verified ${category} already exists ${Math.round(distanceKm * 1000)}m away.` });
        }
      }
    }
    // --- END DUPLICATE CHECKS ---

    const newSubmission = await prisma.submission.create({
      data: {
        submitter_id: submitterId,
        submitter_name: submitterName,
        category,
        lat: isIndoor ? null : parsedLat,
        lon: isIndoor ? null : parsedLon,
        description,
        building_id: isIndoor ? parsedBuildingId : null,
        status: 'pending',
      },
    });
    res.status(201).json(newSubmission);
  } catch (error) {
    console.error('Failed to create submission:', error);
    res.status(500).json({ error: 'Failed to create submission' });
  }
});

// POST a vote on a submission (PROTECTED)
app.post('/api/submissions/:id/vote', checkJwt, async (req, res) => {
  const userId = req.auth.payload.sub;
  const submissionId = parseInt(req.params.id);
  const { voteType } = req.body;

  if (voteType !== 1 && voteType !== -1) {
    return res.status(400).json({ error: 'Invalid vote type' });
  }

  try {
    const submission = await prisma.submission.findUnique({
      where: { id: submissionId },
      select: { status: true }
    });

    if (!submission || submission.status !== 'pending') {
      return res.status(400).json({ error: 'This submission is not active and can no longer be voted on.' });
    }

    const newVote = await prisma.vote.upsert({
      where: {
        submission_id_user_id: {
          submission_id: submissionId,
          user_id: userId,
        },
      },
      update: { vote_type: voteType },
      create: {
        submission_id: submissionId,
        user_id: userId,
        vote_type: voteType,
      },
    });

    // Check for verification
    const votes = await prisma.vote.findMany({
      where: { submission_id: submissionId }
    });
    const totalVotes = votes.reduce((acc, vote) => acc + vote.vote_type, 0);

    if (totalVotes >= VERIFIED_THRESHOLD) {
      verifySubmission(submissionId).catch(console.error);
    }

    res.status(201).json(newVote);
  } catch (error) {
    console.error('Failed to vote:', error);
    if (error.code === 'P2002') {
      return res.status(409).json({ error: 'You have already voted on this submission.' });
    }
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST /api/submissions/:id/comment
app.post('/api/submissions/:id/comment', checkJwt, async (req, res) => {
  const userId = req.auth.payload.sub;
  const submissionId = parseInt(req.params.id);
  const { comment, userName } = req.body;

  if (!comment || !userName) {
    return res.status(400).json({ error: 'Comment text and user name are required' });
  }

  try {
    const newComment = await prisma.comment.create({
      data: {
        submission_id: submissionId,
        user_id: userId,
        user_name: userName,
        comment: comment,
      },
    });
    res.status(201).json(newComment);
  } catch (error) {
    console.error('Failed to comment:', error);
    res.status(500).json({ error: 'Failed to comment' });
  }
});

// --- Test Routes ---
app.get('/', (req, res) => {
  res.send('WolfieFind Backend is running!');
});

app.get('/api/protected', checkJwt, (req, res) => {
  res.json({
    message: 'Hello from a protected endpoint! You are authenticated.',
    user: req.auth.payload,
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});