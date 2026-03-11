"use client";
import React, { useState } from "react";
import styles from "./uploadcard.module.css";

export default function UploadCardExact() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string>("");

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];

      const img = new Image();
      img.src = URL.createObjectURL(selectedFile);
      img.onload = () => {
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
          if (blob) setPreview(URL.createObjectURL(blob));
        }, selectedFile.type);
      };

      setFile(selectedFile);
    }
  };

  const handleBoxClick = () => {
    const input = document.getElementById("fileInput");
    input?.click();
  };

  return (
    <div className={styles.uploadContainer}>
      <h1 className={styles.mainTitle}>Upload Art</h1>

      {/* Upload Box */}
      <div className={styles.uploadFileBox} onClick={handleBoxClick}>
        <input
          type="file"
          id="fileInput"
          accept="image/*"
          onChange={handleFileChange}
          className={styles.hiddenInput}
        />
        {preview ? (
          <img src={preview} alt="Preview" className={styles.previewImage} />
        ) : (
          <div className={styles.uploadIcon}>
            <span>Click here to upload</span>
          </div>
        )}
      </div>

      {/* Title Box */}
      <div className={styles.titleBox}>
        <label htmlFor="title" className={styles.titleLabel}>
          Title
        </label>
        <input
          id="title"
          type="text"
          className={styles.textInput}
          placeholder="Enter title"
        />
      </div>

      {/* Description Box */}
      <div className={styles.descriptionBox}>
        <label htmlFor="description" className={styles.descriptionLabel}>
          Description (optional)
        </label>
        <textarea
          id="description"
          className={styles.textareaInput}
          placeholder="Enter description"
        />
      </div>

      {/* Buttons */}
      <div className={styles.buttonRow}>
        <button className={styles.uploadButton}>Upload</button>
        <button className={styles.cancelButton}>Cancel</button>
      </div>
    </div>
  );
}