const middy = require("@middy/core");
const { ddb } = require("../utils/db");
const { DeleteCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require("../utils/auth");
const { sendResponse } = require("../utils/responses");

const NOTES_TABLE = process.env.NOTES_TABLE || "notes-notes";

async function baseHandler(event) {
  try {
    // Logged-in user, set by authMiddleware
    const user = event.user;

    const body = event.body ? JSON.parse(event.body) : {};

    // We expect the note id to delete
    const id = String(body.id || "").trim();

    // Basic validation: id is required
    if (!id) {
      return sendResponse(400, {
        error: "id is required to delete a note",
      });
    }

    // Try to delete the note in DynamoDB
    const result = await ddb.send(
      new DeleteCommand({
        TableName: NOTES_TABLE,
        Key: {
          userId: user.userId,
          id,
        },
        // Only delete if this note actually exists
        ConditionExpression:"attribute_exists(userId) AND attribute_exists(id)",
        ReturnValues: "ALL_OLD",
      })
    );

    // result.Attributes contains the deleted note (if the delete succeeded)
    const deletedNote = result.Attributes;

    // Return success with some info about the deleted note
    return sendResponse(200, {
      message: "note deleted",
      note: deletedNote,
    });
  } catch (err) {
    console.error("deleteNote error", err);

    // If the condition failed, the note did not exist for this user/id
    if (err.name === "ConditionalCheckFailedException") {
      return sendResponse(404, { error: "note not found" });
    }

    // Any other error = internal server error
    return sendResponse(500, { error: "internal error" });
  }
}

// Protect this handler so only logged-in users can delete notes
module.exports.handler = middy(baseHandler).use(authMiddleware());