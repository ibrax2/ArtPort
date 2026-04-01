"use client";
import React, { useState } from "react";
import styles from "./ArtworkPost.module.css";

interface ArtworkPostProps {
  imageUrl: string;
  title: string;
  description: string;
  artistName: string;
  artistAvatarUrl?: string;
}

export default function ArtworkPost({
  imageUrl,
  title,
  description,
  artistName,
  artistAvatarUrl,
}: ArtworkPostProps) {

  return (
    <div className={styles.page}>
      {/* Main area: image + sidebar */}
      <div className={styles.mainFrame}>
        {/* Image Container */}
        <div className={styles.imageContainer}>
          <img src={imageUrl} alt={title} className={styles.artworkImage} />
        </div>

        {/* Sidebar */}
        <div className={styles.sidebar}>
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
        </div>
      </div>

      {/* Caption Frame */}
      <div className={styles.captionFrame}>
        <h1 className={styles.artworkTitle}>{title}</h1>
        <p className={styles.description}>{description}</p>

        {/* Feedback Button */}
        <button className={styles.feedbackButton}>
          Leave Feedback
        </button>

      </div>
    </div>
  );
}
