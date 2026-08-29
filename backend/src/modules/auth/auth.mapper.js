const { buildFrontendAccessProfile } = require("../../utils/authorization");

function sanitizeUser(user) {
  if (!user) return null;
  const {
    password_hash,
    token_hash,
    reset_token_hash,
    ...safeUser
  } = user;
  return safeUser;
}

function withFrontendAccessProfile(user) {
  const safeUser = sanitizeUser(user);
  return {
    ...safeUser,
    access_profile: buildFrontendAccessProfile(safeUser),
  };
}

function mapSession(user, token) {
  return {
    token,
    user: withFrontendAccessProfile(user),
  };
}

module.exports = {
  mapSession,
  sanitizeUser,
  withFrontendAccessProfile,
};
