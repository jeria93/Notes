const { sendResponse } = require("../utils/responses");

module.exports.handler = async () => {
  return sendResponse(200, {
    message: "whoami works without auth",
  });
};
