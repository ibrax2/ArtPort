"use client";

import { useEffect, useState } from "react";

import ArtworkPost from "@/components/ArtworkPost";
import {
  FEED_ARTWORK_PLACEHOLDER,
  artworkArtistFromDetail,
  artworkDetailImageUrl,
  fetchArtworkForPost,
  resolveApiAssetUrl,
  fetchArtworks,
  artworkMatchesUserId,
  mapArtworkToProfileItem,
  type ApiArtworkDetail,
} from "@/lib/artworkApi";
import {
  fetchReceivedFeedbackResponses,
  fetchFeedbackForm,
  fetchFeedbackFormByArtworkId,
  mapApiFormToConfig,
  type ApiFeedbackResponse,
  type ApiFeedbackForm,
} from "@/lib/feedbackApi";
import { getClientAuthToken } from "@/lib/authSession";
import { fetchCurrentUser } from "@/lib/currentUserApi";
import type { FeedbackFormConfig } from "@/types/feedback";

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
  const [otherPosts, setOtherPosts] = useState<{ id: string; imageSrc: string; title: string }[]>([]);
  const isAuthenticated = Boolean(getClientAuthToken());

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
        const currentUser = token ? await fetchCurrentUser(token) : null;
        const isOwner =
          Boolean(currentUser?._id) &&
          Boolean(artist.userId) &&
          String(currentUser?._id) === String(artist.userId);
        setIsOwnerArtwork(isOwner);

        if (artist.userId) {
          fetchArtworks().then((allArtworks) => {
            if (cancelled) return;
            const otherUserArtworks = allArtworks
              .filter(
                (a) =>
                  artworkMatchesUserId(a, artist.userId) &&
                  String(a._id) !== String(data._id)
              )
              .map((a, index) => mapArtworkToProfileItem(a, index))
              .slice(0, 4);
            setOtherPosts(otherUserArtworks);
          }).catch(() => {});
        }

        let form: ApiFeedbackForm | null = null;

        // 1) Try stored formId (reliable by-ID endpoint)
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
          } catch { /* localStorage unavailable */ }
        }

        // 2) Fall back to artwork-based search
        if (!form) {
          form = await fetchFeedbackFormByArtworkId(data._id, token);
        }

        if (cancelled) return;
        if (form) {
          setFeedbackConfig(mapApiFormToConfig(form));
          setFeedbackFormId(String(form._id));
          if (isOwner && token) {
            const responses = await fetchReceivedFeedbackResponses(
              String(form._id),
              token
            );
            if (!cancelled) {
              setReceivedResponses(responses);
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
  }, [segment]);

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

  const rawImg = artworkDetailImageUrl(artwork);
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
      otherPosts={otherPosts}
    />
  );
}
