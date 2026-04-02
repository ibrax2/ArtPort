import { jest } from "@jest/globals";

const mockArtworkSave = jest.fn();
const mockArtworkConstructor = jest.fn(() => ({
  save: mockArtworkSave,
}));

// Mock the dependencies correctly for ESM
jest.unstable_mockModule("../models/Artwork.js", () => ({
  default: mockArtworkConstructor,
}));

const mockUploadImageToS3 = jest.fn();
jest.unstable_mockModule("../controllers/imageUploadController.js", () => ({
  uploadImageToS3: mockUploadImageToS3,
}));

const { createArtwork } = await import("../controllers/artworkController.js");

describe("Artwork Controller - Upload functionality", () => {
  let req, res;

  beforeEach(() => {
    jest.clearAllMocks();

    req = {
      body: {},
      files: undefined,
    };

    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };
  });

  describe("createArtwork", () => {
    it("should return 400 if no image is provided", async () => {
      req.body = {
        title: "Test Art",
        description: "Test description",
        userId: "123456789",
      };

      // No req.file or req.body.filePath
      await createArtwork(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: "Image is required" });
    });

    it("should process an uploaded file, call S3, and save to DB", async () => {
      const mockS3Url =
        "https://bucket.s3.region.amazonaws.com/artworks/123-abc.jpg";
      const mockFile = {
        originalname: "test-image.jpg",
        mimetype: "image/jpeg",
        buffer: Buffer.from("fake-image-data"),
      };

      // Mock the imageUploadController response
      mockUploadImageToS3.mockResolvedValue(mockS3Url);

      req.body = {
        title: "Beautiful Scenery",
        description: "A nice painting",
        userId: "507f1f77bcf86cd799439011",
      };
      req.files = {
        image: [mockFile],
      };

      // Mock Artwork save behavior
      const mockSavedArtwork = {
        _id: "artwork_123",
        title: "Beautiful Scenery",
        description: "A nice painting",
        filePath: mockS3Url,
        userId: "507f1f77bcf86cd799439011",
      };

      // Mock the constructor and save method of the Artwork model
      mockArtworkSave.mockResolvedValue(mockSavedArtwork);

      await createArtwork(req, res);

      // Verify the controller called the S3 upload service correctly
      expect(mockUploadImageToS3).toHaveBeenCalledWith(mockFile, "artworks");

      // Verify it responded with a 201 status and the artwork payload
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith(mockSavedArtwork);
    });

    it("should handle S3 upload errors securely", async () => {
      const mockError = new Error("Failed connecting to S3");
      const mockFile = {
        originalname: "test-err.png",
        mimetype: "image/png",
        buffer: Buffer.from("err-img"),
      };

      mockUploadImageToS3.mockRejectedValue(mockError);

      req.body = {
        title: "Error Art",
        userId: "507f1f77bcf86cd799439011",
      };
      req.files = {
        image: [mockFile],
      };

      await createArtwork(req, res);

      // Should return 400 or appropriate error code wrapping the upload crash
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({ message: mockError.message });
    });
  });
});
