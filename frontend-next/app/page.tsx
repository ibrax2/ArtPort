"use client";

import { useEffect, useState } from "react";
import ArtIcon from "@/components/articon";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type FeedPost = {
  id: string;
  image: string;
  title: string;
  username: string;
  userImage: string;
};

type ApiArtwork = {
  _id?: string;
  title?: string;
  imageUrl?: string;
  filePath?: string;
  thumbnailPath?: string;
  user?: {
    username?: string;
    profilePicture?: string;
    profilePictureUrl?: string;
  };
  userId?: {
    username?: string;
    profilePicture?: string;
    profilePictureUrl?: string;
  } | string;
};

function mapArtworkToFeedPost(raw: ApiArtwork, index: number): FeedPost {
  const userObj =
    raw.user && typeof raw.user === "object"
      ? raw.user
      : raw.userId && typeof raw.userId === "object"
        ? raw.userId
        : undefined;

  return {
    id: raw._id ? String(raw._id) : `post-${index}`,
    image: raw.imageUrl || raw.filePath || raw.thumbnailPath || "/images/artwork_1.jpg",
    title: raw.title?.trim() || "Untitled",
    username: userObj?.username || "Unknown artist",
    userImage:
      userObj?.profilePictureUrl ||
      userObj?.profilePicture ||
      "/avatar-default.svg",
  };
}

export default function FrontPage() {
  const [posts, setPosts] = useState<FeedPost[]>([]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/artworks`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled || !Array.isArray(data)) return;
        const mapped = data.map((item, index) =>
          mapArtworkToFeedPost(item as ApiArtwork, index)
        );
        setPosts(mapped);
      })
      .catch(() => {
        if (!cancelled) setPosts([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main className="home-main">
      <h1 className="home-title">Front Page</h1>

      <div className="feed-grid">
        {posts.map((post) => (
          <ArtIcon key={post.id} post={post} />
        ))}
      </div>

      <p className="feed-end-message">u have reached the end of the page : )</p>
    </main>
  );
}