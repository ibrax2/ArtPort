import Artwork from '../models/Artwork.js';

// @desc    Get all artworks
// @route   GET /api/artworks
// @access  Public
export const getArtworks = async (req, res) => {
    try {
        const artworks = await Artwork.find().populate('author', 'username profilePictureUrl');
        res.json(artworks);
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};

// @desc    Create new artwork
// @route   POST /api/artworks
// @access  Private (Mocked for now)
export const createArtwork = async (req, res) => {
    try {
        const { title, description, author } = req.body;
        let imageUrl = req.body.imageUrl;

        // Use S3 URL if a file was uploaded
        if (req.file && req.file.location) {
            imageUrl = req.file.location;
        }

        if (!imageUrl) {
            return res.status(400).json({ message: 'Image is required' });
        }

        const artwork = new Artwork({
            title,
            description,
            imageUrl,
            author
        });

        const createdArtwork = await artwork.save();
        res.status(201).json(createdArtwork);
    } catch (error) {
        res.status(400).json({ message: error.message });
    }
};

// @desc    Get artwork by ID
// @route   GET /api/artworks/:id
// @access  Public
export const getArtworkById = async (req, res) => {
    try {
        const artwork = await Artwork.findById(req.params.id).populate('author', 'username profilePictureUrl');

        if (artwork) {
            res.json(artwork);
        } else {
            res.status(404).json({ message: 'Artwork not found' });
        }
    } catch (error) {
        res.status(500).json({ message: error.message });
    }
};
