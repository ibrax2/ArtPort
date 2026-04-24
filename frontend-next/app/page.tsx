"use client";

import { useEffect, useState } from "react";
import ArtIcon from "@/components/articon";
import {
  fetchArtworks,
  mapArtworkToFeedItem,
  type ArtworkFeedItem,
} from "@/lib/artworkApi";

const USER_STATE_EVENT = "artport-user-updated";

export default function FrontPage() {
  const [posts, setPosts] = useState<ArtworkFeedItem[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetchArtworks().then((data) => {
      if (cancelled) return;
      setPosts(data.map((item, index) => mapArtworkToFeedItem(item, index)));
    });

    return () => {
      cancelled = true;
    };
  }, [refreshKey]);

  useEffect(() => {
    const handleUserStateChange = () => {
      setRefreshKey((value) => value + 1);
    };

    window.addEventListener(USER_STATE_EVENT, handleUserStateChange);
    window.addEventListener("storage", handleUserStateChange);

    return () => {
      window.removeEventListener(USER_STATE_EVENT, handleUserStateChange);
      window.removeEventListener("storage", handleUserStateChange);
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