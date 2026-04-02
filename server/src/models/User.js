import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        minlength: 3,
        maxlength: 30
    },
    email: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
    },
    passwordHash: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        maxlength: 500,
        default: ''
    },
    profilePictureUrl: {
        type: String,
        default: ''
    },
    bannerPictureUrl: {
        type: String,
        default: ''
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true // This will add createdAt and updatedAt automatically as well, but keeping createdAt explicitly doesn't hurt.
});

// Avoid OverwriteModelError if the model is already compiled
export default mongoose.models.User || mongoose.model('User', userSchema);
