import express from 'express';
import {
  searchUsers,
  searchArtworks,
} from '../controllers/searchController.js';

const router = express.Router();

// Search users by username
router.get('/users', searchUsers);

// Search artworks by title or description
router.get('/artworks', searchArtworks);

export default router;
