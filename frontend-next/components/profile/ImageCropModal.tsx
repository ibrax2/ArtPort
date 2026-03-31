"use client";

import { useCallback, useEffect, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import "react-easy-crop/react-easy-crop.css";

import { getCroppedImg } from "@/lib/cropImage";

import styles from "./ImageCropModal.module.css";

export type ImageCropModalProps = {
  imageSrc: string;
  aspect: number;
  cropShape: "rect" | "round";
  title: string;
  onApply: (dataUrl: string) => void;
  onCancel: () => void;
};

export default function ImageCropModal({
  imageSrc,
  aspect,
  cropShape,
  title,
  onApply,
  onCancel,
}: ImageCropModalProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [applying, setApplying] = useState(false);

  useEffect(() => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
  }, [imageSrc]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const onCropComplete = useCallback(
    (_croppedArea: Area, croppedPixels: Area) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const handleApply = async () => {
    if (!croppedAreaPixels) return;
    setApplying(true);
    try {
      const dataUrl = await getCroppedImg(imageSrc, croppedAreaPixels);
      onApply(dataUrl);
    } finally {
      setApplying(false);
    }
  };

  return (
    <div
      className={styles.backdrop}
      role="presentation"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onCancel();
      }}
    >
      <div
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="crop-modal-title"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 id="crop-modal-title" className={styles.title}>
          {title}
        </h2>
        <p className={styles.hint}>
          Drag to reposition. Use the slider to zoom in or out.
        </p>

        <div className={styles.cropWrap}>
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className={styles.zoomRow}>
          <span className={styles.zoomLabel}>Zoom</span>
          <input
            className={styles.zoomRange}
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            aria-label="Zoom"
          />
        </div>

        <div className={styles.actions}>
          <button type="button" className={styles.btnSecondary} onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={handleApply}
            disabled={applying || !croppedAreaPixels}
          >
            {applying ? "Saving…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
