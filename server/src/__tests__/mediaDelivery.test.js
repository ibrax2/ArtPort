import { jest } from "@jest/globals";

const mockGetSignedUrl = jest.fn();

jest.unstable_mockModule("@aws-sdk/cloudfront-signer", () => ({
  getSignedUrl: mockGetSignedUrl,
}));

const { toCloudFrontDeliveryUrl, withMediaDeliveryUrls } =
  await import("../utils/mediaDelivery.js");

describe("mediaDelivery utility", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
    delete process.env.CLOUDFRONT_URL;
    delete process.env.CF_KEY_PAIR_ID;
    delete process.env.CF_PRIVATE_KEY;
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it("returns original URL when CLOUDFRONT_URL is not configured", () => {
    const source =
      "https://bucket.s3.us-east-2.amazonaws.com/artworks/image.png";
    const delivered = toCloudFrontDeliveryUrl(source);

    expect(delivered).toBe(source);
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("maps S3 URL to CloudFront unsigned URL when signing credentials are missing", () => {
    process.env.CLOUDFRONT_URL = " d417w64urdeit.cloudfront.net ";

    const source =
      "https://bucket.s3.us-east-2.amazonaws.com/artworks/image one.png";
    const delivered = toCloudFrontDeliveryUrl(source);

    expect(delivered).toBe(
      "https://d417w64urdeit.cloudfront.net/artworks/image%20one.png",
    );
    expect(mockGetSignedUrl).not.toHaveBeenCalled();
  });

  it("returns signed CloudFront URL when key pair and private key are configured", () => {
    process.env.CLOUDFRONT_URL = "d417w64urdeit.cloudfront.net";
    process.env.CF_KEY_PAIR_ID = "K123";
    process.env.CF_PRIVATE_KEY =
      '"-----BEGIN PRIVATE KEY-----\\nabc123\\n-----END PRIVATE KEY-----"';

    mockGetSignedUrl.mockReturnValue("https://signed.example/url");

    const delivered = toCloudFrontDeliveryUrl(
      "https://bucket.s3.us-east-2.amazonaws.com/artworks/image.png",
      120,
    );

    expect(delivered).toBe("https://signed.example/url");
    expect(mockGetSignedUrl).toHaveBeenCalledTimes(1);

    const args = mockGetSignedUrl.mock.calls[0][0];
    expect(args.url).toBe(
      "https://d417w64urdeit.cloudfront.net/artworks/image.png",
    );
    expect(args.keyPairId).toBe("K123");
    expect(args.privateKey).toContain("-----BEGIN PRIVATE KEY-----");
    expect(args.privateKey).toContain("\nabc123\n");
    expect(typeof args.dateLessThan).toBe("string");
  });

  it("transforms filePath and thumbnailPath fields in artwork payload", () => {
    process.env.CLOUDFRONT_URL = "d417w64urdeit.cloudfront.net";

    const input = {
      _id: "a1",
      title: "test",
      filePath: "https://bucket.s3.us-east-2.amazonaws.com/artworks/main.png",
      thumbnailPath:
        "https://bucket.s3.us-east-2.amazonaws.com/artworks/thumbnails/thumb.png",
    };

    const output = withMediaDeliveryUrls(input);

    expect(output.filePath).toBe(
      "https://d417w64urdeit.cloudfront.net/artworks/main.png",
    );
    expect(output.thumbnailPath).toBe(
      "https://d417w64urdeit.cloudfront.net/artworks/thumbnails/thumb.png",
    );
  });

  it("transforms nested user profilePictureUrl in populated artwork payload", () => {
    process.env.CLOUDFRONT_URL = "d417w64urdeit.cloudfront.net";

    const input = {
      _id: "a2",
      title: "portrait",
      filePath: "https://bucket.s3.us-east-2.amazonaws.com/artworks/main.png",
      userId: {
        username: "artistA",
        profilePictureUrl:
          "https://bucket.s3.us-east-2.amazonaws.com/users/profile.png",
      },
    };

    const output = withMediaDeliveryUrls(input);

    expect(output.userId.profilePictureUrl).toBe(
      "https://d417w64urdeit.cloudfront.net/users/profile.png",
    );
  });

  it("transforms search userDetails.profilePictureUrl when present", () => {
    process.env.CLOUDFRONT_URL = "d417w64urdeit.cloudfront.net";

    const input = {
      _id: "a3",
      title: "landscape",
      filePath: "https://bucket.s3.us-east-2.amazonaws.com/artworks/main.png",
      userDetails: {
        username: "artistB",
        profilePictureUrl:
          "https://bucket.s3.us-east-2.amazonaws.com/users/profile-b.png",
      },
    };

    const output = withMediaDeliveryUrls(input);

    expect(output.userDetails.profilePictureUrl).toBe(
      "https://d417w64urdeit.cloudfront.net/users/profile-b.png",
    );
  });
});
