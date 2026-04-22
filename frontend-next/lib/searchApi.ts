import { apiFetch } from "@/lib/apiClient";
import { resolveApiAssetUrl } from "@/lib/artworkApi";

export type SearchResultArtist = {
  id: string;
  type: "artist";
  username: string;
  profilePictureUrl?: string;
  handle?: string;
};

export type SearchResultArtwork = {
  id: string;
  type: "artwork";
  title: string;
  artworkImageUrl: string;
  artistUsername?: string;
  artistProfilePictureUrl?: string;
};

export type SearchResultItem = SearchResultArtist | SearchResultArtwork;

type ApiUserHit = {
  _id: string;
  username?: string;
  profilePictureUrl?: string;
};

type ApiArtworkHit = {
  _id: string;
  title?: string;
  filePath?: string;
  thumbnailPath?: string;
  imageUrl?: string;
  userId?:
    | {
        username?: string;
        profilePicture?: string;
        profilePictureUrl?: string;
      }
    | string;
  userDetails?: { username?: string; profilePictureUrl?: string };
};

export async function fetchSearchResults(
  query: string,
  filter: string
): Promise<SearchResultItem[]> {
  const q = query.trim();
  if (!q) return [];

  try {
    const isArtist = filter.toLowerCase() === "artist";
    const path = isArtist
      ? `/api/search/users?query=${encodeURIComponent(q)}`
      : `/api/search/artworks?query=${encodeURIComponent(q)}`;

    const res = await apiFetch(path, { auth: true });

    const data = (await res.json().catch(() => ({}))) as {
      message?: string;
      results?: unknown[];
    };

    if (!res.ok) {
      return [];
    }

    const raw = Array.isArray(data.results) ? data.results : [];

    if (isArtist) {
      return (raw as ApiUserHit[]).map((u) => ({
        id: String(u._id),
        type: "artist" as const,
        username: u.username?.trim() ? u.username : "Unknown",
        profilePictureUrl: u.profilePictureUrl,
      }));
    }

    return (raw as ApiArtworkHit[]).map((a) => ({
      id: String(a._id),
      type: "artwork" as const,
      title: a.title?.trim() ? a.title : "Untitled",
      artworkImageUrl:
        resolveApiAssetUrl(a.thumbnailPath) ||
        resolveApiAssetUrl(a.filePath) ||
        resolveApiAssetUrl(a.imageUrl) ||
        "",
      artistUsername:
        a.userDetails?.username ||
        (typeof a.userId === "object" ? a.userId.username : undefined),
      artistProfilePictureUrl:
        resolveApiAssetUrl(a.userDetails?.profilePictureUrl) ||
        (typeof a.userId === "object"
          ? resolveApiAssetUrl(a.userId.profilePictureUrl) ||
            resolveApiAssetUrl(a.userId.profilePicture)
          : undefined),
    }));
  } catch {
    return [];
  }
}
