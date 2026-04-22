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
}

export default function ArtworkPost({
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
}: ArtworkPostProps) {
  const pathname = usePathname();
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const canInteract = isAuthenticated;
  const hasFeedbackForm = Boolean(feedbackConfig && feedbackFormId);
  const loginHref =
    pathname && pathname.startsWith("/")
      ? `/login?next=${encodeURIComponent(pathname)}`
      : "/login";
  const noFormForVisitor = canInteract && !hasFeedbackForm && !isOwnerArtwork;
  const feedbackDisabledTitle = noFormForVisitor
    ? "The artist has not set up a feedback form for this artwork yet."
    : undefined;
  const buttonOpenLabel = isOwnerArtwork
    ? "Feedback summary"
    : "Leave Feedback";
  const buttonCloseLabel = isOwnerArtwork ? "Close summary" : "Close Feedback";

  const feedbackButton = canInteract ? (
    <button
      type="button"
      className={styles.feedbackButton}
      onClick={() => setFeedbackOpen(!feedbackOpen)}
      disabled={noFormForVisitor}
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
                    disabled={noFormForVisitor}
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