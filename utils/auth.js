const jwt = require("jsonwebtoken");
const { getJwtSecret } = require("./jwtSecret");

// Small helper to build HTTP errors that http-error-handler understands
function httpError(httpStatus, message) {
  const error = new Error(message);
  error.statusCode = httpStatus;
  return error;
}

// Verify a Bearer token and return user info
async function requireAuthFromHeader(headers = {}) {
  const authorizationHeader = (
    headers.authorization ||
    headers.Authorization ||
    ""
  ).trim();

  let token = "";
  const match = /^Bearer\s+(.+)$/i.exec(authorizationHeader);
  token = match ? match[1].trim() : authorizationHeader;

  if (!token) {
    throw httpError(401, "Missing Authorization token");
  }

  try {
    const jwtSecret = await getJwtSecret();
    const decodedToken = jwt.verify(token, jwtSecret);

    if (!decodedToken?.sub || !decodedToken?.username) {
      throw httpError(401, "Invalid token claims");
    }

    return {
      userId: String(decodedToken.sub),
      username: String(decodedToken.username),
    };
  } catch (error) {
    if (error.name === "TokenExpiredError") {
      throw httpError(401, "Token expired");
    }
    throw httpError(401, "Invalid token");
  }
}

// Middy-middleware som körs före handlern, verifierar JWT från headers
// och lägger den inloggade användaren på request.event.user
const authMiddleware = () => ({
  before: async (request) => {
    const user = await requireAuthFromHeader(request.event.headers);
    request.event.user = user;
  },
});

module.exports = { authMiddleware, requireAuthFromHeader };
