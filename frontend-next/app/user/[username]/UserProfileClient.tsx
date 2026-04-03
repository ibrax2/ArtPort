"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import ProfileCard, {
  type ProfilePostItem,
} from "@/components/profilecard";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
const USER_STATE_EVENT = "artport-user-updated";

type StoredUser = {
  _id?: string;
  username?: string;
  email?: string;
  token?: string;
};

type ApiUserProfile = {
  _id?: string;
  username?: string;
  email?: string;
  bio?: string;
  profilePictureUrl?: string;
  bannerPictureUrl?: string;
};

type ApiArtwork = {
  _id: string;
  title?: string;
  filePath?: string;
  thumbnailPath?: string;
  imageUrl?: string;
  userId?: string;
};

function mapUserArtworks(
  data: unknown,
  userId: string | undefined
): ProfilePostItem[] {
  if (!Array.isArray(data) || !userId) return [];
  const items: ProfilePostItem[] = [];
  for (const raw of data) {
    const a = raw as ApiArtwork;
    if (a.userId == null || String(a.userId) !== String(userId)) continue;
    const imageSrc =
      a.thumbnailPath || a.filePath || a.imageUrl || "";
    if (!imageSrc) continue;
    items.push({
      id: String(a._id),
      title: a.title?.trim() ? a.title : "Untitled",
      imageSrc,
    });
  }
  return items;
}

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
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | undefined>(undefined);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("user");
      if (!raw) return;
      const user = JSON.parse(raw) as StoredUser;
      if (user._id) setCurrentUserId(String(user._id));
      if (
        typeof user.username === "string" &&
        user.username.trim().toLowerCase() === usernameParam.trim().toLowerCase()
      ) {
        router.replace("/me");
      }
    } catch {
    }
  }, [router, usernameParam]);

  const uploadUserImage = useCallback(
    async (fieldName: "profilePicture" | "bannerPicture", blob: Blob) => {
      if (!userId || !isOwnProfile) return;

      const token = localStorage.getItem("token");
      const formData = new FormData();
      const fileName =
        fieldName === "profilePicture" ? "profile.jpg" : "banner.jpg";
      formData.append(fieldName, blob, fileName);

      const res = await fetch(`${API_URL}/api/users/${encodeURIComponent(userId)}`, {
        method: "PATCH",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
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
    [userId, isOwnProfile],
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

    fetch(`${API_URL}/api/users/by-username/${encodeURIComponent(usernameParam)}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data: ApiUserProfile | null) => {
        if (cancelled || !data) return;
        if (data.username) setUsername(data.username);
        if (data._id) {
          setUserId(String(data._id));
          setIsOwnProfile(String(data._id) === currentUserId);
        }
        if (data.profilePictureUrl) setProfilePictureUrl(data.profilePictureUrl);
        if (data.bannerPictureUrl) setBannerPictureUrl(data.bannerPictureUrl);
      })
      .catch(() => {
      });

    return () => {
      cancelled = true;
    };
  }, [usernameParam, currentUserId]);

  useEffect(() => {
    if (!userId) {
      setUserPosts([]);
      return;
    }
    let cancelled = false;
    fetch(`${API_URL}/api/artworks`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (cancelled) return;
        setUserPosts(mapUserArtworks(data, userId));
      })
      .catch(() => {
        if (!cancelled) setUserPosts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const postCount = userPosts.length;

  return (
    <main className="user-profile-main">
      <ProfileCard
        username={username}
        avatarSrc={profilePictureUrl}
        bannerSrc={bannerPictureUrl}
        bio="Welcome to their ArtPort profile."
        followers={0}
        following={0}
        posts={postCount}
        userPosts={userPosts}
        isEditable={isOwnProfile}
        onAvatarImageChange={isOwnProfile ? handleAvatarImageChange : undefined}
        onBannerImageChange={isOwnProfile ? handleBannerImageChange : undefined}
      />
    </main>
  );
}
