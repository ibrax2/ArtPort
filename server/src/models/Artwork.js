import mongoose from 'mongoose';

const artworkSchema = new mongoose.Schema({
    author: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    title: {
        type: String,
        required: true,
        trim: true,
        maxlength: 100
    },
    description: {
        // e.g., "Advice for coloring!", "Help with proportions"
        type: String,
        required: true,
        trim: true,
        maxlength: 1000
    },
    imageUrl: {
        // URL from AWS S3
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.models.Artwork || mongoose.model('Artwork', artworkSchema);
