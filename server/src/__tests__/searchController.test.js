import { jest } from "@jest/globals";
import {
  searchUsers,
  searchArtworks,
} from "../controllers/searchController.js";
import User from "../models/User.js";
import Artwork from "../models/Artwork.js";

// Mock the models
jest.mock("../models/User.js");
jest.mock("../models/Artwork.js");

describe("Search Controller", () => {
  let req, res;

  beforeEach(() => {
    // Clear all mocks before each test
    jest.clearAllMocks();

    // Setup mock request and response objects
    req = {
      query: {},
      params: {},
    };

    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis(),
    };
  });

  //=====================================================
  //                Tests for searchUsers
  //=====================================================
  describe("searchUsers", () => {
    it("should return error when query is empty", async () => {
      req.query = { query: "" };

      await searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Search query is required",
      });
    });

    it("should return error when query is not provided", async () => {
      req.query = { query: undefined };

      await searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Search query is required",
      });
    });

    it("should return search results for valid query", async () => {
      const mockUsers = [
        {
          _id: "507f1f77bcf86cd799439011",
          username: "john_doe",
          profilePictureUrl: "https://example.com/pic.jpg",
          bio: "Artist",
          score: 5.8,
        },
        {
          _id: "507f1f77bcf86cd799439012",
          username: "john_smith",
          profilePictureUrl: "https://example.com/pic2.jpg",
          bio: "Designer",
          score: 4.2,
        },
      ];

      User.aggregate = jest.fn().mockResolvedValue(mockUsers);
      req.query = { query: "john" };

      await searchUsers(req, res);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        results: mockUsers,
        count: 2,
      });
    });

    it("should return empty results when no users match", async () => {
      User.aggregate = jest.fn().mockResolvedValue([]);
      req.query = { query: "nonexistent" };

      await searchUsers(req, res);

      expect(res.json).toHaveBeenCalledWith({
        results: [],
        count: 0,
      });
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Database connection failed");
      User.aggregate = jest.fn().mockRejectedValue(error);
      req.query = { query: "john" };

      await searchUsers(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Database connection failed",
      });
    });

    it("should apply fuzzy matching in aggregation pipeline", async () => {
      User.aggregate = jest.fn().mockResolvedValue([]);
      req.query = { query: "johnn" };

      await searchUsers(req, res);

      const pipeline = User.aggregate.mock.calls[0][0];

      // Check that the $search stage includes fuzzy matching
      expect(pipeline[0].$search.text.fuzzy).toEqual({
        maxEdits: 2,
        prefixLength: 0,
      });
    });

    it("should limit results to 20", async () => {
      const mockUsers = Array(20).fill({
        _id: "507f1f77bcf86cd799439011",
        username: "user",
        profilePictureUrl: "",
        bio: "",
        score: 5.8,
      });

      User.aggregate = jest.fn().mockResolvedValue(mockUsers);
      req.query = { query: "user" };

      await searchUsers(req, res);

      const pipeline = User.aggregate.mock.calls[0][0];

      // Check that the $limit stage exists and equals 20
      expect(pipeline[pipeline.length - 1].$limit).toBe(20);
    });
  });

  //=====================================================
  //                Tests for searchArtworks
  //=====================================================
  describe("searchArtworks", () => {
    it("should return error when query is empty", async () => {
      req.query = { query: "  " };

      await searchArtworks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Search query is required",
      });
    });

    it("should return error when query is not provided", async () => {
      req.query = { query: null };

      await searchArtworks(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        message: "Search query is required",
      });
    });

    it("should return search results with user details", async () => {
      const mockArtworks = [
        {
          _id: "507f1f77bcf86cd799439001",
          title: "Mountain Landscape",
          description: "A beautiful mountain landscape",
          filePath: "s3://bucket/image.jpg",
          thumbnailPath: "s3://bucket/thumb.jpg",
          uploadDate: new Date("2024-03-30"),
          isPublic: true,
          userId: "507f1f77bcf86cd799439011",
          userDetails: {
            username: "artist_name",
            profilePictureUrl: "https://example.com/pic.jpg",
          },
          score: 7.2,
        },
      ];

      Artwork.aggregate = jest.fn().mockResolvedValue(mockArtworks);
      req.query = { query: "landscape" };

      await searchArtworks(req, res);

      expect(Artwork.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        results: mockArtworks,
        count: 1,
      });
    });

    it("should only return public artworks", async () => {
      Artwork.aggregate = jest.fn().mockResolvedValue([]);
      req.query = { query: "art" };

      await searchArtworks(req, res);

      const pipeline = Artwork.aggregate.mock.calls[0][0];

      // Check that the $match stage includes isPublic: true
      const matchStage = pipeline.find((stage) => stage.$match);
      expect(matchStage.$match.isPublic).toBe(true);
    });

    it("should boost title matches", async () => {
      Artwork.aggregate = jest.fn().mockResolvedValue([]);
      req.query = { query: "portrait" };

      await searchArtworks(req, res);

      const pipeline = Artwork.aggregate.mock.calls[0][0];
      const searchStage = pipeline[0].$search;

      // Check that title has a boost of 2
      const titleSearch = searchStage.compound.should[0];
      expect(titleSearch.text.score.boost.value).toBe(2);
    });

    it("should search both title and description", async () => {
      Artwork.aggregate = jest.fn().mockResolvedValue([]);
      req.query = { query: "test" };

      await searchArtworks(req, res);

      const pipeline = Artwork.aggregate.mock.calls[0][0];
      const searchStage = pipeline[0].$search;

      const shouldClauses = searchStage.compound.should;
      expect(shouldClauses.length).toBe(2);
      expect(shouldClauses[0].text.path).toBe("title");
      expect(shouldClauses[1].text.path).toBe("description");
    });

    it("should return empty results when no artworks match", async () => {
      Artwork.aggregate = jest.fn().mockResolvedValue([]);
      req.query = { query: "nonexistent_art" };

      await searchArtworks(req, res);

      expect(res.json).toHaveBeenCalledWith({
        results: [],
        count: 0,
      });
    });

    it("should handle database errors gracefully", async () => {
      const error = new Error("Search service unavailable");
      Artwork.aggregate = jest.fn().mockRejectedValue(error);
      req.query = { query: "landscape" };

      await searchArtworks(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith({
        message: "Search service unavailable",
      });
    });

    it("should limit results to 20", async () => {
      const mockArtworks = Array(20).fill({
        _id: "507f1f77bcf86cd799439001",
        title: "Artwork",
        description: "Description",
        filePath: "s3://bucket/image.jpg",
        thumbnailPath: "s3://bucket/thumb.jpg",
        uploadDate: new Date(),
        isPublic: true,
        userId: "507f1f77bcf86cd799439011",
        userDetails: {
          username: "artist",
          profilePictureUrl: "",
        },
        score: 5.0,
      });

      Artwork.aggregate = jest.fn().mockResolvedValue(mockArtworks);
      req.query = { query: "art" };

      await searchArtworks(req, res);

      const pipeline = Artwork.aggregate.mock.calls[0][0];

      // Check that the $limit stage exists and equals 20
      expect(pipeline[pipeline.length - 1].$limit).toBe(20);
    });
  });
});
