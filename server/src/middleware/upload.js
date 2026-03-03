import multer from 'multer';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import crypto from 'crypto';
import path from 'path';

dotenv.config();

const s3 = new S3Client({
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
    region: process.env.AWS_REGION
});

// Configure Multer to store files in memory temporarily
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Not an image! Please upload an image.'), false);
    }
};

export const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 5 * 1024 * 1024, // 5MB limit
    }
});

export const uploadToS3 = async (req, res, next) => {
    if (!req.file) {
        return next(); // No file uploaded, proceed (handle this in controller if file is required)
    }

    try {
        // Generate a unique filename
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(req.file.originalname);
        const fileName = `artworks/${Date.now()}-${uniqueSuffix}${extension}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: req.file.buffer,
            ContentType: req.file.mimetype,
            // ACL: 'public-read' // Usually recommended for user-uploaded images meant for a feed, if bucket policy allows
        });

        await s3.send(command);

        // Save the S3 URL to req.file.location so the controller can access it
        req.file.location = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
        next();
    } catch (error) {
        console.error('Error uploading to S3:', error);
        res.status(500).json({ message: 'Failed to upload image' });
    }
};
