import express from "express";
import mongoose from "mongoose";
import request from "supertest";
import jwt from "jsonwebtoken";
import { MongoMemoryServer } from "mongodb-memory-server";

import feedbackFormRoutes from "../routes/feedbackFormRoutes.js";
import responseRoutes from "../routes/responseRoutes.js";

import User from "../models/User.js";
import Artwork from "../models/Artwork.js";
import FeedbackForm from "../models/FeedbackForm.js";
import Response from "../models/Response.js";

const JWT_SECRET = "test-jwt-secret";

const buildApp = () => {
  const app = express();
  app.use(express.json());
  app.use("/api/feedbackForm", feedbackFormRoutes);
  app.use("/api/response", responseRoutes);
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

const createArtwork = async ({ userId, title }) => {
  return Artwork.create({
    userId,
    title,
    filePath: `/tmp/${title.toLowerCase().replace(/\s+/g, "-")}.png`,
  });
};

const createFeedbackFormPayload = (artworkId) => ({
  artworkId,
  questions: [
    {
      question: "Choose one style",
      type: "mcq",
      order: 1,
      allowMultipleSelections: false,
      options: [
        { order: 1, option: "Realism" },
        { order: 2, option: "Abstract" },
      ],
    },
    {
      question: "Choose all strengths",
      type: "mcq",
      order: 2,
      allowMultipleSelections: true,
      options: [
        { order: 1, option: "Color" },
        { order: 2, option: "Composition" },
        { order: 3, option: "Lighting" },
      ],
    },
    {
      question: "Overall rating",
      type: "ratingScale",
      order: 3,
      rating: { ratingMin: 1, ratingMax: 10 },
    },
  ],
});

describe("FeedbackForm and Response API routes", () => {
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

  test("POST /api/feedbackForm creates form with full structure", async () => {
    const { user, token } = await createUserWithToken({
      username: "artistA",
      email: "artistA@example.com",
    });
    const artwork = await createArtwork({
      userId: user._id,
      title: "Artwork A",
    });

    const res = await request(app)
      .post("/api/feedbackForm")
      .set(makeAuthHeader(token))
      .send(createFeedbackFormPayload(String(artwork._id)));

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body).toHaveProperty("artworkId", String(artwork._id));
    expect(res.body.questions).toHaveLength(3);

    const singleMcq = res.body.questions.find((q) => q.order === 1);
    const multiMcq = res.body.questions.find((q) => q.order === 2);

    expect(singleMcq.type).toBe("mcq");
    expect(singleMcq.allowMultipleSelections).toBe(false);
    expect(singleMcq.options).toHaveLength(2);

    expect(multiMcq.type).toBe("mcq");
    expect(multiMcq.allowMultipleSelections).toBe(true);
    expect(multiMcq.options).toHaveLength(3);
  });

  test("GET /api/feedbackForm lists only owner forms and supports artwork filter", async () => {
    const { user: userA, token: tokenA } = await createUserWithToken({
      username: "ownerA",
      email: "ownerA@example.com",
    });
    const { user: userB, token: tokenB } = await createUserWithToken({
      username: "ownerB",
      email: "ownerB@example.com",
    });

    const artworkA1 = await createArtwork({
      userId: userA._id,
      title: "A One",
    });
    const artworkA2 = await createArtwork({
      userId: userA._id,
      title: "A Two",
    });
    const artworkB = await createArtwork({ userId: userB._id, title: "B One" });

    await request(app)
      .post("/api/feedbackForm")
      .set(makeAuthHeader(tokenA))
      .send(createFeedbackFormPayload(String(artworkA1._id)));
    await request(app)
      .post("/api/feedbackForm")
      .set(makeAuthHeader(tokenA))
      .send(createFeedbackFormPayload(String(artworkA2._id)));
    await request(app)
      .post("/api/feedbackForm")
      .set(makeAuthHeader(tokenB))
      .send(createFeedbackFormPayload(String(artworkB._id)));

    const listRes = await request(app)
      .get("/api/feedbackForm")
      .set(makeAuthHeader(tokenA));

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(2);
    expect(listRes.body.every((f) => f.createdBy === String(userA._id))).toBe(
      true,
    );

    const filteredRes = await request(app)
      .get(`/api/feedbackForm?artworkId=${artworkA1._id}`)
      .set(makeAuthHeader(tokenA));

    expect(filteredRes.status).toBe(200);
    expect(filteredRes.body).toHaveLength(1);
    expect(filteredRes.body[0].artworkId).toBe(String(artworkA1._id));
  });

  test("GET /api/feedbackForm/:id allows owner and blocks other users", async () => {
    const { user: owner, token: ownerToken } = await createUserWithToken({
      username: "formOwner",
      email: "formOwner@example.com",
    });
    const { token: otherToken } = await createUserWithToken({
      username: "otherUser",
      email: "otherUser@example.com",
    });

    const artwork = await createArtwork({
      userId: owner._id,
      title: "Owner Art",
    });
    const createRes = await request(app)
      .post("/api/feedbackForm")
      .set(makeAuthHeader(ownerToken))
      .send(createFeedbackFormPayload(String(artwork._id)));

    const formId = createRes.body._id;

    const ownerGet = await request(app)
      .get(`/api/feedbackForm/${formId}`)
      .set(makeAuthHeader(ownerToken));
    expect(ownerGet.status).toBe(200);

    const otherGet = await request(app)
      .get(`/api/feedbackForm/${formId}`)
      .set(makeAuthHeader(otherToken));
    expect(otherGet.status).toBe(403);
  });

  test("POST /api/response creates response with multi-select and rating answers", async () => {
    const { user, token } = await createUserWithToken({
      username: "responder",
      email: "responder@example.com",
    });

    const artwork = await createArtwork({
      userId: user._id,
      title: "Response Art",
    });
    const formRes = await request(app)
      .post("/api/feedbackForm")
      .set(makeAuthHeader(token))
      .send(createFeedbackFormPayload(String(artwork._id)));

    const form = formRes.body;
    const singleMcq = form.questions.find((q) => q.order === 1);
    const multiMcq = form.questions.find((q) => q.order === 2);
    const ratingQ = form.questions.find((q) => q.order === 3);

    const responsePayload = {
      feedbackFormId: form._id,
      answers: [
        {
          questionId: singleMcq._id,
          optionSelections: [{ selection: 2 }],
        },
        {
          questionId: multiMcq._id,
          optionSelections: [{ selection: 1 }, { selection: 3 }],
        },
        {
          questionId: ratingQ._id,
          ratingSelection: 9,
        },
      ],
    };

    const res = await request(app)
      .post("/api/response")
      .set(makeAuthHeader(token))
      .send(responsePayload);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty("_id");
    expect(res.body).toHaveProperty("feedbackId", form._id);
    expect(res.body).toHaveProperty("userId", String(user._id));

    const reconstructedMulti = res.body.form.questions.find(
      (q) => q.order === 2,
    );
    expect(
      reconstructedMulti.selectedOptionOrders.sort((a, b) => a - b),
    ).toEqual([1, 3]);
  });

  test("POST /api/response blocks multiple selections for single-select MCQ", async () => {
    const { user, token } = await createUserWithToken({
      username: "singleRule",
      email: "singleRule@example.com",
    });

    const artwork = await createArtwork({
      userId: user._id,
      title: "Single Rule Art",
    });
    const formRes = await request(app)
      .post("/api/feedbackForm")
      .set(makeAuthHeader(token))
      .send(createFeedbackFormPayload(String(artwork._id)));

    const form = formRes.body;
    const singleMcq = form.questions.find((q) => q.order === 1);

    const res = await request(app)
      .post("/api/response")
      .set(makeAuthHeader(token))
      .send({
        feedbackFormId: form._id,
        answers: [
          {
            questionId: singleMcq._id,
            optionSelections: [{ selection: 1 }, { selection: 2 }],
          },
        ],
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/allows only one selection/i);
  });

  test("POST /api/response enforces one response per user per form", async () => {
    const { user, token } = await createUserWithToken({
      username: "dupUser",
      email: "dupUser@example.com",
    });

    const artwork = await createArtwork({ userId: user._id, title: "Dup Art" });
    const formRes = await request(app)
      .post("/api/feedbackForm")
      .set(makeAuthHeader(token))
      .send(createFeedbackFormPayload(String(artwork._id)));

    const form = formRes.body;
    const singleMcq = form.questions.find((q) => q.order === 1);

    const payload = {
      feedbackFormId: form._id,
      answers: [
        {
          questionId: singleMcq._id,
          optionSelections: [{ selection: 1 }],
        },
      ],
    };

    const first = await request(app)
      .post("/api/response")
      .set(makeAuthHeader(token))
      .send(payload);
    expect(first.status).toBe(201);

    const second = await request(app)
      .post("/api/response")
      .set(makeAuthHeader(token))
      .send(payload);
    expect(second.status).toBe(409);
  });

  test("GET /api/response lists only owner responses and supports feedbackForm filter", async () => {
    const { user: userA, token: tokenA } = await createUserWithToken({
      username: "respOwnerA",
      email: "respOwnerA@example.com",
    });
    const { user: userB, token: tokenB } = await createUserWithToken({
      username: "respOwnerB",
      email: "respOwnerB@example.com",
    });

    const artworkA1 = await createArtwork({ userId: userA._id, title: "RA1" });
    const artworkA2 = await createArtwork({ userId: userA._id, title: "RA2" });
    const artworkB = await createArtwork({ userId: userB._id, title: "RB1" });

    const formA1 = (
      await request(app)
        .post("/api/feedbackForm")
        .set(makeAuthHeader(tokenA))
        .send(createFeedbackFormPayload(String(artworkA1._id)))
    ).body;
    const formA2 = (
      await request(app)
        .post("/api/feedbackForm")
        .set(makeAuthHeader(tokenA))
        .send(createFeedbackFormPayload(String(artworkA2._id)))
    ).body;
    const formB = (
      await request(app)
        .post("/api/feedbackForm")
        .set(makeAuthHeader(tokenB))
        .send(createFeedbackFormPayload(String(artworkB._id)))
    ).body;

    const answerFor = (form) => ({
      feedbackFormId: form._id,
      answers: [
        {
          questionId: form.questions.find((q) => q.order === 1)._id,
          optionSelections: [{ selection: 1 }],
        },
      ],
    });

    await request(app)
      .post("/api/response")
      .set(makeAuthHeader(tokenA))
      .send(answerFor(formA1));
    await request(app)
      .post("/api/response")
      .set(makeAuthHeader(tokenA))
      .send(answerFor(formA2));
    await request(app)
      .post("/api/response")
      .set(makeAuthHeader(tokenB))
      .send(answerFor(formB));
    await request(app)
      .post("/api/response")
      .set(makeAuthHeader(tokenB))
      .send(answerFor(formA1));

    const listRes = await request(app)
      .get("/api/response")
      .set(makeAuthHeader(tokenA));

    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(2);
    expect(listRes.body.every((r) => r.userId === String(userA._id))).toBe(
      true,
    );

    const filteredRes = await request(app)
      .get(`/api/response?feedbackFormId=${formA1._id}`)
      .set(makeAuthHeader(tokenA));

    expect(filteredRes.status).toBe(200);
    expect(filteredRes.body).toHaveLength(1);
    expect(filteredRes.body[0].feedbackId).toBe(formA1._id);

    const ownerReceivedRes = await request(app)
      .get(`/api/response?feedbackFormId=${formA1._id}&ownerView=true`)
      .set(makeAuthHeader(tokenA));

    expect(ownerReceivedRes.status).toBe(200);
    expect(ownerReceivedRes.body).toHaveLength(1);
    expect(ownerReceivedRes.body[0].feedbackId).toBe(formA1._id);
    expect(ownerReceivedRes.body[0].userId).toBe(String(userB._id));

    const notOwnerReceivedRes = await request(app)
      .get(`/api/response?feedbackFormId=${formA1._id}&ownerView=true`)
      .set(makeAuthHeader(tokenB));

    expect(notOwnerReceivedRes.status).toBe(403);
  });

  test("GET /api/response/:id allows owner and blocks other users", async () => {
    const { user: owner, token: ownerToken } = await createUserWithToken({
      username: "responseOwner",
      email: "responseOwner@example.com",
    });
    const { token: otherToken } = await createUserWithToken({
      username: "responseOther",
      email: "responseOther@example.com",
    });

    const artwork = await createArtwork({
      userId: owner._id,
      title: "Owner Response Art",
    });
    const form = (
      await request(app)
        .post("/api/feedbackForm")
        .set(makeAuthHeader(ownerToken))
        .send(createFeedbackFormPayload(String(artwork._id)))
    ).body;

    const responseCreate = await request(app)
      .post("/api/response")
      .set(makeAuthHeader(ownerToken))
      .send({
        feedbackFormId: form._id,
        answers: [
          {
            questionId: form.questions.find((q) => q.order === 1)._id,
            optionSelections: [{ selection: 2 }],
          },
        ],
      });

    const responseId = responseCreate.body._id;

    const ownerGet = await request(app)
      .get(`/api/response/${responseId}`)
      .set(makeAuthHeader(ownerToken));
    expect(ownerGet.status).toBe(200);

    const otherGet = await request(app)
      .get(`/api/response/${responseId}`)
      .set(makeAuthHeader(otherToken));
    expect(otherGet.status).toBe(403);
  });

  test("protected routes return 401 without bearer token", async () => {
    const feedbackList = await request(app).get("/api/feedbackForm");
    const responseList = await request(app).get("/api/response");

    expect(feedbackList.status).toBe(401);
    expect(responseList.status).toBe(401);
  });

  test("form and response routes reject invalid object ids", async () => {
    const { token } = await createUserWithToken({
      username: "badIdUser",
      email: "badIdUser@example.com",
    });

    const formById = await request(app)
      .get("/api/feedbackForm/not-a-valid-id")
      .set(makeAuthHeader(token));

    const responseById = await request(app)
      .get("/api/response/not-a-valid-id")
      .set(makeAuthHeader(token));

    expect(formById.status).toBe(400);
    expect(responseById.status).toBe(400);
  });

  test("sanity check persisted counts for created resources", async () => {
    const { user, token } = await createUserWithToken({
      username: "countUser",
      email: "countUser@example.com",
    });

    const artwork = await createArtwork({
      userId: user._id,
      title: "Count Art",
    });
    const form = (
      await request(app)
        .post("/api/feedbackForm")
        .set(makeAuthHeader(token))
        .send(createFeedbackFormPayload(String(artwork._id)))
    ).body;

    await request(app)
      .post("/api/response")
      .set(makeAuthHeader(token))
      .send({
        feedbackFormId: form._id,
        answers: [
          {
            questionId: form.questions.find((q) => q.order === 1)._id,
            optionSelections: [{ selection: 1 }],
          },
        ],
      });

    const formCount = await FeedbackForm.countDocuments();
    const responseCount = await Response.countDocuments();

    expect(formCount).toBe(1);
    expect(responseCount).toBe(1);
  });
});
