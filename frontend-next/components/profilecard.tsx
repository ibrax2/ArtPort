"use client";
/* eslint-disable @next/next/no-img-element */

import { useCallback, useEffect, useRef, useState } from "react";

import ImageCropModal from "@/components/profile/ImageCropModal";
import Folder from "@/components/folder";
import ProfilePostsGrid, {
  type ProfilePostItem,
} from "@/components/ProfilePostsGrid";
import { publicAsset } from "@/lib/paths";
import {
  sanitizeMultilineText,
  sanitizeSingleLineText,
} from "@/lib/textInput";

import "./profilecard.css";

export type { ProfilePostItem };

export type ProfileCardProps = {
  username: string;
  bio?: string;
  contactEmail?: string;
  avatarSrc?: string;
  bannerSrc?: string;
  followers?: number;
  following?: number;
  posts?: number;
  userPosts?: ProfilePostItem[];
  isEditable?: boolean;
  onAvatarImageChange?: (blob: Blob) => Promise<void> | void;
  onBannerImageChange?: (blob: Blob) => Promise<void> | void;
  onBioSave?: (bio: string) => Promise<void> | void;
  rootFolderId?: string;
  collectionFolders?: Array<{
    id: string;
    label: string;
    isPublic: boolean;
  }>;
  collectionsLoading?: boolean;
  collectionsError?: string;
  onLoadFolderContents?: (folderId: string) => Promise<{
    id: string;
    label: string;
    isPublic: boolean;
    subfolders: Array<{ id: string; label: string; isPublic: boolean }>;
    artworks: ProfilePostItem[];
  }>;
  onCreateFolder?: (
    folderName: string,
    isPublic: boolean,
    parentFolderId?: string,
  ) => Promise<void> | void;
  onRenameFolder?: (folderId: string, folderName: string) => Promise<void> | void;
  onDeleteFolder?: (folderId: string, deleteContents?: boolean, moveContentsUp?: boolean) => Promise<void> | void;
  onUpdateFolderPrivacy?: (folderId: string, isPublic: boolean) => Promise<void> | void;
};

const DEFAULT_AVATAR = publicAsset("/avatar-default.svg");
const BANNER_ASPECT = 935 / 323;

function normalizeOptionalImageSrc(value?: string | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

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
  contactEmail,
  avatarSrc: avatarSrcProp,
  bannerSrc: bannerSrcProp,
  followers = 0,
  following = 0,
  posts = 0,
  userPosts = [],
  isEditable = false,
  onAvatarImageChange,
  onBannerImageChange,
  onBioSave,
  rootFolderId,
  collectionFolders = [],
  collectionsLoading = false,
  collectionsError = "",
  onLoadFolderContents,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  onUpdateFolderPrivacy,
}: ProfileCardProps) {
  const [avatarSrc, setAvatarSrc] = useState(
    normalizeOptionalImageSrc(avatarSrcProp) ?? DEFAULT_AVATAR,
  );
  const [openFolder, setOpenFolder] = useState<{
    id: string;
    label: string;
    isPublic: boolean;
    subfolders: Array<{ id: string; label: string; isPublic: boolean }>;
    artworks: ProfilePostItem[];
  } | null>(null);
  const [bannerSrc, setBannerSrc] = useState<string | null>(
    normalizeOptionalImageSrc(bannerSrcProp),
  );
  const [rawImageSrc, setRawImageSrc] = useState<string | null>(null);
  const [cropMode, setCropMode] = useState<"avatar" | "banner" | null>(null);
  const [pendingTarget, setPendingTarget] = useState<"avatar" | "banner" | null>(null);
  const [activeTab, setActiveTab] = useState<"posts" | "collections">("posts");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showAddFolder, setShowAddFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderVisibility, setNewFolderVisibility] = useState<"public" | "private">("public");
  const [folderError, setFolderError] = useState("");
  const [folderBusy, setFolderBusy] = useState(false);
  const [deleteConfirmationDialog, setDeleteConfirmationDialog] = useState<{
    folderId: string;
    folderName: string;
    hasContent: boolean;
    subfolderCount: number;
    artworkCount: number;
  } | null>(null);

  const [bioDraft, setBioDraft] = useState(bio);
  const [editingBio, setEditingBio] = useState(false);
  const [bioSaving, setBioSaving] = useState(false);
  const [bioError, setBioError] = useState("");

  useEffect(() => {
    if (!editingBio) {
      setBioDraft(bio);
    }
  }, [bio, editingBio]);

  useEffect(() => {
    setAvatarSrc(normalizeOptionalImageSrc(avatarSrcProp) ?? DEFAULT_AVATAR);
  }, [avatarSrcProp]);

  useEffect(() => {
    setBannerSrc(normalizeOptionalImageSrc(bannerSrcProp));
  }, [bannerSrcProp]);

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

  const handleBioSave = async () => {
    if (!onBioSave) return;

    setBioError("");
    setBioSaving(true);
    try {
      await Promise.resolve(onBioSave(bioDraft.trim()));
      setEditingBio(false);
    } catch (e: unknown) {
      setBioError(e instanceof Error ? e.message : "Could not save bio");
    } finally {
      setBioSaving(false);
    }
  };

  const openFolderById = useCallback(
    async (folderId: string, fallbackLabel?: string) => {
      if (!onLoadFolderContents) {
        setOpenFolder({
          id: folderId,
          label: fallbackLabel || "Folder",
          isPublic: true,
          subfolders: [],
          artworks: [],
        });
        return;
      }

      setFolderError("");
      setFolderBusy(true);
      try {
        const data = await onLoadFolderContents(folderId);
        setOpenFolder(data);
      } catch (error: unknown) {
        setFolderError(
          error instanceof Error
            ? error.message
            : "Could not load folder contents",
        );
      } finally {
        setFolderBusy(false);
      }
    },
    [onLoadFolderContents],
  );

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
          {onBioSave && isEditable ? (
            <div className="profile_bio_edit_wrap">
              {editingBio ? (
                <>
                  <textarea
                    className="profile_bio_textarea"
                    value={bioDraft}
                    onChange={(e) =>
                      setBioDraft(
                        sanitizeMultilineText(e.target.value, 500)
                      )
                    }
                    maxLength={500}
                    rows={4}
                    placeholder="Tell visitors about your work…"
                    aria-label="Bio"
                  />
                  <div className="profile_bio_actions">
                    <button
                      type="button"
                      className="profile_bio_save_btn"
                      onClick={() => void handleBioSave()}
                      disabled={bioSaving}
                    >
                      {bioSaving ? "Saving…" : "Save bio"}
                    </button>
                    <button
                      type="button"
                      className="profile_bio_cancel_btn"
                      onClick={() => {
                        setEditingBio(false);
                        setBioDraft(bio);
                        setBioError("");
                      }}
                      disabled={bioSaving}
                    >
                      Cancel
                    </button>
                  </div>
                  {bioError ? (
                    <p className="profile_bio_error" role="alert">
                      {bioError}
                    </p>
                  ) : null}
                </>
              ) : (
                <>
                  {bio ? (
                    <p className="profile_user_bio">{bio}</p>
                  ) : (
                    <p className="profile_user_bio muted">No bio yet.</p>
                  )}
                  <button
                    type="button"
                    className="profile_bio_edit_btn"
                    onClick={() => setEditingBio(true)}
                  >
                    Edit bio
                  </button>
                </>
              )}
            </div>
          ) : bio ? (
            <p className="profile_user_bio">{bio}</p>
          ) : (
            <p className="profile_user_bio muted">No bio yet.</p>
          )}
          {contactEmail ? (
            <p className="profile_contact_email">{contactEmail}</p>
          ) : null}
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
          {isEditable && activeTab === "collections" && (
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
                onClick={() => {
                  setOpenFolder(null);
                  setFolderError("");
                }}
                type="button"
              >
                ← Back to Collections
              </button>

              <h3 className="folder_contents_title">{openFolder.label}</h3>
              <p className="profile_user_bio muted">
                Visibility: {openFolder.isPublic ? "Public" : "Private"}
              </p>

              {isEditable && onRenameFolder ? (
                <button
                  className="profile_bio_edit_btn"
                  type="button"
                  onClick={async () => {
                    const nextName = window.prompt(
                      "Rename folder",
                      openFolder.label,
                    );
                    const sanitized = sanitizeSingleLineText(
                      nextName ?? "",
                      100,
                    ).trim();
                    if (!sanitized) return;
                    setFolderBusy(true);
                    try {
                      await Promise.resolve(onRenameFolder(openFolder.id, sanitized));
                      await openFolderById(openFolder.id, sanitized);
                    } catch (error: unknown) {
                      setFolderError(
                        error instanceof Error
                          ? error.message
                          : "Could not rename folder",
                      );
                    } finally {
                      setFolderBusy(false);
                    }
                  }}
                  disabled={folderBusy}
                >
                  Rename folder
                </button>
              ) : null}

              {isEditable && onUpdateFolderPrivacy ? (
                <button
                  className="profile_bio_edit_btn"
                  type="button"
                  onClick={async () => {
                    setFolderBusy(true);
                    try {
                      await Promise.resolve(
                        onUpdateFolderPrivacy(openFolder.id, !openFolder.isPublic),
                      );
                      await openFolderById(openFolder.id, openFolder.label);
                    } catch (error: unknown) {
                      setFolderError(
                        error instanceof Error
                          ? error.message
                          : "Could not update folder privacy",
                      );
                    } finally {
                      setFolderBusy(false);
                    }
                  }}
                  disabled={folderBusy}
                >
                  Make {openFolder.isPublic ? "Private" : "Public"}
                </button>
              ) : null}

              {isEditable && onDeleteFolder ? (
                <button
                  className="profile_bio_cancel_btn"
                  type="button"
                  onClick={async () => {
                    setFolderError("");
                    setFolderBusy(true);
                    try {
                      // Try to delete with no content handling specified
                      // If folder has content, it will return a 409 error
                      await Promise.resolve(
                        onDeleteFolder(openFolder.id, undefined)
                      );
                      setOpenFolder(null);
                    } catch (error: unknown) {
                      // Check if this is a "folder has content" error
                      interface FolderDeleteError extends Error {
                        requiresChoice?: boolean;
                        hasContent?: boolean;
                        subfolderCount?: number;
                        artworkCount?: number;
                      }
                      const typedError = error as FolderDeleteError;
                      const isContentError =
                        error instanceof Error &&
                        typedError.requiresChoice === true;

                      if (isContentError) {
                        // Show the confirmation dialog
                        setDeleteConfirmationDialog({
                          folderId: openFolder.id,
                          folderName: openFolder.label,
                          hasContent: typedError.hasContent || false,
                          subfolderCount: typedError.subfolderCount || 0,
                          artworkCount: typedError.artworkCount || 0,
                        });
                      } else {
                        setFolderError(
                          error instanceof Error
                            ? error.message
                            : "Could not delete folder",
                        );
                      }
                    } finally {
                      setFolderBusy(false);
                    }
                  }}
                  disabled={folderBusy}
                >
                  Delete folder
                </button>
              ) : null}

              {folderError ? <p className="modal_error">{folderError}</p> : null}

              {openFolder.subfolders.length > 0 ? (
                <div className="folder_row">
                  {openFolder.subfolders.map((folder) => (
                    <Folder
                      key={folder.id}
                      label={folder.label}
                      onClick={() => {
                        void openFolderById(folder.id, folder.label);
                      }}
                    />
                  ))}
                </div>
              ) : null}

              {openFolder.artworks.length > 0 ? (
                <ProfilePostsGrid posts={openFolder.artworks} username={username} />
              ) : (
                <p className="folder_contents_empty">This folder is empty.</p>
              )}
            </div>
          ) : (
            <>
              {collectionsError ? <p className="modal_error">{collectionsError}</p> : null}
              {collectionsLoading ? (
                <p className="folder_contents_empty">Loading folders…</p>
              ) : collectionFolders.length > 0 ? (
                <div className="folder_row">
                  {collectionFolders.map((folder) => (
                    <Folder
                      key={folder.id}
                      label={folder.label}
                      onClick={() => {
                        void openFolderById(folder.id, folder.label);
                      }}
                    />
                  ))}
                </div>
              ) : (
                <p className="folder_contents_empty">No folders yet.</p>
              )}
            </>
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
              onChange={(e) => {
                setNewFolderName(
                  sanitizeSingleLineText(e.target.value, 100)
                );
                setFolderError("");
              }}
              autoFocus
            />
            {folderError ? (
              <p className="modal_error" role="alert">
                {folderError}
              </p>
            ) : null}

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
                  setFolderError("");
                }}
              >
                Cancel
              </button>
              <button
                className="modal_add_btn"
                type="button"
                disabled={!newFolderName.trim()}
                onClick={async () => {
                  const trimmed = newFolderName.trim();
                  if (!trimmed) {
                    setFolderError("Folder name is required");
                    return;
                  }

                  if (!onCreateFolder) {
                    setShowAddFolder(false);
                    setNewFolderName("");
                    setNewFolderVisibility("public");
                    setFolderError("");
                    return;
                  }

                  setFolderBusy(true);
                  setFolderError("");
                  try {
                    await Promise.resolve(
                      onCreateFolder(
                        trimmed,
                        newFolderVisibility === "public",
                        openFolder?.id || rootFolderId,
                      ),
                    );
                    if (openFolder) {
                      await openFolderById(openFolder.id, openFolder.label);
                    }
                    setShowAddFolder(false);
                    setNewFolderName("");
                    setNewFolderVisibility("public");
                  } catch (error: unknown) {
                    setFolderError(
                      error instanceof Error
                        ? error.message
                        : "Could not create folder",
                    );
                  } finally {
                    setFolderBusy(false);
                  }
                }}
              >
                {folderBusy ? "Adding…" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}
      {deleteConfirmationDialog && (
        <div className="modal_overlay" onClick={() => setDeleteConfirmationDialog(null)}>
          <div className="modal_box" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal_title">Delete Folder</h3>
            <p style={{ marginBottom: "16px" }}>
              The folder &ldquo;{deleteConfirmationDialog.folderName}&rdquo; contains {deleteConfirmationDialog.artworkCount} artwork
              {deleteConfirmationDialog.artworkCount !== 1 ? "s" : ""} 
              {deleteConfirmationDialog.subfolderCount > 0 && deleteConfirmationDialog.artworkCount > 0 ? " and " : ""}
              {deleteConfirmationDialog.subfolderCount > 0 && (
                <>
                  {deleteConfirmationDialog.subfolderCount} subfolder
                  {deleteConfirmationDialog.subfolderCount !== 1 ? "s" : ""}
                </>
              )}.
            </p>
            <p style={{ marginBottom: "16px", fontSize: "14px", color: "#666" }}>
              What would you like to do?
            </p>
            <div className="modal_actions" style={{ flexDirection: "column", gap: "8px" }}>
              <button
                className="modal_add_btn"
                type="button"
                disabled={folderBusy || !onDeleteFolder}
                onClick={async () => {
                  if (!onDeleteFolder) return;
                  setFolderError("");
                  setFolderBusy(true);
                  try {
                    await Promise.resolve(
                      onDeleteFolder(deleteConfirmationDialog.folderId, true)
                    );
                    setOpenFolder(null);
                    setDeleteConfirmationDialog(null);
                  } catch (error: unknown) {
                    setFolderError(
                      error instanceof Error
                        ? error.message
                        : "Could not delete folder",
                    );
                  } finally {
                    setFolderBusy(false);
                  }
                }}
              >
                {folderBusy ? "Deleting…" : "Delete Folder & All Contents"}
              </button>
              <button
                className="modal_cancel_btn"
                type="button"
                disabled={folderBusy || !onDeleteFolder}
                onClick={async () => {
                  if (!onDeleteFolder) return;
                  setFolderError("");
                  setFolderBusy(true);
                  try {
                    await Promise.resolve(
                      onDeleteFolder(deleteConfirmationDialog.folderId, false, true)
                    );
                    setOpenFolder(null);
                    setDeleteConfirmationDialog(null);
                  } catch (error: unknown) {
                    setFolderError(
                      error instanceof Error
                        ? error.message
                        : "Could not delete folder",
                    );
                  } finally {
                    setFolderBusy(false);
                  }
                }}
                style={{ backgroundColor: "#f0f0f0", color: "#333" }}
              >
                {folderBusy ? "Moving…" : "Move Contents Up & Delete Folder"}
              </button>
              <button
                className="modal_cancel_btn"
                type="button"
                disabled={folderBusy}
                onClick={() => setDeleteConfirmationDialog(null)}
                style={{ backgroundColor: "#f5f5f5", color: "#666" }}
              >
                Cancel
              </button>
            </div>
            {folderError ? (
              <p className="modal_error" role="alert" style={{ marginTop: "16px" }}>
                {folderError}
              </p>
            ) : null}
          </div>
        </div>
      )}
    </article>
  );
}