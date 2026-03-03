import express from 'express';
import { getArtworks, createArtwork, getArtworkById } from '../controllers/artworkController.js';
import { upload, uploadToS3 } from '../middleware/upload.js';

const router = express.Router();

router.route('/')
    .get(getArtworks)
    .post(upload.single('image'), uploadToS3, createArtwork);

router.route('/:id')
    .get(getArtworkById);

export default router;
