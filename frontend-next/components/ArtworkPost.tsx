"use client";
/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import React, { useState } from "react";

import styles from "./ArtworkPost.module.css";
import FeedbackFormCard from "@/components/feedback/FeedbackFormCard";
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
  receivedResponses?: {
    _id: string;
    userId: string;
    username?: string | null;
    createdAt?: string;
    form: { questions: ApiFeedbackResponseQuestion[] };
  }[];
  otherPosts?: { id: string; imageSrc: string; title: string }[];
}

function responseValue(question: ApiFeedbackResponseQuestion): string {
  if (typeof question.textValue === "string" && question.textValue.trim()) {
    return question.textValue.trim();
  }

  if (typeof question.ratingSelection === "number") {
    return String(question.ratingSelection);
  }

  const selected = question.options
    .filter((option) => option.selected)
    .map((option) => option.option.trim())
    .filter(Boolean);

  if (selected.length > 0) {
    return selected.join(", ");
  }

  return "No answer";
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
  receivedResponses = [],
  otherPosts = [],
}: ArtworkPostProps) {
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const canInteract = isAuthenticated;
  const hasFeedbackForm = Boolean(feedbackConfig && feedbackFormId);
  const buttonOpenLabel = isOwnerArtwork ? "View Responses" : "Leave Feedback";
  const buttonCloseLabel = isOwnerArtwork ? "Close Responses" : "Close Feedback";

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
                <button
                  className={styles.feedbackButton}
                  onClick={() => setFeedbackOpen(!feedbackOpen)}
                  disabled={!hasFeedbackForm && !isOwnerArtwork}
                >
                  {feedbackOpen ? buttonCloseLabel : buttonOpenLabel}
                </button>
              ) : null}
            </div>
            {!canInteract ? (
              <Link href="/login" className={styles.captionLoginMessage}>
                Log in to interact with this post.
              </Link>
            ) : null}
          </div>
        </div>

        {/* Sidebar: artist info (only when feedback is closed) */}
        {!feedbackOpen && (
          <div className={styles.sidebar}>
            {artistProfileHref ? (
              <Link href={artistProfileHref} prefetch={false} className={styles.artistInfo}>
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
            ) : (
              <div className={styles.artistInfo}>
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
                  receivedResponses.map((response) => (
                    <article key={response._id} className={styles.responseCard}>
                      <div className={styles.responseMeta}>
                        <span className={styles.responseUser}>
                          User: {response.username || response.userId}
                        </span>
                        {response.createdAt ? (
                          <span className={styles.responseDate}>
                            {new Date(response.createdAt).toLocaleString()}
                          </span>
                        ) : null}
                      </div>
                      <div className={styles.responseAnswers}>
                        {response.form.questions
                          .slice()
                          .sort((a, b) => a.order - b.order)
                          .map((question) => (
                            <div key={question._id} className={styles.responseAnswerRow}>
                              <p className={styles.responseQuestion}>{question.question}</p>
                              <p className={styles.responseValue}>{responseValue(question)}</p>
                            </div>
                          ))}
                      </div>
                    </article>
                  ))
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
