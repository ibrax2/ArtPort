"use client";
/* eslint-disable @next/next/no-img-element */

/**
 * Profile header, avatar/banner crop, posts grid. Cropped images are passed as Blob to optional callbacks.
 * Backend wiring: see docs/BACKEND_INTEGRATION.md (pass `onAvatarImageChange` / `onBannerImageChange` from /me page).
 */
import { useCallback, useRef, useState } from "react";

import ImageCropModal from "@/components/profile/ImageCropModal";
import Folder from "@/components/folder";
import ProfilePostsGrid, {
  type ProfilePostItem,
} from "@/components/ProfilePostsGrid";
import { publicAsset } from "@/lib/paths";

import "./profilecard.css";

export type { ProfilePostItem };

export type ProfileCardProps = {
  username: string;
  bio?: string;
  avatarSrc?: string;
  bannerSrc?: string;
  followers?: number;
  following?: number;
  posts?: number;
  userPosts?: ProfilePostItem[];
  isEditable?: boolean;
  onAvatarImageChange?: (blob: Blob) => Promise<void> | void;
  onBannerImageChange?: (blob: Blob) => Promise<void> | void;
};

const DEFAULT_AVATAR = publicAsset("/avatar-default.svg");
const BANNER_ASPECT = 935 / 323;

function dataUrlToBlob(dataUrl: string): Blob | null {
  const parts = dataUrl.split(",");
  if (parts.length !== 2) return null;
  const match = parts[0].match(/data:(.*);base64/);
  const mime = match?.[1] ?? "image/jpeg";
  try {
    const binary = atob(parts[1]);
    const len = binary.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: mime });
  } catch {
    return null;
  }
}

export default function ProfileCard({
  username,
  bio = "",
  avatarSrc: avatarSrcProp,
  bannerSrc: bannerSrcProp,
  followers = 0,
  following = 0,
  posts = 0,
  userPosts = [],
  isEditable = false,
  onAvatarImageChange,
  onBannerImageChange,
}: ProfileCardProps) {
  const [avatarSrc, setAvatarSrc] = useState(avatarSrcProp ?? DEFAULT_AVATAR);
  const [openFolder, setOpenFolder] = useState<string | null>(null);
  const [bannerSrc, setBannerSrc] = useState<string | null>(bannerSrcProp ?? null);
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<"avatar" | "banner" | null>(null);
  const [pendingTarget, setPendingTarget] = useState<"avatar" | "banner" | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "collections">("posts");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderVisibility, setNewFolderVisibility] = useState<"public" | "private">("public");

  const endCropSession = useCallback(() => {
    setRawImageSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return null;
    });
    setCropMode(null);
  }, []);

  const triggerPick = (target: "avatar" | "banner") => {
    setPendingTarget(target);
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !pendingTarget) return;
    const url = URL.createObjectURL(file);
    setRawImageSrc(url);
    setCropMode(pendingTarget);
    setPendingTarget(null);
    e.target.value = "";
  };

  const applyCrop = (dataUrl: string) => {
    const blob = dataUrlToBlob(dataUrl);

    if (cropMode === "avatar") {
      setAvatarSrc(dataUrl);
      if (blob && onAvatarImageChange) {
        Promise.resolve(onAvatarImageChange(blob)).catch(() => { });
      }
    } else if (cropMode === "banner") {
      setBannerSrc(dataUrl);
      if (blob && onBannerImageChange) {
        Promise.resolve(onBannerImageChange(blob)).catch(() => { });
      }
    }
    endCropSession();
  };

  return (
    <article className="entire_container">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="profile_hidden_file_input"
        onChange={onFileChange}
        tabIndex={-1}
        aria-hidden
      />

      <div className="banner_container">
        {bannerSrc ? (
          <img src={bannerSrc} alt="" className="banner_image" />
        ) : null}
        {isEditable && (
          <button
            type="button"
            className="edit_banner_btn"
            onClick={() => triggerPick("banner")}
            aria-label="Change banner image"
          >
            Edit banner
          </button>
        )}
      </div>

      <div className="profile_header_row">
        <div className="profile_picture_container">
          <img
            src={avatarSrc}
            alt={`${username} profile photo`}
            width={200}
            height={200}
            className="profile_pfp_image"
          />
          {isEditable && (
            <button
              type="button"
              className="edit_avatar_btn"
              onClick={() => triggerPick("avatar")}
              aria-label="Change profile photo"
            >
              Edit
            </button>
          )}
        </div>

        <div className="profile_text_block">
          <h1 className="profile_username">{username}</h1>
          {bio ? (
            <p className="profile_user_bio">{bio}</p>
          ) : (
            <p className="profile_user_bio muted">No bio yet.</p>
          )}
        </div>

        <div className="profile_stats_col">
          <p className="stats_individual">{followers} followers</p>
          <p className="stats_individual">{following} following</p>
          <p className="stats_individual">{posts} posts</p>
        </div>
      </div>

      <div className="separation">
        {/* Tab Bar */}
        <div className="tab_bar">
          <button
            className={`tab_btn ${activeTab === "posts" ? "tab_btn_active" : ""}`}
            onClick={() => setActiveTab("posts")}
          >
            Posts
          </button>
          <button
            className={`tab_btn ${activeTab === "collections" ? "tab_btn_active" : ""}`}
            onClick={() => setActiveTab("collections")}
          >
            Collections
          </button>
          {activeTab === "collections" && !openFolder && (
            <button
              className="add_folder_btn"
              type="button"
              aria-label="Add folder"
              onClick={() => setShowAddFolder(true)}
            >
              +
            </button>
          )}
        </div>

        {/* Tab Content */}
        <div className="tab_content">
          {activeTab === "posts" ? (
            <ProfilePostsGrid posts={userPosts} username={username} />
          ) : openFolder ? (
            <div className="folder_contents">
              <button
                className="folder_back_btn"
                onClick={() => setOpenFolder(null)}
                type="button"
              >
                ← Back to Collections
              </button>
              <h3 className="folder_contents_title">{openFolder}</h3>
              <p className="folder_contents_empty">This folder is empty.</p>
            </div>
          ) : (
            <div className="folder_row">
              <Folder label="Portfolio" onClick={() => setOpenFolder("Portfolio")} />
              <Folder label="Archive" onClick={() => setOpenFolder("Archive")} />
            </div>
          )}
        </div>
      </div>

      {rawImageSrc && cropMode ? (
        <ImageCropModal
          imageSrc={rawImageSrc}
          aspect={cropMode === "banner" ? BANNER_ASPECT : 1}
          cropShape={cropMode === "avatar" ? "round" : "rect"}
          title={cropMode === "banner" ? "Adjust banner" : "Adjust profile photo"}
          onApply={applyCrop}
          onCancel={endCropSession}
        />
      ) : null}
      {showAddFolder && (
        <div className="modal_overlay" onClick={() => setShowAddFolder(false)}>
          <div className="modal_box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal_title">New Folder</h3>

            <label className="modal_label" htmlFor="folder_name_input">
              Folder name
            </label>
            <input
              id="folder_name_input"
              className="modal_input"
              type="text"
              placeholder="e.g. Sketchbook"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              autoFocus
            />

            <div className="modal_radio_group">
              <label className="modal_radio_label">
                <input
                  type="radio"
                  name="folder_visibility"
                  value="public"
                  checked={newFolderVisibility === "public"}
                  onChange={() => setNewFolderVisibility("public")}
                />
                Public
              </label>
              <label className="modal_radio_label">
                <input
                  type="radio"
                  name="folder_visibility"
                  value="private"
                  checked={newFolderVisibility === "private"}
                  onChange={() => setNewFolderVisibility("private")}
                />
                Private
              </label>
            </div>

            <div className="modal_actions">
              <button
                className="modal_cancel_btn"
                type="button"
                onClick={() => {
                  setShowAddFolder(false);
                  setNewFolderName("");
                  setNewFolderVisibility("public");
                }}
              >
                Cancel
              </button>
              <button
                className="modal_add_btn"
                type="button"
                disabled={!newFolderName.trim()}
                onClick={() => {
                  // TODO: wire up to backend
                  setShowAddFolder(false);
                  setNewFolderName("");
                  setNewFolderVisibility("public");
                }}
              >
                Add
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  );
}