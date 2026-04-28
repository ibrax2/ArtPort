import { jest } from "@jest/globals";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/User.js";
import Artwork from "../models/Artwork.js";

const mockUploadImageToS3 = jest.fn();

jest.unstable_mockModule("../controllers/imageUploadController.js", () => ({
  uploadImageToS3: mockUploadImageToS3,
}));

const { createArtwork } = await import("../controllers/artworkController.js");

let mongoServer;

const createResponseMock = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis(),
});

describe("Artwork controller integration", () => {
  beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    process.env.NODE_ENV = "test";
    process.env.JWT_SECRET = "integration-secret";
    process.env.MONGO_URI = mongoServer.getUri();
    await mongoose.connect(mongoServer.getUri());
  });

  beforeEach(async () => {
    mockUploadImageToS3.mockReset();
    await Promise.all(
      Object.values(mongoose.connection.collections).map((collection) =>
        collection.deleteMany({}),
      ),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("uploads and persists an artwork with the uploaded file path", async () => {
    const user = await User.create({
      username: "uploadtester",
      email: "uploadtester@example.com",
      passwordHash: "hash",
    });

    const file = {
      originalname: "test.png",
      mimetype: "image/png",
      buffer: Buffer.from("fake-image-bytes"),
    };
    const uploadedFileUrl =
      "https://bucket.s3.region.amazonaws.com/artworks/1710000000000-test.png";
    mockUploadImageToS3.mockResolvedValue(uploadedFileUrl);

    const req = {
      body: {
        title: "Sunset Over Water",
        description: "Integration upload test",
        userId: String(user._id),
      },
      files: {
        image: [file],
      },
      user: { _id: user._id },
    };
    const res = createResponseMock();

    await createArtwork(req, res);

    expect(mockUploadImageToS3).toHaveBeenCalledWith(file, "artworks");
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        title: "Sunset Over Water",
        description: "Integration upload test",
        filePath: uploadedFileUrl,
        isPublic: true,
      }),
    );

    const storedArtwork = await Artwork.findOne({
      title: "Sunset Over Water",
    }).lean();

    expect(storedArtwork).toMatchObject({
      title: "Sunset Over Water",
      description: "Integration upload test",
      filePath: uploadedFileUrl,
      userId: user._id,
      isPublic: true,
    });
  });
});
