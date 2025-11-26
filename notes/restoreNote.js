const middy = require("@middy/core");
const { ddb } = require("../utils/db");
const { UpdateCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require("../utils/auth");
const { sendResponse } = require("../utils/responses");

const NOTES_TABLE = process.env.NOTES_TABLE || "notes-notes";

async function baseHandler(event) {
  try {
    const user = event.user; // Logged-in user

    const body = event.body ? JSON.parse(event.body) : {};
    const id = String(body.id || "").trim();

    // Input validation: id is required
    if (!id) {
      return sendResponse(400, {
        error: "id is required to restore a note",
      });
    }

    const now = new Date().toISOString();

    // Remove deletedAt to "undelete" the note
    const result = await ddb.send(
      new UpdateCommand({
        TableName: NOTES_TABLE,
        Key: {
          userId: user.userId,
          id,
        },
        // Remove deletedAt and update modifiedAt
        UpdateExpression: "REMOVE deletedAt SET modifiedAt = :modifiedAt",
        ExpressionAttributeValues: {
          ":modifiedAt": now,
        },
        // Only restore if the note exists and is currently soft-deleted
        ConditionExpression:"attribute_exists(userId) AND attribute_exists(id) AND attribute_exists(deletedAt)",
        ReturnValues: "ALL_NEW",
      })
    );

    const restoredNote = result.Attributes;

    return sendResponse(200, {
      message: "note restored",
      note: restoredNote,
    });
  } catch (err) {
    console.error("restoreNote error", err);

    if (err.name === "ConditionalCheckFailedException") {
      return sendResponse(404, {
        error: "note not found or not deleted",
      });
    }

    return sendResponse(500, { error: "internal error" });
  }
}

module.exports.handler = middy(baseHandler).use(authMiddleware());
