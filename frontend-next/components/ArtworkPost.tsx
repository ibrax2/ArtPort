"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useState } from "react";

import styles from "./ArtworkPost.module.css";
import FeedbackFormCard from "@/components/feedback/FeedbackFormCard";
import FeedbackResponsesSummary from "@/components/feedback/FeedbackResponsesSummary";
import type { ApiFeedbackResponseQuestion } from "@/lib/feedbackApi";
import type { FeedbackFormConfig } from "@/types/feedback";

interface ArtworkPostProps {
  artworkId?: string;
  imageUrl: string;
  title: string;
  description: string;
  artistName: string;
  artistAvatarUrl?: string;
  artistProfileHref?: string;
  feedbackConfig?: FeedbackFormConfig;
  feedbackFormId?: string;
  isOwnerArtwork?: boolean;
  isAuthenticated?: boolean;
  onDeletePost?: () => void;
  showDeletePost?: boolean;
  receivedResponses?: {
    _id: string;
    userId: string;
    username?: string | null;
    createdAt?: string;
    form: { questions: ApiFeedbackResponseQuestion[] };
  }[];
  otherPosts?: { id: string; imageSrc: string; title: string }[];
  onSaveToBookmarks?: () => Promise<void> | void;
  isBookmarked?: boolean;
  onRemoveFromBookmarks?: () => Promise<void> | void;
  folderOptions?: Array<{ id: string; label: string }>;
  selectedFolderId?: string;
  currentFolderName?: string;
  onMoveToFolder?: (folderId: string) => Promise<void> | void;
  hasSubmittedFeedback?: boolean;
}

export default function ArtworkPost({
  artworkId,
  imageUrl,
  title,
  description,
  artistName,
  artistAvatarUrl,
  artistProfileHref,
  feedbackConfig,
  feedbackFormId,
  isOwnerArtwork = false,
  isAuthenticated = true,
  onDeletePost,
  showDeletePost = false,
  receivedResponses = [],
  otherPosts = [],
  onSaveToBookmarks,
  isBookmarked = false,
  onRemoveFromBookmarks,
  folderOptions = [],
  selectedFolderId = "",
  currentFolderName = "",
  onMoveToFolder,
  hasSubmittedFeedback = false,
}: ArtworkPostProps) {
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const canInteract = isAuthenticated;
  const hasFeedbackForm = Boolean(feedbackConfig && feedbackFormId);
  const loginHref =
    pathname && pathname.startsWith("/")
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login";
  
  const [localSubmitted, setLocalSubmitted] = useState(hasSubmittedFeedback);
  React.useEffect(() => {
    setLocalSubmitted(hasSubmittedFeedback);
  }, [hasSubmittedFeedback]);

  const noFormForVisitor = canInteract && !hasFeedbackForm && !isOwnerArtwork;
  const cannotSubmitMore = !isOwnerArtwork && localSubmitted;
  
  const feedbackDisabledTitle = noFormForVisitor
    ? "The artist has not set up a feedback form for this artwork yet."
    : cannotSubmitMore
    ? "You have already submitted feedback for this artwork."
    : undefined;
    
  const buttonOpenLabel = isOwnerArtwork
    ? "Feedback summary"
    : cannotSubmitMore
    ? "Feedback Submitted"
    : "Leave Feedback";
    
  const buttonCloseLabel = isOwnerArtwork ? "Close summary" : "Close Feedback";
  const isButtonDisabled = noFormForVisitor || (cannotSubmitMore && !feedbackOpen);

  const [bookmarkBusy, setBookmarkBusy] = useState(false);
  const [bookmarkMessage, setBookmarkMessage] = useState("");
  const [folderIdDraft, setFolderIdDraft] = useState(selectedFolderId);
  const [moveBusy, setMoveBusy] = useState(false);

  React.useEffect(() => {
    setFolderIdDraft(selectedFolderId);
  }, [selectedFolderId]);

  const feedbackButton = canInteract ? (
    <button
      type="button"
      className={styles.feedbackButton}
      onClick={() => setFeedbackOpen(!feedbackOpen)}
      disabled={isButtonDisabled}
      title={feedbackDisabledTitle}
    >
      {feedbackOpen ? buttonCloseLabel : buttonOpenLabel}
    </button>
  ) : null;

  return (
    <div className={styles.page}>
      <div className={styles.mainFrame}>

        {/* Left Column: image + caption */}
        <div className={feedbackOpen ? styles.leftColumnNarrow : styles.leftColumn}>

          {/* Image Container */}
          <div className={styles.imageContainer}>
            <img src={imageUrl} alt={title} className={styles.artworkImage} />
          </div>

          {/* Caption Frame */}
          <div
            className={`${styles.captionFrame} ${!canInteract ? styles.captionFrameLocked : ""}`}
          >
            <div className={!canInteract ? styles.captionFrameLockedContent : ""}>
              <h1 className={styles.artworkTitle}>{title}</h1>
              <p className={styles.description}>{description}</p>
              {canInteract ? (
                <div className={styles.feedbackActions}>
                  <button
                    type="button"
                    className={styles.feedbackButton}
                    onClick={() => setFeedbackOpen(!feedbackOpen)}
                    disabled={isButtonDisabled}
                    title={feedbackDisabledTitle}
                  >
                    {feedbackOpen ? buttonCloseLabel : buttonOpenLabel}
                  </button>
                  {noFormForVisitor ? (
                    <p className={styles.feedbackNoFormHint} role="note">
                      There is no feedback form on this post yet. The artist
                      creates one after uploading (feedback setup step).
                    </p>
                  ) : null}
                  {showDeletePost && onDeletePost ? (
                    <button
                      type="button"
                      className={styles.deletePostButton}
                      onClick={onDeletePost}
                    >
                      Remove from my gallery
                    </button>
                  ) : null}
                  {!isOwnerArtwork && canInteract && (onSaveToBookmarks || onRemoveFromBookmarks) ? (
                    <>
                      {!isBookmarked && onSaveToBookmarks ? (
                        <button
                          type="button"
                          className={styles.feedbackButton}
                          disabled={bookmarkBusy}
                          onClick={async () => {
                            setBookmarkMessage("");
                            setBookmarkBusy(true);
                            try {
                              await Promise.resolve(onSaveToBookmarks());
                              setBookmarkMessage("Saved to your Bookmarks folder");
                            } catch (error: unknown) {
                              setBookmarkMessage(
                                error instanceof Error
                                  ? error.message
                                  : "Could not save to bookmarks",
                              );
                            } finally {
                              setBookmarkBusy(false);
                            }
                          }}
                        >
                          {bookmarkBusy ? "Saving..." : "Save to Bookmarks"}
                        </button>
                      ) : null}
                      {isBookmarked && onRemoveFromBookmarks ? (
                        <button
                          type="button"
                          className={styles.feedbackButton}
                          disabled={bookmarkBusy}
                          onClick={async () => {
                            setBookmarkMessage("");
                            setBookmarkBusy(true);
                            try {
                              await Promise.resolve(onRemoveFromBookmarks());
                              setBookmarkMessage("Removed from Bookmarks");
                            } catch (error: unknown) {
                              setBookmarkMessage(
                                error instanceof Error
                                  ? error.message
                                  : "Could not remove from bookmarks",
                              );
                            } finally {
                              setBookmarkBusy(false);
                            }
                          }}
                        >
                          {bookmarkBusy ? "Removing..." : "Remove from Bookmarks"}
                        </button>
                      ) : null}
                    </>
                  ) : null}
                  {bookmarkMessage ? (
                    <p className={styles.feedbackNoFormHint}>{bookmarkMessage}</p>
                  ) : null}
                  {isOwnerArtwork && canInteract && onMoveToFolder ? (
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <span style={{ fontSize: 12, color: "#666" }}>Current Folder:</span>
                        <span style={{ fontSize: 12, fontWeight: 500 }}>
                          {currentFolderName || folderOptions.find((opt) => opt.id === selectedFolderId)?.label || "No folder"}
                        </span>
                      </div>
                      <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                        <label htmlFor={`folder-move-${artworkId || "artwork"}`} style={{ fontSize: 12 }}>
                          Move to:
                        </label>
                        <select
                          id={`folder-move-${artworkId || "artwork"}`}
                          value={folderIdDraft}
                          onChange={(e) => setFolderIdDraft(e.target.value)}
                          style={{ padding: "6px 8px", borderRadius: 6 }}
                        >
                          <option value="">No folder</option>
                          {folderOptions.map((opt) => (
                            <option key={opt.id} value={opt.id}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          className={styles.feedbackButton}
                          disabled={moveBusy || folderIdDraft === selectedFolderId}
                          onClick={async () => {
                            setMoveBusy(true);
                            try {
                              await Promise.resolve(onMoveToFolder(folderIdDraft));
                            } finally {
                              setMoveBusy(false);
                            }
                          }}
                        >
                          {moveBusy ? "Updating..." : "Move Post"}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
            {!canInteract ? (
              <Link href={loginHref} className={styles.captionLoginMessage}>
                Log in to interact with this post.
              </Link>
            ) : null}
          </div>
        </div>

        {/* Sidebar: artist info (only when feedback is closed) */}
        {!feedbackOpen && (
          <div className={styles.sidebar}>
            {artistProfileHref ? (
              <div className={styles.artistInfo}>
                <Link href={artistProfileHref} prefetch={false} className={styles.artistInfoTop}>
                  {artistAvatarUrl ? (
                    <img
                      src={artistAvatarUrl}
                      alt={artistName}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder} />
                  )}
                  <span className={styles.username}>{artistName}</span>
                </Link>
                {feedbackButton}
                {!canInteract && !isOwnerArtwork ? (
                  <Link href={loginHref} className={styles.feedbackLoginHint}>
                    Log in to leave feedback
                  </Link>
                ) : null}
              </div>
            ) : (
              <div className={styles.artistInfo}>
                <div className={styles.artistInfoTop}>
                  {artistAvatarUrl ? (
                    <img
                      src={artistAvatarUrl}
                      alt={artistName}
                      className={styles.avatar}
                    />
                  ) : (
                    <div className={styles.avatarPlaceholder} />
                  )}
                  <span className={styles.username}>{artistName}</span>
                </div>
                {feedbackButton}
                {!canInteract && !isOwnerArtwork ? (
                  <Link href={loginHref} className={styles.feedbackLoginHint}>
                    Log in to leave feedback
                  </Link>
                ) : null}
              </div>
            )}

            <div className={styles.otherPostsSection}>
              <h2 className={styles.otherPostsHeading}>More from {artistName}</h2>
              {otherPosts.length > 0 ? (
                <div className={styles.otherPostsGrid}>
                  {otherPosts.map((post) => (
                    <Link
                      key={post.id}
                      href={`/post/${post.id}`}
                      className={styles.otherPostCard}
                      title={post.title}
                    >
                      <img
                        src={post.imageSrc}
                        alt={post.title}
                        className={styles.otherPostImage}
                      />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className={styles.noOtherPosts}>
                  This is their only post so far!
                </div>
              )}
            </div>
          </div>
        )}

        {/* Feedback Form Panel (replaces sidebar when open) */}
        {feedbackOpen && (
          <div className={styles.feedbackPanel}>
            {isOwnerArtwork ? (
              <div className={styles.responsesList}>
                <h2 className={styles.responsesHeading}>Responses</h2>
                {receivedResponses.length === 0 ? (
                  <p className={styles.emptyResponses}>No responses yet from other users.</p>
                ) : (
                  <FeedbackResponsesSummary
                    responses={receivedResponses}
                    feedbackConfig={feedbackConfig}
                  />
                )}
              </div>
            ) : hasFeedbackForm && feedbackConfig ? (
              <FeedbackFormCard
                config={feedbackConfig}
                remoteFormId={feedbackFormId}
                onSuccess={() => setLocalSubmitted(true)}
              />
            ) : (
              <div style={{ padding: "16px", textAlign: "center" }}>
                <p style={{ color: "#666", marginBottom: "12px" }}>
                  No feedback form has been created for this artwork yet.
                </p>
                <p style={{ fontSize: "14px", color: "#999" }}>
                  The artist can create a feedback form from the upload page.
                </p>
              </div>
            )}
          </div>
        )}

      </div>
    </div>
  );
}