const {
  createAuthenticationError,
  createAuthorizationError,
  hasAnyPermission,
  hasPermission,
} = require("./policy");
const AppError = require("../errors/AppError");
const { ERROR_CODES } = require("../errors/errorCodes");

const DEFAULT_FORBIDDEN_MESSAGE = "You do not have permission to perform this action.";
const DEFAULT_UNAUTHENTICATED_MESSAGE = "Authentication required.";

function evaluatePolicy(policyOrPermission, user, req) {
  if (typeof policyOrPermission === "string") {
    return hasPermission(user, policyOrPermission);
  }
  if (typeof policyOrPermission === "function") {
    return policyOrPermission(user, req);
  }
  return false;
}

function deny(_res, message = DEFAULT_FORBIDDEN_MESSAGE) {
  throw createAuthorizationError(message);
}

function requirePermission(policyOrPermission, message = DEFAULT_FORBIDDEN_MESSAGE) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createAuthenticationError(DEFAULT_UNAUTHENTICATED_MESSAGE));
    }

    if (!evaluatePolicy(policyOrPermission, req.user, req)) {
      return next(createAuthorizationError(message));
    }

    return next();
  };
}

function requireAnyPermission(policiesOrPermissions, message = DEFAULT_FORBIDDEN_MESSAGE) {
  return (req, res, next) => {
    if (!req.user) {
      return next(createAuthenticationError(DEFAULT_UNAUTHENTICATED_MESSAGE));
    }

    const allowed = policiesOrPermissions.every((item) => typeof item === "string")
      ? hasAnyPermission(req.user, policiesOrPermissions)
      : policiesOrPermissions.some((item) => evaluatePolicy(item, req.user, req));

    if (!allowed) {
      return next(createAuthorizationError(message));
    }

    return next();
  };
}

function requireResourceAccess(loadResource, policyFn, options = {}) {
  const {
    attachAs = "resource",
    notFoundMessage = "Resource not found.",
    forbiddenMessage = DEFAULT_FORBIDDEN_MESSAGE,
  } = options;

  return async (req, res, next) => {
    try {
      if (!req.user) {
        return next(createAuthenticationError(DEFAULT_UNAUTHENTICATED_MESSAGE));
      }

      const resource = await loadResource(req);
      if (!resource) {
        return next(new AppError({
          code: ERROR_CODES.RESOURCE_NOT_FOUND,
          statusCode: 404,
          message: notFoundMessage,
        }));
      }
      if (!policyFn(req.user, resource, req)) {
        return next(createAuthorizationError(forbiddenMessage));
      }

      req[attachAs] = resource;
      return next();
    } catch (err) {
      return next(err);
    }
  };
}

function assertAllowed(user, policyOrPermission, message = DEFAULT_FORBIDDEN_MESSAGE) {
  if (!evaluatePolicy(policyOrPermission, user, {})) {
    throw createAuthorizationError(message);
  }
}

module.exports = {
  DEFAULT_FORBIDDEN_MESSAGE,
  DEFAULT_UNAUTHENTICATED_MESSAGE,
  assertAllowed,
  createAuthenticationError,
  createAuthorizationError,
  deny,
  requireAnyPermission,
  requirePermission,
  requireResourceAccess,
};
