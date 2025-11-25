const { randomUUID } = require("crypto");
const middy = require("@middy/core");
const { ddb } = require("../utils/db");
const { PutCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require("../utils/auth");
const { sendResponse } = require("../utils/responses");

const NOTES_TABLE = process.env.NOTES_TABLE || "notes-notes";

async function baseHandler(event) {
  try {
    const user = event.user;

    const body = event.body ? JSON.parse(event.body) : {};
    const title = String(body.title || "").trim();
    const text = String(body.text || "").trim(); 
    
    // Basic validation
    if (!title || !text) {
      return sendResponse(400, {
        error: "title and text are required",
      });
    }

    if (title.length > 50) {
      return sendResponse(400, {
        error: "title must be at most 50 characters",
      });
    }

    if (text.length > 300) {
      return sendResponse(400, {
        error: "text must be at most 300 characters",
      });
    }

    // Build note object
    const id = randomUUID();
    const now = new Date().toISOString();

    const noteItem = {
      userId: user.userId,
      id,
      title,
      text,
      createdAt: now,
      modifiedAt: now,
    };

    // Save note in DynamoDB
    await ddb.send(
      new PutCommand({
        TableName: NOTES_TABLE,
        Item: noteItem,
      })
    );

    // Return created note
    return sendResponse(201, {
      message: "note created",
      note: noteItem,
    });
  } catch (err) {
    console.error("createNote error", err);
    return sendResponse(500, { error: "internal error" });
  }
}

module.exports.handler = middy(baseHandler).use(authMiddleware());
