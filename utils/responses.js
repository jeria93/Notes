// Small helper to build JSON responses for API Gateway

function sendResponse(statusCode, data) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  };
}

module.exports = { sendResponse };
