import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";

import userRoutes from "../routes/userRoutes.js";

import User from "../models/User.js";

const JWT_SECRET = "test-jwt-secret";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/users", userRoutes);
  return app;
};

const makeAuthHeader = (token) => ({ Authorization: `Bearer ${token}` });

const createUserWithToken = async ({ username, email }) => {
  const user = await User.create({
    username,
    email,
    passwordHash: "hashed-password",
  });

  const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: "1h" });
  return { user, token };
};

describe("User API routes", () => {
  let mongoServer;
  let app;

  beforeAll(async () => {
    process.env.JWT_SECRET = JWT_SECRET;

    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());

    app = buildApp();
  });

  afterEach(async () => {
    const collections = mongoose.connection.collections;
    await Promise.all(
      Object.values(collections).map((collection) => collection.deleteMany({})),
    );
  });

  afterAll(async () => {
    await mongoose.disconnect();
    if (mongoServer) {
      await mongoServer.stop();
    }
  });

  test("PATCH /api/users/:id rejects unauthenticated requests", async () => {
    const { user } = await createUserWithToken({
      username: "profileOwner",
      email: "profileOwner@example.com",
    });

    const res = await request(app)
      .patch(`/api/users/${user._id}`)
      .send({ bio: "Updated bio" });

    expect(res.status).toBe(401);
  });

  test("PATCH /api/users/:id rejects updates from other users", async () => {
    const { user: owner } = await createUserWithToken({
      username: "ownerUser",
      email: "ownerUser@example.com",
    });
    const { token: otherToken } = await createUserWithToken({
      username: "otherUser",
      email: "otherUser@example.com",
    });

    const res = await request(app)
      .patch(`/api/users/${owner._id}`)
      .set(makeAuthHeader(otherToken))
      .send({ bio: "Should not apply" });

    expect(res.status).toBe(403);
  });

  test("PATCH /api/users/:id allows the owner to update their profile", async () => {
    const { user, token } = await createUserWithToken({
      username: "editableUser",
      email: "editableUser@example.com",
    });

    const res = await request(app)
      .patch(`/api/users/${user._id}`)
      .set(makeAuthHeader(token))
      .send({ bio: "New bio text" });

    expect(res.status).toBe(200);
    expect(res.body.bio).toBe("New bio text");
    expect(res.body._id).toBe(String(user._id));
  });
});
