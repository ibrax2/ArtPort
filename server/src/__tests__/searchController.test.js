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
          _id: "69b334f0069481d81cce4065",
          username: "iai11",
          profilePictureUrl: "https://artport-images.s3.us-east-2.amazonaws.com/users/1775176542401-625c1d16f90f990cb811b633187f8c81.jpg",
          bio: "",
          score: 5.8,
        },
      ];

      User.aggregate = jest.fn().mockResolvedValue(mockUsers);
      req.query = { query: "iai" };

      await searchUsers(req, res);

      expect(User.aggregate).toHaveBeenCalled();
      expect(res.json).toHaveBeenCalledWith({
        results: mockUsers,
        count: 1,
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
        _id: "69b334f0069481d81cce4065",
        username: "iai11",
        profilePictureUrl: "https://artport-images.s3.us-east-2.amazonaws.com/users/1775176542401-625c1d16f90f990cb811b633187f8c81.jpg",
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
          _id: "69cecc61cfb78afc89c4f396",
          title: "starry night",
          description: "desc",
          filePath: "https://artport-images.s3.us-east-2.amazonaws.com/artworks/1775160417057-0b2d6b37e892b9335e132787c2e6b0e9.jpg",
          thumbnailPath: "https://artport-images.s3.us-east-2.amazonaws.com/artworks/thumbnails/1775160417627-68910f10d055e29a669c426ab66e42e0.jpg",
          uploadDate: new Date("2026-04-02T20:06:57.985+00:00"),
          isPublic: true,
          userId: "69b334f0069481d81cce4065",
          userDetails: {
            username: "iai11",
            profilePictureUrl: "https://artport-images.s3.us-east-2.amazonaws.com/users/1775176542401-625c1d16f90f990cb811b633187f8c81.jpg",
          },
          score: 5.8,
        },
      ];

      Artwork.aggregate = jest.fn().mockResolvedValue(mockArtworks);
      req.query = { query: "starry night" };

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
        _id: "69cecc61cfb78afc89c4f396",
        title: "starry night",
        description: "desc",
        filePath: "https://artport-images.s3.us-east-2.amazonaws.com/artworks/1775160417057-0b2d6b37e892b9335e132787c2e6b0e9.jpg",
        thumbnailPath: "https://artport-images.s3.us-east-2.amazonaws.com/artworks/thumbnails/1775160417627-68910f10d055e29a669c426ab66e42e0.jpg",
        uploadDate: new Date("2026-04-02T20:06:57.985+00:00"),
        isPublic: true,
        userId: "69b334f0069481d81cce4065",
        userDetails: {
          username: "iai11",
          profilePictureUrl: "https://artport-images.s3.us-east-2.amazonaws.com/users/1775176542401-625c1d16f90f990cb811b633187f8c81.jpg",
        },
        score: 5.8,
      });

      Artwork.aggregate = jest.fn().mockResolvedValue(mockArtworks);
      req.query = { query: "starry night" };

      await searchArtworks(req, res);

      const pipeline = Artwork.aggregate.mock.calls[0][0];

      // Check that the $limit stage exists and equals 20
      expect(pipeline[pipeline.length - 1].$limit).toBe(20);
    });
  });
});