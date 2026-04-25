import { apiFetch } from "@/lib/apiClient";
import { publicAsset } from "@/lib/paths";

export const FEED_ARTWORK_PLACEHOLDER = publicAsset("/images/artwork_1.jpg");
export const DEFAULT_ARTIST_AVATAR = publicAsset("/avatar-default.svg");

export type ArtworkUserSummary = {
  _id?: string;
  username?: string;
  profilePicture?: string;
  profilePictureUrl?: string;
};

export type ApiArtworkCommon = {
  _id?: string;
  title?: string;
  description?: string;
  filePath?: string;
  thumbnailPath?: string;
  imageUrl?: string;
  isPublic?: boolean;
  folderId?: string;
  userId?: string | ArtworkUserSummary;
  user?: ArtworkUserSummary;
  userDetails?: ArtworkUserSummary;
};

export type ApiArtworkDetail = ApiArtworkCommon;

export type ArtworkArtist = {
  name: string;
  artistUsername?: string;
  userId?: string;
  avatarUrl?: string;
};

export type ArtworkFeedItem = {
  id: string;
  image: string;
  title: string;
  username: string;
  userImage: string;
};

export type ArtworkProfileItem = {
  id: string;
  imageSrc: string;
  title: string;
};

function asObject(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}

function stringOrEmpty(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function selectArtworkUser(artwork: ApiArtworkCommon): ArtworkUserSummary | null {
  const candidates = [artwork.userDetails, artwork.user, artwork.userId];

  for (const candidate of candidates) {
    const candidateObject = asObject(candidate);
    if (!candidateObject) continue;

    return {
      _id: stringOrEmpty(candidateObject._id),
      username: stringOrEmpty(candidateObject.username),
      profilePicture: stringOrEmpty(candidateObject.profilePicture),
      profilePictureUrl: stringOrEmpty(candidateObject.profilePictureUrl),
    };
  }

  return null;
}

function selectArtworkUserId(artwork: ApiArtworkCommon): string {
  if (typeof artwork.userId === "string") {
    return artwork.userId.trim();
  }

  const candidate = asObject(artwork.userId);
  return stringOrEmpty(candidate?._id);
}

export function resolveApiAssetUrl(url?: string | null): string {
  return stringOrEmpty(url);
}

export function artworkDetailImageUrl(
  artwork: Pick<ApiArtworkCommon, "thumbnailPath" | "filePath" | "imageUrl">
): string {
  return (
    resolveApiAssetUrl(artwork.thumbnailPath) ||
    resolveApiAssetUrl(artwork.filePath) ||
    resolveApiAssetUrl(artwork.imageUrl)
  );
}

export function artworkFullImageUrl(
  artwork: Pick<ApiArtworkCommon, "thumbnailPath" | "filePath" | "imageUrl">
): string {
  return (
    resolveApiAssetUrl(artwork.filePath) ||
    resolveApiAssetUrl(artwork.thumbnailPath) ||
    resolveApiAssetUrl(artwork.imageUrl)
  );
}

export function artworkArtistFromDetail(
  artwork: ApiArtworkCommon
): ArtworkArtist {
  const user = selectArtworkUser(artwork);

  return {
    name: user?.username || "Unknown artist",
    artistUsername: user?.username || undefined,
    userId: selectArtworkUserId(artwork) || undefined,
    avatarUrl:
      resolveApiAssetUrl(user?.profilePictureUrl) ||
      resolveApiAssetUrl(user?.profilePicture) ||
      undefined,
  };
}

export function artworkMatchesUserId(
  artwork: ApiArtworkCommon,
  userId: string | undefined
): boolean {
  const target = stringOrEmpty(userId);
  if (!target) return false;

  if (typeof artwork.userId === "string") {
    return artwork.userId.trim() === target;
  }

  const populatedUser = asObject(artwork.userId);
  if (stringOrEmpty(populatedUser?._id) === target) return true;

  return selectArtworkUserId(artwork) === target;
}

export function mapArtworkToFeedItem(
  artwork: ApiArtworkCommon,
  index: number
): ArtworkFeedItem {
  const artist = artworkArtistFromDetail(artwork);

  return {
    id: stringOrEmpty(artwork._id) || `post-${index}`,
    image: artworkDetailImageUrl(artwork) || FEED_ARTWORK_PLACEHOLDER,
    title: stringOrEmpty(artwork.title) || "Untitled",
    username: artist.name,
    userImage: artist.avatarUrl || DEFAULT_ARTIST_AVATAR,
  };
}

export function mapArtworkToProfileItem(
  artwork: ApiArtworkCommon,
  index: number
): ArtworkProfileItem {
  return {
    id: stringOrEmpty(artwork._id) || `artwork-${index}`,
    title: stringOrEmpty(artwork.title) || "Untitled",
    imageSrc: artworkDetailImageUrl(artwork) || FEED_ARTWORK_PLACEHOLDER,
  };
}

export async function fetchArtworks(options: { auth?: boolean; userId?: string; includePrivate?: boolean } = {}): Promise<ApiArtworkCommon[]> {
  try {
    const userId = stringOrEmpty(options.userId);
    const includePrivate = Boolean(options.includePrivate);

    const query = new URLSearchParams();
    if (userId) query.set("userId", userId);
    if (includePrivate) query.set("includePrivate", "true");
    const suffix = query.toString();
    const path = suffix ? `/api/artworks?${suffix}` : "/api/artworks";

    const res = await apiFetch(path, {
      auth: options.auth ?? false,
      credentials: options.auth ? "include" : "omit",
    });
    if (!res.ok) return [];

    const data = (await res.json().catch(() => [])) as unknown;
    return Array.isArray(data) ? (data as ApiArtworkCommon[]) : [];
  } catch {
    return [];
  }
}

export async function fetchArtworkForPost(
  artworkId: string
): Promise<ApiArtworkDetail | null> {
  const id = stringOrEmpty(artworkId);
  if (!id) return null;

  try {
    const res = await apiFetch(`/api/artworks/${encodeURIComponent(id)}`, {
      auth: true,
    });
    if (!res.ok) return null;

    const data = (await res.json().catch(() => null)) as unknown;
    if (!data || typeof data !== "object") return null;

    return data as ApiArtworkDetail;
  } catch {
    return null;
  }
}

export async function bookmarkArtwork(artworkId: string): Promise<void> {
  const id = stringOrEmpty(artworkId);
  if (!id) {
    throw new Error("Artwork id is required");
  }

  const res = await apiFetch(`/api/artworks/${encodeURIComponent(id)}/bookmark`, {
    method: "POST",
    auth: true,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(data.message || "Could not save to bookmarks");
  }
}

export async function unbookmarkArtwork(artworkId: string): Promise<void> {
  const id = stringOrEmpty(artworkId);
  if (!id) {
    throw new Error("Artwork id is required");
  }

  const res = await apiFetch(`/api/artworks/${encodeURIComponent(id)}/unbookmark`, {
    method: "POST",
    auth: true,
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
    };
    throw new Error(data.message || "Could not remove from bookmarks");
  }
}

export async function updateArtwork(
  artworkId: string,
  payload: {
    title?: string;
    description?: string;
    folderId?: string;
  },
): Promise<ApiArtworkDetail> {
  const id = stringOrEmpty(artworkId);
  if (!id) {
    throw new Error("Artwork id is required");
  }

  const res = await apiFetch(`/api/artworks/${encodeURIComponent(id)}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify(payload),
  });

  const data = (await res.json().catch(() => ({}))) as ApiArtworkDetail & {
    message?: string;
  };
  if (!res.ok) {
    throw new Error(data.message || "Could not update artwork");
  }

  return data;
}