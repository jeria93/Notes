const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { ddb } = require("../utils/db");
const { GetCommand } = require("@aws-sdk/lib-dynamodb");
const { getJwtSecret } = require("../utils/jwtSecret");
const { sendResponse } = require("../utils/responses");

// DynamoDB table name for users
const USERS_TABLE = process.env.USERS_TABLE || "notes-accounts";

module.exports.handler = async (event) => {
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const username = String(body.username || "").trim().toLowerCase();
    const password = String(body.password || "");

    // Basic validation, both fields are required
    if (!username || !password) {
      return sendResponse(400, {
        error: "username and password are required",
      });
    }

    // Look up user in DynamoDB by username
    const result = await ddb.send(
      new GetCommand({
        TableName: USERS_TABLE,
        Key: { username },
      })
    );

    const user = result.Item;

    // If user does not exist, return generic auth error
    if (!user) {
      return sendResponse(401, { error: "invalid username or password" });
    }

    // Compare plain password with stored bcrypt hash
    const isMatch = await bcrypt.compare(password, user.passwordHash);

    // If password is wrong, return same generic auth error
    if (!isMatch) {
      return sendResponse(401, { error: "invalid username or password" });
    }

    // Load JWT secret and expiry time
    const jwtSecret = await getJwtSecret();
    const expiresIn = process.env.JWT_EXPIRES_IN || "1h";

    // Create JWT with user id and username
    const token = jwt.sign(
      {
        sub: user.userId,
        username: user.username,
      },
      jwtSecret,
      { expiresIn: expiresIn }
    );

    // Successful login == return token and basic user info
    return sendResponse(200, {
      message: "login successful",
      token,
      user: {
        userId: user.userId,
        username: user.username,
      },
    });
  } catch (err) {
    console.error("login error", err);
    return sendResponse(500, { error: "internal error" });
  }
};
