const middy = require("@middy/core");
const { ddb } = require("../utils/db");
const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { authMiddleware } = require("../utils/auth");
const { sendResponse } = require("../utils/responses");

const NOTES_TABLE = process.env.NOTES_TABLE || "notes-notes";

async function baseHandler(event) {
  try {
    const user = event.user; 

    // Read all notes for this userId
    const result = await ddb.send(
      new QueryCommand({
        TableName: NOTES_TABLE,
        KeyConditionExpression: "userId = :uid",
        ExpressionAttributeValues: { ":uid": user.userId },
        // Do not return notes that are soft-deleted
        FilterExpression: "attribute_not_exists(deletedAt)",
      })
    );

    const notes = result.Items || [];

    // Return all non-deleted notes for this user
    return sendResponse(200, { notes });
  } catch (err) {
    console.error("getNotes error", err);
    return sendResponse(500, { error: "internal error" });
  }
}

module.exports.handler = middy(baseHandler).use(authMiddleware());