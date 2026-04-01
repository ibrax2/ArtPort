import mongoose from "mongoose";
import FeedbackForm from "../models/FeedbackForm.js";
import Question from "../models/Question.js";
import Option from "../models/Option.js";
import Response from "../models/Response.js";
import Answer from "../models/Answer.js";

const isObjectId = (value) => mongoose.Types.ObjectId.isValid(value);

const normalizeQuestionType = (type) => {
  if (!type) {
    return null;
  }

  const normalized = String(type).trim().toLowerCase();

  if (normalized === "mcq") {
    return "mcq";
  }

  if (normalized === "rating" || normalized === "ratingscale") {
    return "rating";
  }

  if (normalized === "text") {
    return "text";
  }

  return null;
};

const toIntOrNull = (value) => {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
};

const cleanupFormTree = async (formId) => {
  if (!formId) {
    return;
  }

  const questionsToDelete = await Question.find({ feedbackId: formId }).select(
    "_id",
  );
  const questionIds = questionsToDelete.map((q) => q._id);

  if (questionIds.length > 0) {
    await Option.deleteMany({ questionId: { $in: questionIds } });
  }

  await Question.deleteMany({ feedbackId: formId });
  await FeedbackForm.findByIdAndDelete(formId);
};

// @desc    Create a feedback form with questions and optional MCQ options
// @route   POST /api/feedbackForm
// @access  Private
export const createFeedbackForm = async (req, res) => {
  const { artworkID, artworkId, userId, createdBy, questions } = req.body;

  const resolvedArtworkId = artworkID || artworkId;
  const requestedCreatedBy = userId || createdBy;
  const authUserId = String(req.user._id);

  if (!isObjectId(resolvedArtworkId)) {
    return res.status(400).json({ message: "Valid artworkID is required" });
  }

  if (requestedCreatedBy && String(requestedCreatedBy) !== authUserId) {
    return res.status(403).json({
      message: "You can only create feedback forms as the authenticated user",
    });
  }

  if (!Array.isArray(questions) || questions.length === 0) {
    return res
      .status(400)
      .json({ message: "questions must be a non-empty array" });
  }

  let form = null;

  try {
    form = await FeedbackForm.create({
      artworkId: resolvedArtworkId,
      createdBy: authUserId,
    });

    for (const [index, item] of questions.entries()) {
      const normalizedType = normalizeQuestionType(item.type);

      if (!item.question || !normalizedType) {
        await cleanupFormTree(form._id);
        return res.status(400).json({
          message: `Question at index ${index} must include question and a valid type`,
        });
      }

      const questionOrder = Number.isInteger(item.order)
        ? item.order
        : index + 1;

      const ratingMin = toIntOrNull(item.rating?.ratingMin ?? item.ratingMin);
      const ratingMax = toIntOrNull(item.rating?.ratingMax ?? item.ratingMax);

      if (normalizedType === "rating") {
        if (
          ratingMin === null ||
          ratingMax === null ||
          ratingMin >= ratingMax
        ) {
          await cleanupFormTree(form._id);
          return res.status(400).json({
            message: `Rating question at index ${index} must include valid ratingMin and ratingMax`,
          });
        }
      }

      const allowMultipleSelections = item.allowMultipleSelections !== false;

      const createdQuestion = await Question.create({
        feedbackId: form._id,
        question: item.question,
        type: normalizedType,
        order: questionOrder,
        ratingMin: normalizedType === "rating" ? ratingMin : null,
        ratingMax: normalizedType === "rating" ? ratingMax : null,
        allowMultipleSelections:
          normalizedType === "mcq" ? allowMultipleSelections : true,
      });

      const optionInput = item.Options || item.options || [];

      if (normalizedType === "mcq") {
        if (!Array.isArray(optionInput) || optionInput.length === 0) {
          await cleanupFormTree(form._id);
          return res.status(400).json({
            message: `MCQ question at index ${index} must include a non-empty options array`,
          });
        }

        const optionDocs = optionInput.map((opt, optionIndex) => ({
          questionId: createdQuestion._id,
          option: opt.Option || opt.option,
          order: Number.isInteger(opt.order) ? opt.order : optionIndex + 1,
        }));

        const hasInvalidOption = optionDocs.some((opt) => !opt.option);

        if (hasInvalidOption) {
          await cleanupFormTree(form._id);
          return res.status(400).json({
            message: `Each option in MCQ question at index ${index} must include Option/option`,
          });
        }

        await Option.insertMany(optionDocs);
      }
    }

    const created = await getFeedbackFormByIdInternal(form._id);
    return res.status(201).json(created);
  } catch (error) {
    if (form?._id) {
      await cleanupFormTree(form._id);
    }

    return res.status(500).json({ message: error.message });
  }
};

// @desc    List feedback forms (optionally filter by artworkId)
// @route   GET /api/feedbackForm?artworkId=<id>&userId=<id>
// @access  Private
export const getFeedbackForms = async (req, res) => {
  try {
    const authUserId = String(req.user._id);
    const { artworkId, artworkID, userId, createdBy } = req.query;
    const requestedOwnerId = userId || createdBy;

    if (requestedOwnerId && String(requestedOwnerId) !== authUserId) {
      return res.status(403).json({
        message: "You can only list feedback forms for your own user",
      });
    }

    const resolvedArtworkId = artworkID || artworkId;
    const query = { createdBy: authUserId };

    if (resolvedArtworkId !== undefined) {
      if (!isObjectId(resolvedArtworkId)) {
        return res.status(400).json({ message: "Invalid artworkId" });
      }
      query.artworkId = resolvedArtworkId;
    }

    const forms = await FeedbackForm.find(query).sort({ createdAt: -1 });
    const detailedForms = [];

    for (const form of forms) {
      const detailed = await getFeedbackFormByIdInternal(form._id);
      if (detailed) {
        detailedForms.push(detailed);
      }
    }

    return res.json(detailedForms);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const buildFormView = (form, questions, optionsByQuestionId) => {
  return {
    _id: form._id,
    artworkId: form.artworkId,
    createdBy: form.createdBy,
    uploadDate: form.uploadDate,
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    questions: questions.map((q) => ({
      _id: q._id,
      feedbackId: q.feedbackId,
      question: q.question,
      type: q.type,
      order: q.order,
      allowMultipleSelections:
        q.type === "mcq" ? q.allowMultipleSelections : null,
      rating:
        q.type === "rating"
          ? {
              ratingMin: q.ratingMin,
              ratingMax: q.ratingMax,
            }
          : null,
      options: (optionsByQuestionId.get(String(q._id)) || []).map((o) => ({
        _id: o._id,
        questionId: o.questionId,
        order: o.order,
        option: o.option,
      })),
    })),
  };
};

const getFeedbackFormByIdInternal = async (formId) => {
  const form = await FeedbackForm.findById(formId);

  if (!form) {
    return null;
  }

  const questions = await Question.find({ feedbackId: form._id }).sort({
    order: 1,
  });
  const questionIds = questions.map((q) => q._id);

  const options =
    questionIds.length > 0
      ? await Option.find({ questionId: { $in: questionIds } }).sort({
          order: 1,
        })
      : [];

  const optionsByQuestionId = new Map();

  for (const option of options) {
    const key = String(option.questionId);
    if (!optionsByQuestionId.has(key)) {
      optionsByQuestionId.set(key, []);
    }
    optionsByQuestionId.get(key).push(option);
  }

  return buildFormView(form, questions, optionsByQuestionId);
};

// @desc    Get one feedback form with full question/option details
// @route   GET /api/feedbackForm/:id
// @access  Private
export const getFeedbackFormById = async (req, res) => {
  try {
    const authUserId = String(req.user._id);

    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid feedback form id" });
    }

    const formDoc = await FeedbackForm.findById(req.params.id).select(
      "createdBy",
    );

    if (!formDoc) {
      return res.status(404).json({ message: "Feedback form not found" });
    }

    if (String(formDoc.createdBy) !== authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const form = await getFeedbackFormByIdInternal(req.params.id);

    if (!form) {
      return res.status(404).json({ message: "Feedback form not found" });
    }

    return res.json(form);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    Create a response and answer records
// @route   POST /api/response
// @access  Private
export const createResponse = async (req, res) => {
  const { feedbackFormID, feedbackId, userID, userId, Answers, answers } =
    req.body;

  const resolvedFeedbackId = feedbackFormID || feedbackId;
  const requestedUserId = userID || userId;
  const resolvedAnswers = Answers || answers;
  const authUserId = String(req.user._id);

  if (!isObjectId(resolvedFeedbackId)) {
    return res
      .status(400)
      .json({ message: "Valid feedbackFormID is required" });
  }

  if (requestedUserId && String(requestedUserId) !== authUserId) {
    return res.status(403).json({
      message: "You can only create responses as the authenticated user",
    });
  }

  if (!Array.isArray(resolvedAnswers) || resolvedAnswers.length === 0) {
    return res
      .status(400)
      .json({ message: "Answers must be a non-empty array" });
  }

  try {
    const form = await FeedbackForm.findById(resolvedFeedbackId);

    if (!form) {
      return res.status(404).json({ message: "Feedback form not found" });
    }

    const existingResponse = await Response.findOne({
      feedbackId: form._id,
      userId: authUserId,
    }).select("_id");

    if (existingResponse) {
      return res.status(409).json({
        message: "A response for this form already exists for this user",
      });
    }

    const questions = await Question.find({ feedbackId: form._id });
    const questionsById = new Map(questions.map((q) => [String(q._id), q]));
    const questionIds = questions.map((q) => q._id);

    const options =
      questionIds.length > 0
        ? await Option.find({ questionId: { $in: questionIds } })
        : [];

    const optionByQuestionIdAndOrder = new Map();

    for (const option of options) {
      const questionKey = String(option.questionId);
      optionByQuestionIdAndOrder.set(`${questionKey}:${option.order}`, option);
    }

    const response = await Response.create({
      feedbackId: form._id,
      userId: authUserId,
    });

    const answerDocs = [];

    for (const [index, answerItem] of resolvedAnswers.entries()) {
      const questionId = answerItem.questionID || answerItem.questionId;

      if (!isObjectId(questionId)) {
        await Response.findByIdAndDelete(response._id);
        return res.status(400).json({
          message: `Answer at index ${index} has invalid questionID`,
        });
      }

      const question = questionsById.get(String(questionId));

      if (!question) {
        await Response.findByIdAndDelete(response._id);
        return res.status(400).json({
          message: `Question ${questionId} does not belong to feedback form ${resolvedFeedbackId}`,
        });
      }

      if (question.type === "mcq") {
        const selections = answerItem.optionSelections || [];

        if (!Array.isArray(selections) || selections.length === 0) {
          await Response.findByIdAndDelete(response._id);
          return res.status(400).json({
            message: `MCQ answer at index ${index} must include optionSelections`,
          });
        }

        if (!question.allowMultipleSelections && selections.length > 1) {
          await Response.findByIdAndDelete(response._id);
          return res.status(400).json({
            message: `MCQ answer at index ${index} allows only one selection`,
          });
        }

        for (const selection of selections) {
          const selectedOrder = toIntOrNull(selection.selection);

          if (selectedOrder === null) {
            await Response.findByIdAndDelete(response._id);
            return res.status(400).json({
              message: `MCQ answer at index ${index} contains invalid selection`,
            });
          }

          const selectedOption = optionByQuestionIdAndOrder.get(
            `${String(question._id)}:${selectedOrder}`,
          );

          if (!selectedOption) {
            await Response.findByIdAndDelete(response._id);
            return res.status(400).json({
              message: `Selected order ${selectedOrder} is not a valid option for question ${question._id}`,
            });
          }

          answerDocs.push({
            responseId: response._id,
            questionId: question._id,
            optionId: selectedOption._id,
            value: String(selectedOrder),
          });
        }
      } else if (question.type === "rating") {
        const ratingSelection = toIntOrNull(answerItem.ratingSelection);

        if (
          ratingSelection === null ||
          ratingSelection < question.ratingMin ||
          ratingSelection > question.ratingMax
        ) {
          await Response.findByIdAndDelete(response._id);
          return res.status(400).json({
            message: `Rating answer at index ${index} must be in range ${question.ratingMin}-${question.ratingMax}`,
          });
        }

        answerDocs.push({
          responseId: response._id,
          questionId: question._id,
          optionId: null,
          value: String(ratingSelection),
        });
      } else {
        const textValue = answerItem.textValue || answerItem.value || "";

        answerDocs.push({
          responseId: response._id,
          questionId: question._id,
          optionId: null,
          value: String(textValue),
        });
      }
    }

    if (answerDocs.length > 0) {
      await Answer.insertMany(answerDocs);
    }

    const createdResponse = await getResponseByIdInternal(response._id);
    return res.status(201).json(createdResponse);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

// @desc    List responses (optionally filter by feedbackFormId)
// @route   GET /api/response?feedbackFormId=<id>&userId=<id>
// @access  Private
export const getResponses = async (req, res) => {
  try {
    const authUserId = String(req.user._id);
    const { feedbackFormId, feedbackFormID, feedbackId, userId, userID } =
      req.query;
    const requestedUserId = userID || userId;

    if (requestedUserId && String(requestedUserId) !== authUserId) {
      return res.status(403).json({
        message: "You can only list your own responses",
      });
    }

    const resolvedFeedbackId = feedbackFormID || feedbackFormId || feedbackId;
    const query = { userId: authUserId };

    if (resolvedFeedbackId !== undefined) {
      if (!isObjectId(resolvedFeedbackId)) {
        return res.status(400).json({ message: "Invalid feedbackFormId" });
      }
      query.feedbackId = resolvedFeedbackId;
    }

    const responses = await Response.find(query).sort({ createdAt: -1 });
    const detailedResponses = [];

    for (const response of responses) {
      const detailed = await getResponseByIdInternal(response._id);
      if (detailed) {
        detailedResponses.push(detailed);
      }
    }

    return res.json(detailedResponses);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};

const buildResponseView = (response, formView, answers, questionById) => {
  const answerMap = new Map();

  for (const answer of answers) {
    const key = String(answer.questionId);
    if (!answerMap.has(key)) {
      answerMap.set(key, []);
    }
    answerMap.get(key).push(answer);
  }

  const questionsWithSelections = formView.questions.map((question) => {
    const questionAnswers = answerMap.get(String(question._id)) || [];
    const sourceQuestion = questionById.get(String(question._id));

    const selectedOptionIds = questionAnswers
      .filter((a) => a.optionId)
      .map((a) => String(a.optionId));

    const selectedOptionOrders = questionAnswers
      .filter((a) => a.optionId)
      .map((a) => Number(a.value))
      .filter((v) => Number.isInteger(v));

    const ratingSelection =
      sourceQuestion?.type === "rating" && questionAnswers.length > 0
        ? Number(questionAnswers[0].value)
        : null;

    const textValue =
      sourceQuestion?.type === "text" && questionAnswers.length > 0
        ? questionAnswers[0].value
        : null;

    return {
      ...question,
      options: question.options.map((option) => ({
        ...option,
        selected: selectedOptionIds.includes(String(option._id)),
      })),
      selectedOptionOrders,
      ratingSelection,
      textValue,
    };
  });

  return {
    _id: response._id,
    feedbackId: response.feedbackId,
    userId: response.userId,
    uploadDate: response.uploadDate,
    createdAt: response.createdAt,
    updatedAt: response.updatedAt,
    form: {
      ...formView,
      questions: questionsWithSelections,
    },
    answers: answers.map((a) => ({
      _id: a._id,
      responseId: a.responseId,
      questionId: a.questionId,
      optionId: a.optionId,
      value: a.value,
      createdAt: a.createdAt,
      updatedAt: a.updatedAt,
    })),
  };
};

const getResponseByIdInternal = async (responseId) => {
  const response = await Response.findById(responseId);

  if (!response) {
    return null;
  }

  const formView = await getFeedbackFormByIdInternal(response.feedbackId);

  if (!formView) {
    return null;
  }

  const answers = await Answer.find({ responseId: response._id });
  const questions = await Question.find({ feedbackId: response.feedbackId });
  const questionById = new Map(questions.map((q) => [String(q._id), q]));

  return buildResponseView(response, formView, answers, questionById);
};

// @desc    Get one response including the full form structure + chosen answers
// @route   GET /api/response/:id
// @access  Private
export const getResponseById = async (req, res) => {
  try {
    const authUserId = String(req.user._id);

    if (!isObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid response id" });
    }

    const responseDoc = await Response.findById(req.params.id).select("userId");

    if (!responseDoc) {
      return res.status(404).json({ message: "Response not found" });
    }

    if (String(responseDoc.userId) !== authUserId) {
      return res.status(403).json({ message: "Forbidden" });
    }

    const responseView = await getResponseByIdInternal(req.params.id);

    if (!responseView) {
      return res.status(404).json({ message: "Response not found" });
    }

    return res.json(responseView);
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }
};
