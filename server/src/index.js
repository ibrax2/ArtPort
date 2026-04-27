import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import artworkRoutes from "./routes/artworkRoutes.js";
import folderRoutes from "./routes/folderRoutes.js";
import searchRoutes from "./routes/searchRoutes.js";
import feedbackFormRoutes from "./routes/feedbackFormRoutes.js";
import responseRoutes from "./routes/responseRoutes.js";

dotenv.config();

// Connect to database
connectDB();

const app = express();
const PORT = process.env.PORT || 5000;

const allowedOrigins = new Set([
  "http://localhost:3000",
  "https://ibrax2.github.io",
  "https://art-port-three.vercel.app",
  process.env.FRONTEND_URL,
]);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow non-browser/server-to-server requests with no origin header.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }

      return callback(new Error(`CORS not allowed for origin: ${origin}`));
    },
    credentials: true,
  }),
);
app.use(express.json());

app.use("/api/users", userRoutes);
app.use("/api/artworks", artworkRoutes);
app.use("/api/folders", folderRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/feedbackForm", feedbackFormRoutes);
app.use("/api/response", responseRoutes);

app.get("/", (req, res) => {
  res.send("ArtPort API is running!");
});

app.use((err, req, res, next) => {
  if (err.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ message: "Image is too large. Maximum size is 5 MB." });
  }
  const status = err.status || err.statusCode || 500;
  res.status(status).json({ message: err.message || "Something went wrong." });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
