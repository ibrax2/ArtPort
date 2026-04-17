"use client";

import { useCallback, useEffect, useState } from "react";

import RequireAuth from "@/components/RequireAuth";
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
const USER_STATE_EVENT = "artport-user-updated";

type ApiUserProfile = {
  _id?: string;
  username?: string;
  email?: string;
  bio?: string;
  profilePictureUrl?: string;
  bannerPictureUrl?: string;
};

function MePageContent() {
  const [username, setUsername] = useState("Artist");
  const [userId, setUserId] = useState<string | undefined>(undefined);
  const [profilePictureUrl, setProfilePictureUrl] = useState<string | undefined>(undefined);
  const [bannerPictureUrl, setBannerPictureUrl] = useState<string | undefined>(undefined);
  const [userPosts, setUserPosts] = useState<ProfilePostItem[]>([]);

  const uploadUserImage = useCallback(
    async (fieldName: "profilePicture" | "bannerPicture", blob: Blob) => {
      if (!userId) return;

      const token = getClientAuthToken();
      const formData = new FormData();
      const fileName =
        fieldName === "profilePicture" ? "profile.jpg" : "banner.jpg";
      formData.append(fieldName, blob, fileName);

      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        credentials: "include",
        body: formData,
      });

      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { message?: string };
        throw new Error(data.message || "Failed to update profile image");
      }

      const updated = (await res.json().catch(() => ({}))) as {
        _id?: string;
        username?: string;
        email?: string;
        profilePictureUrl?: string;
        bannerPictureUrl?: string;
      };
      window.dispatchEvent(new Event(USER_STATE_EVENT));

      if (updated.profilePictureUrl) {
        setProfilePictureUrl(updated.profilePictureUrl);
      }
      if (updated.bannerPictureUrl) {
        setBannerPictureUrl(updated.bannerPictureUrl);
      }
    },
    [userId],
  );

  const handleAvatarImageChange = useCallback(
    async (blob: Blob) => {
      await uploadUserImage("profilePicture", blob);
    },
    [uploadUserImage],
  );

  const handleBannerImageChange = useCallback(
    async (blob: Blob) => {
      await uploadUserImage("bannerPicture", blob);
    },
    [uploadUserImage],
  );

  useEffect(() => {
    let cancelled = false;

    fetchCurrentUser().then((data) => {
      if (cancelled || !data || !data._id) return;

      if (data.username) setUsername(data.username);
      setUserId(String(data._id));
      if (data.profilePictureUrl) setProfilePictureUrl(data.profilePictureUrl);
      if (data.bannerPictureUrl) setBannerPictureUrl(data.bannerPictureUrl);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let cancelled = false;

    fetch(`${API_URL}/api/users/${encodeURIComponent(userId)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ApiUserProfile | null) => {
        if (cancelled || !data) return;
        if (data.username) setUsername(data.username);
        if (data.profilePictureUrl) setProfilePictureUrl(data.profilePictureUrl);
        if (data.bannerPictureUrl) setBannerPictureUrl(data.bannerPictureUrl);
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [userId]);

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
    userId ?? "anon",
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
        bio="Welcome to your ArtPort profile."
        followers={0}
        following={0}
        posts={postCount}
        userPosts={visibleUserPosts}
        isEditable={true}
        onAvatarImageChange={handleAvatarImageChange}
        onBannerImageChange={handleBannerImageChange}
      />
    </main>
  );
}

export default function MePage() {
  return (
    <RequireAuth>
      <MePageContent />
    </RequireAuth>
  );
}
