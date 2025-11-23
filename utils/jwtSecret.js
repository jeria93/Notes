const { SecretsManagerClient, GetSecretValueCommand } = require("@aws-sdk/client-secrets-manager");
let cached = null;

async function getJwtSecret() {
  if (cached !== null) return cached;

  const secretId =
    process.env.JWT_SECRET_ID ||
    `notes-api/${process.env.STAGE || "dev"}/JWT_SECRET`;

  const secretsClient = new SecretsManagerClient({});

  const secretResponse = await secretsClient.send(
    new GetSecretValueCommand({ SecretId: secretId })
  );

  const secret = String(secretResponse.SecretString ?? "").trim();

  if (!secret) {
    throw new Error(`Empty JWT secret for SecretId "${secretId}"`);
  }

  cached = secret;
  return cached;
}

module.exports = { getJwtSecret };
