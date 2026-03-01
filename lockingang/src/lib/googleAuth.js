const { google } = require("googleapis");
const { authenticate } = require("@google-cloud/local-auth");
const fs = require("fs").promises;
const path = require("path");

const SCOPES = ["https://www.googleapis.com/auth/calendar"];

const CREDENTIALS_PATH = path.join(__dirname, "../backend/calendar_logic/credentials.json");
const TOKEN_PATH = path.join(__dirname, "../backend/calendar_logic/token.json");

async function loadSavedCredentials() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch {
    return null;
  }
}

async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: "authorized_user",
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Returns an authenticated OAuth2 client.
 * Reuses token.json if it exists, otherwise opens a browser login.
 */
async function authorize() {
  let client = await loadSavedCredentials();
  if (client) return client;

  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (client.credentials) {
    await saveCredentials(client);
  }

  return client;
}

module.exports = { authorize };
