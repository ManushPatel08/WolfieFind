import express from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import 'dotenv/config';
import { findClosest } from './utils.js';
import { checkJwt } from './authMiddleware.js';

const app = express();
const port = process.env.PORT || 3001;
const prisma = new PrismaClient();

// Middleware
app.use(cors());
app.use(express.json());

// =======================================
// --- PUBLIC API ROUTES (NO LOGIN) ---
// =======================================

// GET all (approved) resources
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

// GET closest (approved) resource
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
      return res.status(404).json({ error: 'No resources found for that category' });
    }

    const closestResult = findClosest(userLocation, resources);
    res.json(closestResult);
  } catch (error) {
    console.error('Failed to find closest resource:', error);
    res.status(500).json({ error: 'Failed to find closest resource' });
  }
});

// GET all pending submissions (public)
app.get('/api/submissions', async (req, res) => {
  try {
    // We sort by votes descending, so highest voted appears first
    const submissions = await prisma.submission.findMany({
      where: { status: 'pending' },
      include: {
        votes: true,
        comments: true,
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

// POST a new submission (PROTECTED)
// checkJwt middleware will block requests without a valid token
app.post('/api/submissions', checkJwt, async (req, res) => {
  const submitterId = req.auth.payload.sub; // Get user ID from Auth0 token
  const {
    category,
    lat,
    lon,
    description,
    buildingNameSuggestion,
    submitterName, // Sent from frontend (can be null)
  } = req.body;

  // --- THIS IS THE FIX ---
  // We remove 'submitterName' from the required check,
  // as the database schema allows it to be null.
  if (!category || !lat || !lon || !submitterId) {
    return res.status(400).json({ error: 'Missing required data' });
  }
  // --- END OF FIX ---

  try {
    const newSubmission = await prisma.submission.create({
      data: {
        submitter_id: submitterId,
        submitter_name: submitterName, // This is fine if it's null
        category,
        lat: parseFloat(lat),
        lon: parseFloat(lon),
        description,
        building_name_suggestion: buildingNameSuggestion,
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
  const { voteType } = req.body; // 1 for upvote, -1 for downvote

  if (voteType !== 1 && voteType !== -1) {
    return res.status(400).json({ error: 'Invalid vote type' });
  }

  try {
    // Use 'upsert' to create a new vote or update an existing one.
    // This prevents a user from voting multiple times.
    const newVote = await prisma.vote.upsert({
      where: {
        submission_id_user_id: {
          submission_id: submissionId,
          user_id: userId,
        },
      },
      update: {
        vote_type: voteType,
      },
      create: {
        submission_id: submissionId,
        user_id: userId,
        vote_type: voteType,
      },
    });
    res.status(201).json(newVote);
  } catch (error) {
    console.error('Failed to vote:', error);
    res.status(500).json({ error: 'Failed to vote' });
  }
});

// POST a comment on a submission (PROTECTED)
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

// Test protected route
app.get('/api/protected', checkJwt, (req, res) => {
  res.json({
    message: 'Hello from a protected endpoint! You are authenticated.',
    user: req.auth.payload,
  });
});

app.listen(port, () => {
  console.log(`Server listening at http://localhost:${port}`);
});