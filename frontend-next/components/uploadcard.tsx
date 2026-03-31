"use client";

import React, { useRef, useState } from "react";

const ACCEPT_IMAGES =
  "image/jpeg,image/png,image/gif,image/webp,image/bmp,image/svg+xml,image/heic,image/heif";

export type UploadCardProps = {
  onUpload?: (formData: FormData) => Promise<void> | void;
  userId?: string;
};

export default function UploadCardExact({ onUpload, userId }: UploadCardProps) {
  const [preview, setPreview] = useState<string>("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const previewUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const revokePreview = () => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);

      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);

        const canvas = document.createElement("canvas");
        const maxWidth = 777;
        const maxHeight = 856;
        let { width, height } = img;

        if (width > maxWidth || height > maxHeight) {
          const scale = Math.min(maxWidth / width, maxHeight / height);
          width *= scale;
          height *= scale;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob((blob) => {
          if (!blob) return;
          revokePreview();
          const nextUrl = URL.createObjectURL(blob);
          previewUrlRef.current = nextUrl;
          setPreview(nextUrl);
        }, file.type);
      };
    }
  };

  const handleBoxClick = () => {
    fileInputRef.current?.click();
  };

  const handleReselectPhoto = () => {
    revokePreview();
    setPreview("");
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile || !onUpload) {
      return;
    }
    const formData = new FormData();
    formData.append("artworkImage", selectedFile);
    if (userId) formData.append("userId", userId);
    if (title.trim()) formData.append("title", title.trim());
    if (description.trim()) formData.append("description", description.trim());

    try {
      setSubmitting(true);
      await onUpload(formData);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => {
    revokePreview();
    setPreview("");
    setSelectedFile(null);
    setTitle("");
    setDescription("");
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="upload-container">
      <h1 className="main-title">Upload Art</h1>

      <div className="upload-file-box" onClick={handleBoxClick}>
        <input
          ref={fileInputRef}
          type="file"
          id="fileInput"
          accept={ACCEPT_IMAGES}
          onChange={handleFileChange}
          className="hidden-input"
        />
        {preview ? (
          <img src={preview} alt="Preview" className="preview-image" />
        ) : (
          <div className="upload-icon">
            <span>Click here to upload</span>
          </div>
        )}
      </div>

      <div className="upload-below-box">
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
        <p className="upload-file-hint">
          Photos only. Supported types include JPEG, PNG, GIF, WebP, BMP, SVG,
          and HEIC/HEIF where your browser allows. Other file types cannot be
          used here.
        </p>
      </div>

      <div className="title-box">
        <label htmlFor="title" className="title-label">
          Title
        </label>
        <input
          id="title"
          type="text"
          className="text-input"
          placeholder="Enter title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
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
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div className="button-row">
        <button
          type="button"
          className="upload-button"
          disabled={!selectedFile || submitting}
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
    </div>
  );
}
