"use client";

import { useEffect, useState } from "react";

import ArtworkPost from "@/components/ArtworkPost";
import {
  FEED_ARTWORK_PLACEHOLDER,
  artworkArtistFromDetail,
  artworkFullImageUrl,
  fetchArtworkForPost,
  bookmarkArtwork,
  unbookmarkArtwork,
  resolveApiAssetUrl,
  fetchArtworks,
  mapArtworkToProfileItem,
  updateArtwork,
  type ApiArtworkDetail,
} from "@/lib/artworkApi";
import {
  fetchReceivedFeedbackResponses,
  fetchFeedbackForm,
  fetchFeedbackFormByArtworkId,
  mapApiFormToConfig,
  type ApiFeedbackResponse,
  type ApiFeedbackForm,
  fetchUserFeedbackResponses,
} from "@/lib/feedbackApi";
import { getClientAuthToken } from "@/lib/authSession";
import { fetchCurrentUser } from "@/lib/currentUserApi";
import type { FeedbackFormConfig } from "@/types/feedback";
import { USER_STATE_EVENT } from "@/lib/userStateEvent";
import { fetchUserFolderTree } from "@/lib/folderApi";

type FolderOption = { id: string; label: string };

const normalizeFolderName = (value: string) => value.trim().toLowerCase();

function flattenOwnerFolders(
  node: {
    subfolders: Array<{
      _id: string;
      folderName: string;
      subfolders: unknown[];
    }>;
  },
  depth = 0,
): FolderOption[] {
  const options: FolderOption[] = [];
  for (const folder of node.subfolders || []) {
    if (normalizeFolderName(folder.folderName) !== "bookmarks") {
      options.push({
        id: String(folder._id),
        label: `${"  ".repeat(depth)}${folder.folderName}`,
      });
    }

    options.push(
      ...flattenOwnerFolders(
        {
          subfolders: Array.isArray(folder.subfolders)
            ? (folder.subfolders as Array<{
                _id: string;
                folderName: string;
                subfolders: unknown[];
              }>)
            : [],
        },
        depth + 1,
      ),
    );
  }

  return options;
}

type Props = {
  segment: string;
};

export default function PostPageClient({ segment }: Props) {
  const [artwork, setArtwork] = useState<ApiArtworkDetail | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [feedbackConfig, setFeedbackConfig] =
    useState<FeedbackFormConfig | null>(null);
  const [feedbackFormId, setFeedbackFormId] = useState<string | null>(null);
  const [isOwnerArtwork, setIsOwnerArtwork] = useState(false);
  const [receivedResponses, setReceivedResponses] = useState<ApiFeedbackResponse[]>([]);
  const [hasSubmittedFeedback, setHasSubmittedFeedback] = useState(false);
  const [otherPosts, setOtherPosts] = useState<{ id: string; imageSrc: string; title: string }[]>([]);
  const [isAuthenticated, setIsAuthenticated] = useState(() =>
    Boolean(getClientAuthToken())
  );
  const [ownerFolderOptions, setOwnerFolderOptions] = useState<FolderOption[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [currentFolderName, setCurrentFolderName] = useState("");
  const [isBookmarked, setIsBookmarked] = useState(false);

  useEffect(() => {
    const syncAuth = () => setIsAuthenticated(Boolean(getClientAuthToken()));
    syncAuth();
    window.addEventListener(USER_STATE_EVENT, syncAuth);
    window.addEventListener("storage", syncAuth);
    return () => {
      window.removeEventListener(USER_STATE_EVENT, syncAuth);
      window.removeEventListener("storage", syncAuth);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetchArtworkForPost(segment)
      .then(async (data) => {
        if (cancelled) return;
        if (!data || !data._id) {
          setLoading(false);
          setError("Artwork not found.");
          setArtwork(null);
          return;
        }
        setArtwork(data);

        const artist = artworkArtistFromDetail(data);
        const token = getClientAuthToken();
        let currentUser: Awaited<ReturnType<typeof fetchCurrentUser>> | null = null;
        if (token) {
          try {
            currentUser = await fetchCurrentUser(token);
          } catch {
            currentUser = null;
          }
        }
        const isOwner =
          Boolean(currentUser?._id) &&
          Boolean(artist.userId) &&
          String(currentUser?._id) === String(artist.userId);
        setIsOwnerArtwork(isOwner);
        
        // Extract folder info
        let folderId = "";
        let folderName = "";
        if (data.folderId) {
          const folderData = data.folderId as any;
          if (typeof folderData === "string") {
            folderId = folderData;
          } else if (typeof folderData === "object" && folderData._id) {
            folderId = String(folderData._id);
            folderName = folderData.folderName || "";
          }
        }
        setSelectedFolderId(folderId);
        setCurrentFolderName(folderName);

        if (isOwner && currentUser?._id) {
          fetchUserFolderTree(String(currentUser._id))
            .then((tree) => {
              if (cancelled || !tree) return;
              setOwnerFolderOptions(flattenOwnerFolders(tree));
            })
            .catch(() => {
              if (!cancelled) setOwnerFolderOptions([]);
            });
        }

        // Check if artwork is bookmarked (for non-owners)
        if (!isOwner && currentUser?._id && isAuthenticated) {
          fetchUserFolderTree(String(currentUser._id))
            .then((tree) => {
              if (cancelled || !tree) return;
              // Find bookmarks folder
              interface FolderNode {
                folderName?: string;
                subfolders?: FolderNode[];
                artworks?: Array<{ _id?: string }>;
              }
              const findBookmarksFolder = (node: FolderNode): FolderNode | null => {
                if (
                  node.folderName &&
                  node.folderName.trim().toLowerCase() === "bookmarks"
                ) {
                  return node;
                }
                if (node.subfolders && Array.isArray(node.subfolders)) {
                  for (const subfolder of node.subfolders) {
                    const found = findBookmarksFolder(subfolder);
                    if (found) return found;
                  }
                }
                return null;
              };

              const bookmarksFolder = findBookmarksFolder(tree);
              if (bookmarksFolder && bookmarksFolder.artworks) {
                const isInBookmarks = bookmarksFolder.artworks.some(
                  (artwork) => String(artwork._id) === String(data._id)
                );
                setIsBookmarked(isInBookmarks);
              }
            })
            .catch(() => {
              if (!cancelled) setIsBookmarked(false);
            });
        }

        if (artist.userId) {
          fetchArtworks({ userId: artist.userId }).then((allArtworks) => {
            if (cancelled) return;
            const otherUserArtworks = allArtworks
              .filter(
                (a) => String(a._id) !== String(data._id)
              )
              .map((a, index) => mapArtworkToProfileItem(a, index))
              .slice(0, 4);
            setOtherPosts(otherUserArtworks);
          }).catch(() => {});
        }

        let form: ApiFeedbackForm | null = null;

        if (token) {
          try {
            const storedFormId = localStorage.getItem(
              `artport_form_for_${data._id}`
            );
            if (storedFormId) {
              form = await fetchFeedbackForm(storedFormId, token).catch(
                () => null
              );
            }
          } catch {}
        }

        if (!form) {
          try {
            form = await fetchFeedbackFormByArtworkId(data._id, token);
          } catch {
            form = null;
          }
        }

        if (cancelled) return;
        if (form) {
          setFeedbackConfig(mapApiFormToConfig(form));
          setFeedbackFormId(String(form._id));
          if (isOwner && token) {
            try {
              const responses = await fetchReceivedFeedbackResponses(
                String(form._id),
                token
              );
              if (!cancelled) {
                setReceivedResponses(responses);
              }
            } catch {
              if (!cancelled) {
                setReceivedResponses([]);
              }
            }
          } else if (!isOwner && token) {
            try {
              const userResponses = await fetchUserFeedbackResponses(
                String(form._id),
                token
              );
              if (!cancelled) {
                setHasSubmittedFeedback(userResponses.length > 0);
              }
            } catch {
              if (!cancelled) {
                setHasSubmittedFeedback(false);
              }
            }
          }
        }
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) {
          setLoading(false);
          setError("Could not load artwork.");
          setArtwork(null);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [segment, isAuthenticated]);

  if (loading) {
    return (
      <p style={{ padding: 24, fontFamily: "Inter, sans-serif" }}>Loading…</p>
    );
  }

  if (error || !artwork) {
    return (
      <p style={{ padding: 24, color: "#b91c1c", fontFamily: "Inter, sans-serif" }}>
        {error || "Artwork not found."}
      </p>
    );
  }

  const rawImg = artworkFullImageUrl(artwork);
  const imageUrl = rawImg
    ? resolveApiAssetUrl(rawImg) || rawImg
    : FEED_ARTWORK_PLACEHOLDER;

  const artist = artworkArtistFromDetail(artwork);
  const avatar = artist.avatarUrl
    ? resolveApiAssetUrl(artist.avatarUrl) || artist.avatarUrl
    : undefined;

  const artistProfileHref =
    artist.artistUsername != null && artist.artistUsername !== ""
      ? `/user/${encodeURIComponent(artist.artistUsername)}`
      : undefined;

  return (
    <ArtworkPost
      imageUrl={imageUrl}
      title={artwork.title?.trim() ? artwork.title : "Untitled"}
      description={
        typeof artwork.description === "string" ? artwork.description : ""
      }
      artistName={artist.name}
      artistAvatarUrl={avatar}
      artistProfileHref={artistProfileHref}
      feedbackConfig={feedbackConfig ?? undefined}
      feedbackFormId={feedbackFormId ?? undefined}
      isOwnerArtwork={isOwnerArtwork}
      isAuthenticated={isAuthenticated}
      receivedResponses={receivedResponses}
      hasSubmittedFeedback={hasSubmittedFeedback}
      otherPosts={otherPosts}
      artworkId={typeof artwork._id === "string" ? artwork._id : undefined}
      onSaveToBookmarks={
        !isOwnerArtwork
          ? async () => {
              if (!artwork._id) return;
              await bookmarkArtwork(String(artwork._id));
              setIsBookmarked(true);
            }
          : undefined
      }
      isBookmarked={isBookmarked}
      onRemoveFromBookmarks={
        !isOwnerArtwork
          ? async () => {
              if (!artwork._id) return;
              await unbookmarkArtwork(String(artwork._id));
              setIsBookmarked(false);
            }
          : undefined
      }
      folderOptions={ownerFolderOptions}
      selectedFolderId={selectedFolderId}
      currentFolderName={currentFolderName}
      onMoveToFolder={
        isOwnerArtwork
          ? async (folderId: string) => {
              if (!artwork._id) return;
              const updated = await updateArtwork(String(artwork._id), {
                folderId,
              });
              setArtwork(updated);
              
              // Extract folder info from updated response
              let nextFolderId = "";
              let nextFolderName = "";
              const updatedFolderData = updated.folderId as any;
              if (updatedFolderData) {
                if (typeof updatedFolderData === "string") {
                  nextFolderId = updatedFolderData;
                } else if (typeof updatedFolderData === "object" && updatedFolderData._id) {
                  nextFolderId = String(updatedFolderData._id);
                  nextFolderName = updatedFolderData.folderName || "";
                }
              }
              setSelectedFolderId(nextFolderId);
              setCurrentFolderName(nextFolderName);
            }
          : undefined
      }
    />
  );
}
