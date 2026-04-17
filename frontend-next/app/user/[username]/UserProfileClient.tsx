"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ProfileCard, {
  type ProfilePostItem,
} from "@/components/profilecard";
import {
  artworkMatchesUserId,
  fetchArtworks,
  mapArtworkToProfileItem,
} from "@/lib/artworkApi";
import { getClientAuthToken } from "@/lib/authSession";
import { fetchCurrentUser } from "@/lib/currentUserApi";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

type ApiUserProfile = {
  _id?: string;
  username?: string;
  email?: string;
  bio?: string;
  profilePictureUrl?: string;
  bannerPictureUrl?: string;
};

export default function UserProfileClient({
  usernameParam,
}: {
  usernameParam: string;
}) {
  const router = useRouter();
  const [username, setUsername] = useState(usernameParam || "Artist");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>(undefined);
  const [bannerPictureUrl, setBannerPictureUrl] = useState<string | undefined>(undefined);
  const [userPosts, setUserPosts] = useState<ProfilePostItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    const token = getClientAuthToken();

    if (!token) {
      return () => {
        cancelled = true;
      };
    }

    fetchCurrentUser().then((user) => {
      if (cancelled || !user?.username) return;

      if (
        user.username.trim().toLowerCase() ===
        usernameParam.trim().toLowerCase()
      ) {
        router.replace("/me");
      }
    });

    return () => {
      cancelled = true;
    };
  }, [router, usernameParam]);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_URL}/api/users/by-username/${encodeURIComponent(usernameParam)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ApiUserProfile | null) => {
        if (cancelled || !data) return;
        if (data.username) setUsername(data.username);
        if (data._id) {
          setUserId(String(data._id));
        }
        if (data.profilePictureUrl) setProfilePictureUrl(data.profilePictureUrl);
        if (data.bannerPictureUrl) setBannerPictureUrl(data.bannerPictureUrl);
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [usernameParam]);

  useEffect(() => {
    if (!userId) {
      return;
    }
    let cancelled = false;
    fetchArtworks().then((data) => {
      if (cancelled) return;
      setUserPosts(
        data
          .filter((artwork) => artworkMatchesUserId(artwork, userId))
          .map((artwork, index) => mapArtworkToProfileItem(artwork, index))
      );
    });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const visibleUserPosts = userId ? userPosts : [];
  const profileCardKey = [
    usernameParam,
    username,
    profilePictureUrl ?? "",
    bannerPictureUrl ?? "",
  ].join("|");

  const postCount = userPosts.length;

  return (
    <main className="user-profile-main">
      <ProfileCard
        key={profileCardKey}
        username={username}
        avatarSrc={profilePictureUrl}
        bannerSrc={bannerPictureUrl}
        bio="Welcome to their ArtPort profile."
        followers={0}
        following={0}
        posts={postCount}
        userPosts={visibleUserPosts}
        isEditable={false}
      />
    </main>
  );
}
