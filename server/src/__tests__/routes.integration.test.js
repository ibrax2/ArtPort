import { jest } from "@jest/globals";
import request from "supertest";
import mongoose from "mongoose";
import { MongoMemoryServer } from "mongodb-memory-server";
import User from "../models/User.js";
import Folder from "../models/Folder.js";

let app;
let mongoServer;

const seedUser = {
  username: "IntegrationUser",
  email: "integration@example.com",
  password: "ValidPass1!",
};

const connectIntegrationDatabase = async () => {
  mongoServer = await MongoMemoryServer.create();
  process.env.NODE_ENV = "test";
  process.env.JWT_SECRET = "integration-secret";
  process.env.AUTHCOOKIE_NAME = "artport_token";
  process.env.FRONTEND_URL = "http://localhost:3000";
  process.env.MONGO_URI = mongoServer.getUri();

  await mongoose.connect(mongoServer.getUri());
  ({ default: app } = await import("../app.js"));
};

const clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  await Promise.all(
    Object.values(collections).map((collection) => collection.deleteMany({})),
  );
};

describe("Server integration routes", () => {
  beforeAll(async () => {
    await connectIntegrationDatabase();
  });

  beforeEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await mongoose.disconnect();
    await mongoServer.stop();
  });

  it("registers a user and allows access to the authenticated profile", async () => {
    const registerResponse = await request(app)
      .post("/api/users/register")
      .send(seedUser);

    expect(registerResponse.status).toBe(201);
    expect(registerResponse.body).toMatchObject({
      username: seedUser.username,
      email: seedUser.email,
      token: expect.any(String),
      rootFolderId: expect.any(String),
    });

    const profileResponse = await request(app)
      .get("/api/users/me")
      .set("Authorization", `Bearer ${registerResponse.body.token}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body).toMatchObject({
      username: seedUser.username,
      email: seedUser.email,
    });

    const storedUser = await User.findOne({ email: seedUser.email }).lean();
    expect(storedUser).toMatchObject({
      username: seedUser.username,
      email: seedUser.email,
    });

    const rootFolder = await Folder.findById(storedUser.rootFolderId).lean();
    expect(rootFolder).toMatchObject({
      folderName: "Root",
      isPublic: true,
    });

    const childFolderNames = await Folder.find({
      parentFolderId: rootFolder._id,
    })
      .select("folderName")
      .lean();
    expect(childFolderNames.map((folder) => folder.folderName).sort()).toEqual([
      "Archive",
      "Bookmarks",
      "Portfolio",
    ]);
  });

  it("creates a folder and exposes it through the folder tree", async () => {
    const registerResponse = await request(app)
      .post("/api/users/register")
      .send(seedUser);

    const folderResponse = await request(app)
      .post("/api/folders")
      .set("Authorization", `Bearer ${registerResponse.body.token}`)
      .send({
        folderName: "Sketches",
        parentFolderId: registerResponse.body.rootFolderId,
        isPublic: true,
      });

    expect(folderResponse.status).toBe(201);
    expect(folderResponse.body).toMatchObject({
      folderName: "Sketches",
      isPublic: true,
    });

    const treeResponse = await request(app)
      .get(`/api/users/${registerResponse.body._id}/folder-tree`)
      .set("Authorization", `Bearer ${registerResponse.body.token}`);

    expect(treeResponse.status).toBe(200);
    expect(treeResponse.body.folderName).toBe("Root");
    expect(
      treeResponse.body.subfolders.map((folder) => folder.folderName),
    ).toEqual(
      expect.arrayContaining(["Sketches", "Bookmarks", "Archive", "Portfolio"]),
    );
  });

  it("hides private profile data on the public username route", async () => {
    const registerResponse = await request(app)
      .post("/api/users/register")
      .send(seedUser);

    await User.findByIdAndUpdate(registerResponse.body._id, {
      isPrivate: true,
      showEmailOnProfile: false,
    });

    const publicProfileResponse = await request(app).get(
      `/api/users/by-username/${seedUser.username}`,
    );

    expect(publicProfileResponse.status).toBe(200);
    expect(publicProfileResponse.body).toEqual(
      expect.objectContaining({
        _id: registerResponse.body._id,
        username: seedUser.username,
        isPrivate: true,
      }),
    );
    expect(publicProfileResponse.body.email).toBeUndefined();
  });

  it("rejects protected routes without authentication", async () => {
    const response = await request(app).post("/api/folders").send({
      folderName: "Sketches",
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: "Not authorized, no token" });
  });
});
