import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import userRoutes from './routes/userRoutes.js';
import artworkRoutes from './routes/artworkRoutes.js';

dotenv.config();

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/artworks', artworkRoutes);

app.get('/', (req, res) => {
    res.send('ArtPort API is running!');
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});