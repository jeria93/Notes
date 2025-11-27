const { randomUUID } = require("crypto");
const bcrypt = require("bcryptjs");
const { ddb } = require("../utils/db");
const { PutCommand, GetCommand } = require("@aws-sdk/lib-dynamodb");
const { sendResponse } = require("../utils/responses");

const USERS_TABLE = process.env.USERS_TABLE || "notes-accounts";

module.exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    // Basic validation: both fields are required
    if (!username || !password) {
      return sendResponse(400, {
        error: "username and password are required",
      });
    }

    // Extra validation: password must be long enough
    if (password.length < 6) {
      return sendResponse(400, {
        error: "password must be at least 6 characters",
      });
    }

    // Check in DynamoDB if this username already exists
    const existing = await ddb.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { username },
        ProjectionExpression: "username",
      })
    );

    if (existing.Item) {
      return sendResponse(409, { error: "username already exists" });
    }

    // Create user
    const passwordHash = await bcrypt.hash(password, 10);
    const userId = randomUUID();
    const now = new Date().toISOString();

    // Save the new user in DynamoDB
    await ddb.send(
      new PutCommand({
        TableName: USERS_TABLE,
        Item: {
          username,
          userId,
          passwordHash,
          createdAt: now,
        },
        ConditionExpression: "attribute_not_exists(username)",
      })
    );

    return sendResponse(201, {
      message: "user created",
      user: { userId, username },
    });
  } catch (err) {
    console.error("signup error", err);
    return sendResponse(500, { error: "internal error" });
  }
};
