const middy = require("@middy/core");
const { ddb } = require("../utils/db");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require("../utils/auth");
const { sendResponse } = require("../utils/responses");

const NOTES_TABLE = process.env.NOTES_TABLE || "notes-notes";

async function baseHandler(event) {
  try {
    const user = event.user;

    const body = event.body ? JSON.parse(event.body) : {};
    const id = String(body.id || "").trim();
    const title = String(body.title || "").trim();
    const text = String(body.text || "").trim();

    // Basic validation: id, title and text must be present
    if (!id || !title || !text) {
      return sendResponse(400, {
        error: "id, title and text are required",
      });
    }

    // Check title length (max 50 characters)
    if (title.length > 50) {
      return sendResponse(400, {
        error: "title must be at most 50 characters",
      });
    }

    // Check text length (max 300 characters)
    if (text.length > 300) {
      return sendResponse(400, {
        error: "text must be at most 300 characters",
      });
    }

    // New timestamp for when the note is updated
    const now = new Date().toISOString();

    // Try to update the note in DynamoDB
    const result = await ddb.send(
      new UpdateCommand({
        TableName: NOTES_TABLE,
        Key: {
          userId: user.userId,
          id,
        },
        UpdateExpression:"SET #title = :title, #text = :text, #modifiedAt = :modifiedAt",
        ExpressionAttributeNames: {
          "#title": "title",
          "#text": "text",
          "#modifiedAt": "modifiedAt",
        },
        // Actual values we want to write
        ExpressionAttributeValues: {
          ":title": title,
          ":text": text,
          ":modifiedAt": now,
        },
        ConditionExpression:"attribute_exists(userId) AND attribute_exists(id)",
        ReturnValues: "ALL_NEW",
      })
    );

    const updatedNote = result.Attributes;

    return sendResponse(200, {
      message: "note updated",
      note: updatedNote,
    });
  } catch (err) {
    console.error("updateNote error", err);

    if (err.name === "ConditionalCheckFailedException") {
      // Note did not exist for this user/id
      return sendResponse(404, { error: "note not found" });
    }

    return sendResponse(500, { error: "internal error" });
  }
}

// Protect handler with auth middleware
module.exports.handler = middy(baseHandler).use(authMiddleware());
