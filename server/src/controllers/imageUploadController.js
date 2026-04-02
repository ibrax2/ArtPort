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

/**
 * Uploads a file buffer to S3 and returns the public URL.
 * @param {Object} file - The file object from multer (req.file)
 * @param {String} folder - The folder prefix in the S3 bucket
 * @returns {String|null} - The public S3 URL of the uploaded image
 */
export const uploadImageToS3 = async (file, folder) => {
    if (!file) return null;

    try {
        const uniqueSuffix = crypto.randomBytes(16).toString('hex');
        const extension = path.extname(file.originalname);
        const fileName = `${folder}/${Date.now()}-${uniqueSuffix}${extension}`;

        const command = new PutObjectCommand({
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileName,
            Body: file.buffer,
            ContentType: file.mimetype,
        });

        await s3.send(command);

        return `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        throw new Error('Failed to upload image to S3');
    }
};
