import mongoose from 'mongoose';

const feedbackSchema = new mongoose.Schema({
    artwork: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Artwork',
        required: true
    },
    critic: {
        // The user providing the feedback
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    isAnonymous: {
        // Toggles whether the critic's identity is hidden
        type: Boolean,
        default: false
    },

    // --- Structured Art Critique System Fields ---
    // Example predefined scales (1-10)
    technicalSkillRating: {
        type: Number,
        min: 1,
        max: 10,
        required: true
    },
    creativityRating: {
        type: Number,
        min: 1,
        max: 10,
        required: true
    },
    compositionRating: {
        type: Number,
        min: 1,
        max: 10,
        required: true
    },
    colorTheoryRating: {
        type: Number,
        min: 1,
        max: 10,
        required: true
    },

    // Multiple choice/structured selections
    // e.g., "What is the strongest aspect?" -> "Color", "Line Art", "Shading", "Anatomy"
    strongestAspect: {
        type: String,
        enum: ['Color', 'Line Art', 'Shading', 'Anatomy', 'Composition', 'Concept', 'Other'],
        required: true
    },
    areaForImprovement: {
        type: String,
        enum: ['Color', 'Line Art', 'Shading', 'Anatomy', 'Composition', 'Concept', 'Other'],
        required: true
    },

    // Optional short text (Limited length to avoid open-ended toxic comments)
    optionalComment: {
        type: String,
        maxlength: 300,
        trim: true,
        default: ''
    },

    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

export default mongoose.models.Feedback || mongoose.model('Feedback', feedbackSchema);
