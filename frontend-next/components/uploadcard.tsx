"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * Artwork + square thumbnail upload UI. Sends FormData via optional `onUpload`.
 * Backend wiring: see docs/BACKEND_INTEGRATION.md (pass `onUpload` + `userId` from the upload page).
 */
import React, { useRef, useState } from "react";

import ImageCropModal from "@/components/profile/ImageCropModal";
import { dataUrlToBlob } from "@/lib/cropImage";
import {
  sanitizeMultilineText,
  sanitizeSingleLineText,
  TEXT_LIMITS,
} from "@/lib/textInput";

const ACCEPT_IMAGES =
  "image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,image/heic,image/heif";

/** ArtIcon feed tiles are square (300×300); only the thumbnail file uses this crop. */
const THUMB_ASPECT = 1;

export type UploadCardProps = {
  onUpload?: (formData: FormData) => Promise<void> | void;
  userId?: string;
};

export default function UploadCardExact({ onUpload, userId }: UploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  /** Object URL for the full file — shown in the main preview (never cropped). */
  const [artworkDisplayUrl, setArtworkDisplayUrl] = useState("");
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  /** JPEG data URL of the square crop — shown in the thumbnail preview below */
  const [thumbnailDisplayUrl, setThumbnailDisplayUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  /** True when re-cropping thumbnail only — cancel must not remove the artwork */
  const [adjustingThumbnail, setAdjustingThumbnail] = useState(false);

  const fullImageUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revokeFullImageUrl = () => {
    if (fullImageUrlRef.current) {
      URL.revokeObjectURL(fullImageUrlRef.current);
      fullImageUrlRef.current = null;
    }
    setArtworkDisplayUrl("");
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    revokeFullImageUrl();
    setThumbnailBlob(null);
    setThumbnailDisplayUrl("");

    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    fullImageUrlRef.current = url;
    setArtworkDisplayUrl(url);
    setRawImageSrc(url);
    e.target.value = "";
  };

  const handleCropApply = (dataUrl: string) => {
    const blob = dataUrlToBlob(dataUrl);
    if (blob) setThumbnailBlob(blob);
    setThumbnailDisplayUrl(dataUrl);
    setRawImageSrc(null);
    setAdjustingThumbnail(false);
    setSubmitError("");
  };

  const handleCropCancel = () => {
    if (adjustingThumbnail) {
      setRawImageSrc(null);
      setAdjustingThumbnail(false);
      return;
    }
    revokeFullImageUrl();
    setSelectedFile(null);
    setThumbnailBlob(null);
    setThumbnailDisplayUrl("");
    setRawImageSrc(null);
  };

  const handleChangeThumbnail = () => {
    if (!artworkDisplayUrl) return;
    setAdjustingThumbnail(true);
    setRawImageSrc(artworkDisplayUrl);
    setSubmitError("");
  };

  const handleBoxClick = () => {
    if (artworkDisplayUrl) return;
    fileInputRef.current?.click();
  };

  const handleReselectPhoto = () => {
    revokeFullImageUrl();
    setThumbnailBlob(null);
    setThumbnailDisplayUrl("");
    setSelectedFile(null);
    setRawImageSrc(null);
    setAdjustingThumbnail(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    setSubmitError("");
    if (!selectedFile) {
      setSubmitError("Please upload a photo.");
      return;
    }
    if (!thumbnailBlob) {
      setSubmitError("Please complete the square thumbnail crop.");
      return;
    }
    if (!title.trim()) {
      setSubmitError("Title is required.");
      return;
    }
    if (!onUpload) {
      return;
    }
    const safeTitle = sanitizeSingleLineText(
      title,
      TEXT_LIMITS.artworkTitle
    ).trim();
    const safeDescription = sanitizeMultilineText(
      description,
      TEXT_LIMITS.artworkDescription
    ).trim();
    const formData = new FormData();
    formData.append("image", selectedFile);
    formData.append(
      "thumbnailImage",
      thumbnailBlob,
      "thumbnail.jpg"
    );
    if (userId) formData.append("userId", userId);
    formData.append("title", safeTitle);
    if (safeDescription) formData.append("description", safeDescription);

    try {
      setSubmitting(true);
      await onUpload(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    revokeFullImageUrl();
    setThumbnailBlob(null);
    setThumbnailDisplayUrl("");
    setSelectedFile(null);
    setRawImageSrc(null);
    setAdjustingThumbnail(false);
    setSubmitError("");
    setTitle("");
    setDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canSubmit = Boolean(
    selectedFile && thumbnailBlob && title.trim().length > 0 && onUpload
  );

  return (
    <div className="upload-container">
      <h1 className="main-title">Upload Art</h1>

      <div
        className={`upload-file-box${artworkDisplayUrl ? " upload-file-box-has-image" : ""}`}
        onClick={handleBoxClick}
        role={artworkDisplayUrl ? undefined : "button"}
      >
        <input
          ref={fileInputRef}
          type="file"
          id="fileInput"
          accept={ACCEPT_IMAGES}
          onChange={handleFileChange}
          className="hidden-input"
        />
        {artworkDisplayUrl ? (
          <img
            src={artworkDisplayUrl}
            alt="Artwork preview"
            className="preview-image-full"
          />
        ) : (
          <div className="upload-icon">
            <span>Click here to upload</span>
          </div>
        )}
      </div>

      <div className="upload-below-box">
        {artworkDisplayUrl ? (
          <button
            type="button"
            className="reselect-photo-button"
            onClick={(e) => {
              e.stopPropagation();
              handleReselectPhoto();
            }}
          >
            Choose a different photo
          </button>
        ) : null}
        <p className="upload-file-hint">
          Photos only. Supported types include JPEG, PNG, GIF, WebP, BMP, SVG,
          and HEIC/HEIF where your browser allows. The preview shows your{" "}
          <strong>full image</strong>. After you pick a file, you&apos;ll crop a
          separate <strong>square thumbnail</strong> for the feed (ArtIcon). The
          original file is uploaded as the artwork.
        </p>
      </div>

      <div className="upload-thumbnail-section">
        <p className="upload-thumbnail-label">Feed thumbnail (square crop)</p>
        {thumbnailDisplayUrl ? (
          <div className="upload-thumb-preview-wrap">
            <img
              src={thumbnailDisplayUrl}
              alt="Thumbnail preview for feed"
              className="upload-thumbnail-img"
            />
          </div>
        ) : artworkDisplayUrl ? (
          <p className="upload-thumbnail-placeholder">
            Finish the crop dialog to see your thumbnail here.
          </p>
        ) : (
          <p className="upload-thumbnail-placeholder">
            Upload a photo and crop a square thumbnail to see it here.
          </p>
        )}
        {artworkDisplayUrl ? (
          <button
            type="button"
            className="change-thumbnail-button"
            onClick={handleChangeThumbnail}
          >
            {thumbnailDisplayUrl ? "Change thumbnail" : "Crop thumbnail"}
          </button>
        ) : null}
      </div>

      <div className="title-box">
        <label htmlFor="title" className="title-label">
          Title <span className="title-required" aria-hidden>*</span>
        </label>
        <input
          id="title"
          type="text"
          className="text-input"
          placeholder="Enter title"
          value={title}
          onChange={(e) => {
            setTitle(
              sanitizeSingleLineText(e.target.value, TEXT_LIMITS.artworkTitle)
            );
            setSubmitError("");
          }}
          maxLength={TEXT_LIMITS.artworkTitle}
          required
          aria-required="true"
        />
      </div>

      <div className="description-box">
        <label htmlFor="description" className="description-label">
          Description (optional)
        </label>
        <textarea
          id="description"
          className="textarea-input"
          placeholder="Enter description"
          value={description}
          onChange={(e) =>
            setDescription(
              sanitizeMultilineText(
                e.target.value,
                TEXT_LIMITS.artworkDescription
              )
            )
          }
          maxLength={TEXT_LIMITS.artworkDescription}
        />
      </div>

      {submitError ? (
        <p className="upload-submit-error" role="alert">
          {submitError}
        </p>
      ) : null}

      <div className="button-row">
        <button
          type="button"
          className="upload-button"
          disabled={!canSubmit || submitting}
          onClick={handleSubmit}
        >
          {submitting ? "Uploading..." : "Upload"}
        </button>
        <button
          type="button"
          className="cancel-button"
          onClick={handleCancel}
        >
          Cancel
        </button>
      </div>

      {rawImageSrc ? (
        <ImageCropModal
          imageSrc={rawImageSrc}
          aspect={THUMB_ASPECT}
          cropShape="rect"
          title={
            adjustingThumbnail
              ? "Adjust thumbnail (square crop)"
              : "Choose thumbnail (square crop)"
          }
          onApply={handleCropApply}
          onCancel={handleCropCancel}
        />
      ) : null}
    </div>
  );
}
