import User from "../models/User.js";
import Artwork from "../models/Artwork.js";
import { withMediaDeliveryUrls } from "../utils/mediaDelivery.js";

/**
 * @desc    Search users by username
 * @route   GET /api/search/users?query=searchTerm
 * @access  Public
 */
export const searchUsers = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const users = await User.aggregate([
      {
        $search: {
          index: "username_search",
          text: {
            query: query,
            path: "username",
            fuzzy: {
              maxEdits: 2,
              prefixLength: 0,
            },
          },
        },
      },
      {
        $project: {
          _id: 1,
          username: 1,
          profilePictureUrl: 1,
          bio: 1,
          score: { $meta: "searchScore" },
        },
      },
      {
        $sort: { score: -1 },
      },
      {
        $limit: 20,
        // For now, just limit results to top 20 matches.
        // TODO: Consider implementing pagination for larger result sets.
      },
    ]);

    res.json({
      results: users,
      count: users.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

/**
 * @desc    Search artworks by title or description
 * @route   GET /api/search/artworks?query=searchTerm
 * @access  Public
 */
export const searchArtworks = async (req, res) => {
  try {
    const { query } = req.query;

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ message: "Search query is required" });
    }

    const artworks = await Artwork.aggregate([
      {
        $search: {
          index: "artwork_search",
          compound: {
            should: [
              {
                text: {
                  query: query,
                  path: "title",
                  score: { boost: { value: 2 } },
                },
              },
              {
                text: {
                  query: query,
                  path: "description",
                },
              },
            ],
          },
        },
      },
      {
        $match: {
          isPublic: true,
        },
      },
      {
        $lookup: {
          from: "users",
          localField: "userId",
          foreignField: "_id",
          as: "userDetails",
        },
      },
      {
        $unwind: {
          path: "$userDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $project: {
          _id: 1,
          title: 1,
          description: 1,
          filePath: 1,
          thumbnailPath: 1,
          uploadDate: 1,
          isPublic: 1,
          userId: 1,
          userDetails: {
            // If we show user details in search results, we can include username and profile picture?
            // TODO: Change this if we decide to show more or less user info in search results.
            username: 1,
            profilePictureUrl: 1,
          },
          score: { $meta: "searchScore" },
        },
      },
      {
        $sort: { score: -1 },
      },
      {
        $limit: 20,
        // For now, just limit results to top 20 matches.
        // TODO: Consider implementing pagination for larger result sets.
      },
    ]);

    const deliveredArtworks = artworks.map((artwork) =>
      withMediaDeliveryUrls(artwork),
    );

    res.json({
      results: deliveredArtworks,
      count: deliveredArtworks.length,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};
