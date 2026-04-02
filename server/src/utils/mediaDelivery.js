import { getSignedUrl } from "@aws-sdk/cloudfront-signer";

const DEFAULT_TTL_SECONDS = 60 * 60;

function normalizeCloudFrontBaseUrl() {
  const raw = (process.env.CLOUDFRONT_URL || "").trim();
  if (!raw) return "";

  const host = raw.replace(/^https?:\/\//i, "").replace(/\/+$/, "");
  return host ? `https://${host}` : "";
}

function normalizePrivateKey() {
  const raw = (process.env.CF_PRIVATE_KEY || "").trim();
  if (!raw) return "";

  const unwrapped =
    (raw.startsWith('"') && raw.endsWith('"')) ||
    (raw.startsWith("'") && raw.endsWith("'"))
      ? raw.slice(1, -1)
      : raw;

  return unwrapped.replace(/\\n/g, "\n");
}

function extractObjectKey(pathOrUrl) {
  if (!pathOrUrl || typeof pathOrUrl !== "string") return "";

  try {
    const parsed = new URL(pathOrUrl);
    return decodeURIComponent(parsed.pathname.replace(/^\/+/, ""));
  } catch {
    return pathOrUrl.replace(/^\/+/, "").trim();
  }
}

function encodeKeyForUrl(objectKey) {
  return objectKey
    .split("/")
    .filter(Boolean)
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

export function toCloudFrontDeliveryUrl(
  pathOrUrl,
  ttlSeconds = DEFAULT_TTL_SECONDS,
) {
  const key = extractObjectKey(pathOrUrl);
  if (!key) return pathOrUrl;

  const baseUrl = normalizeCloudFrontBaseUrl();
  if (!baseUrl) return pathOrUrl;

  const unsignedUrl = `${baseUrl}/${encodeKeyForUrl(key)}`;
  const keyPairId = (process.env.CF_KEY_PAIR_ID || "").trim();
  const privateKey = normalizePrivateKey();

  if (!keyPairId || !privateKey) {
    return unsignedUrl;
  }

  try {
    const expiresAt = new Date(Date.now() + ttlSeconds * 1000).toISOString();
    return getSignedUrl({
      url: unsignedUrl,
      keyPairId,
      privateKey,
      dateLessThan: expiresAt,
    });
  } catch (error) {
    console.error("Failed to sign CloudFront URL:", error);
    return unsignedUrl;
  }
}

export function withMediaDeliveryUrls(artwork) {
  const plain =
    artwork && typeof artwork.toObject === "function"
      ? artwork.toObject()
      : { ...artwork };

  if (plain.filePath) {
    plain.filePath = toCloudFrontDeliveryUrl(plain.filePath);
  }

  if (plain.thumbnailPath) {
    plain.thumbnailPath = toCloudFrontDeliveryUrl(plain.thumbnailPath);
  }

  if (
    plain.userId &&
    typeof plain.userId === "object" &&
    plain.userId.profilePictureUrl
  ) {
    plain.userId.profilePictureUrl = toCloudFrontDeliveryUrl(
      plain.userId.profilePictureUrl,
    );
  }

  if (
    plain.userDetails &&
    typeof plain.userDetails === "object" &&
    plain.userDetails.profilePictureUrl
  ) {
    plain.userDetails.profilePictureUrl = toCloudFrontDeliveryUrl(
      plain.userDetails.profilePictureUrl,
    );
  }

  return plain;
}
