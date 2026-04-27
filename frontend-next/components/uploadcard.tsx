"use client";
/* eslint-disable @next/next/no-img-element */

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

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB — must match server/src/middleware/upload.js

const THUMB_ASPECT = 1;

export type UploadCardProps = {
  onUpload?: (formData: FormData) => Promise<void> | void;
  userId?: string;
  folderOptions?: Array<{
    id: string;
    label: string;
    isPublic: boolean;
  }>;
};

export default function UploadCardExact({ onUpload, userId, folderOptions = [] }: UploadCardProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [artworkDisplayUrl, setArtworkDisplayUrl] = useState("");
  const [thumbnailBlob, setThumbnailBlob] = useState<Blob | null>(null);
  const [thumbnailDisplayUrl, setThumbnailDisplayUrl] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
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
    if (!file.type || !file.type.startsWith("image/")) {
      setSubmitError("Please only upload image files.");
      e.target.value = "";
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setSubmitError("Image is too large. Maximum size is 5 MB.");
      e.target.value = "";
      return;
    }

    revokeFullImageUrl();
    setThumbnailBlob(null);
    setThumbnailDisplayUrl("");
    setSubmitError("");

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
    if (!selectedFolderId) {
      setSubmitError("Choose a destination folder.");
      return;
    }

    if (!onUpload) {
      return;
    }
    if (!userId) {
      setSubmitError("Your account is still loading. Wait a moment and try again.");
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
    formData.append("folderId", selectedFolderId);
    formData.append("title", safeTitle);
    if (safeDescription) formData.append("description", safeDescription);

    try {
      setSubmitting(true);
      await onUpload(formData);
    } catch (err) {
      setSubmitError(
        err instanceof Error ? err.message : "Upload failed. Please try again."
      );
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
    setSelectedFolderId("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const canSubmit = Boolean(
    selectedFile &&
      thumbnailBlob &&
      selectedFolderId &&
      title.trim().length > 0 &&
      onUpload &&
      userId
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
        <label htmlFor="folderSelect" className="description-label">
          Folder <span className="title-required" aria-hidden>*</span>
        </label>
        <select
          id="folderSelect"
          className="text-input"
          value={selectedFolderId}
          onChange={(e) => {
            setSelectedFolderId(e.target.value);
            setSubmitError("");
          }}
          required
        >
          <option value="">Select a folder</option>
          {folderOptions.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.label}{folder.isPublic ? "" : " (private)"}
            </option>
          ))}
        </select>
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
        <div
          className="upload-error-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Upload error"
          onClick={() => setSubmitError("")}
        >
          <div
            className="upload-error-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <p className="upload-error-modal-text">{submitError}</p>
            <button
              type="button"
              className="upload-error-dismiss"
              onClick={() => setSubmitError("")}
            >
              OK
            </button>
          </div>
        </div>
      ) : null}

      {onUpload && !userId ? (
        <p className="upload-account-wait" role="status">
          Loading your account before upload…
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
