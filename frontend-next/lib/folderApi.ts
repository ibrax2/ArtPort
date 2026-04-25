import { apiFetch } from "@/lib/apiClient";

export type FolderTreeNode = {
  _id: string;
  folderName: string;
  isPublic: boolean;
  artworks: Array<{ _id?: string; title?: string; isPublic?: boolean }>;
  subfolders: FolderTreeNode[];
};

export type FolderSummaryItem = {
  _id: string;
  folderName: string;
  isPublic: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type FolderContentsResponse = {
  folder: {
    _id: string;
    folderName: string;
    isPublic: boolean;
    parentFolderId?: string | null;
    artworkIds?: string[];
  };
  subfolders: FolderSummaryItem[];
  artworks: Array<{
    _id?: string;
    title?: string;
    filePath?: string;
    thumbnailPath?: string;
    imageUrl?: string;
    isPublic?: boolean;
    userId?: string | { _id?: string; username?: string; profilePictureUrl?: string };
  }>;
};

type ApiErrorPayload = {
  code?: string;
  message?: string;
};

async function parseApiError(response: Response, fallback: string): Promise<string> {
  const data = (await response.json().catch(() => ({}))) as ApiErrorPayload;
  return data.message || fallback;
}

export async function fetchUserFolderTree(userId: string): Promise<FolderTreeNode | null> {
  const res = await apiFetch(`/api/users/${encodeURIComponent(userId)}/folder-tree`, {
    auth: true,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load folder tree"));
  }

  const data = (await res.json().catch(() => null)) as FolderTreeNode | null;
  return data;
}

export async function fetchFolderContents(folderId: string): Promise<FolderContentsResponse> {
  const res = await apiFetch(`/api/folders/${encodeURIComponent(folderId)}/contents`, {
    auth: true,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to load folder contents"));
  }

  return (await res.json()) as FolderContentsResponse;
}

export async function createFolder(input: {
  folderName: string;
  parentFolderId?: string | null;
  isPublic: boolean;
}): Promise<void> {
  const res = await apiFetch("/api/folders", {
    method: "POST",
    auth: true,
    body: JSON.stringify({
      folderName: input.folderName,
      parentFolderId: input.parentFolderId ?? null,
      isPublic: input.isPublic,
    }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to create folder"));
  }
}

export async function renameFolder(folderId: string, folderName: string): Promise<void> {
  const res = await apiFetch(`/api/folders/${encodeURIComponent(folderId)}`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ folderName }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to rename folder"));
  }
}

export async function deleteFolder(folderId: string, deleteContents?: boolean, moveContentsUp?: boolean): Promise<void> {
  const res = await apiFetch(`/api/folders/${encodeURIComponent(folderId)}`, {
    method: "DELETE",
    auth: true,
    body: JSON.stringify({ deleteContents, moveContentsUp }),
  });

  if (!res.ok) {
    const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
    // If folder has content, include that info in the error
    if (res.status === 409 && data.requiresChoice) {
      interface FolderDeleteError extends Error {
        requiresChoice?: boolean;
        hasContent?: boolean;
        subfolderCount?: number;
        artworkCount?: number;
      }
      const error = new Error(data.message as string || "Folder contains content. Specify how to handle it.") as FolderDeleteError;
      error.requiresChoice = true;
      error.hasContent = data.hasContent as boolean;
      error.subfolderCount = data.subfolderCount as number;
      error.artworkCount = data.artworkCount as number;
      throw error;
    }
    throw new Error(await parseApiError(res, "Failed to delete folder"));
  }
}

export async function removeArtworkFromBookmarks(artworkId: string): Promise<void> {
  const res = await apiFetch(`/api/artworks/${encodeURIComponent(artworkId)}/unbookmark`, {
    method: "POST",
    auth: true,
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to remove from bookmarks"));
  }
}

export async function updateFolderPrivacy(folderId: string, isPublic: boolean): Promise<void> {
  const res = await apiFetch(`/api/folders/${encodeURIComponent(folderId)}/privacy`, {
    method: "PATCH",
    auth: true,
    body: JSON.stringify({ isPublic }),
  });

  if (!res.ok) {
    throw new Error(await parseApiError(res, "Failed to update folder privacy"));
  }
}
