const middy = require("@middy/core");
const { ddb } = require("../utils/db");
const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require("../utils/auth");
const { sendResponse } = require("../utils/responses");

const NOTES_TABLE = process.env.NOTES_TABLE || "notes-notes";

async function baseHandler(event) {
  try {
    const user = event.user;

    const body = event.body ? JSON.parse(event.body) : {};
    const id = String(body.id || "").trim();

    // Basic validation, id is required
    if (!id) {
      return sendResponse(400, {
        error: "id is required to permanently delete a note",
      });
    }

    // Try to permanently delete the note in DynamoDB
    const result = await ddb.send(
      new DeleteCommand({
        TableName: NOTES_TABLE,
        Key: {
          userId: user.userId,
          id,
        },
        // Only delete if the note exists
        ConditionExpression:"attribute_exists(userId) AND attribute_exists(id)",
        ReturnValues: "ALL_OLD",
      })
    );

    const deletedNote = result.Attributes;

    return sendResponse(200, {
      message: "note permanently deleted",
      note: deletedNote,
    });
  } catch (err) {
    console.error("permanentDeleteNote error", err);

    if (err.name === "ConditionalCheckFailedException") {
      return sendResponse(404, { error: "note not found" });
    }

    return sendResponse(500, { error: "internal error" });
  }
}

module.exports.handler = middy(baseHandler).use(authMiddleware());
