const { body, validationResult } = require("express-validator");
const AppError = require("../../errors/AppError");
const { ERROR_CODES } = require("../../errors/errorCodes");
const { validatePasswordStrength } = require("../../utils/authSecurity");

function validationError(errors) {
  const details = errors.array().map((error) => ({
    field: error.path || error.param || null,
    message: error.msg,
  }));

  return new AppError({
    code: ERROR_CODES.VALIDATION_ERROR,
    statusCode: 400,
    message: "The request contains invalid data.",
    details,
  });
}

function handleValidation(req, _res, next) {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(validationError(errors));
  }
  return next();
}

const loginValidators = [
  body("identifier").trim().notEmpty().withMessage("Email or username is required"),
  body("password").notEmpty().withMessage("Password is required"),
];

const passwordResetRequestValidators = [
  body("email").trim().isEmail().withMessage("A valid email is required"),
];

const passwordResetConfirmValidators = [
  body("token").trim().notEmpty().withMessage("Password reset token is required"),
  body("password").custom((value) => {
    const error = validatePasswordStrength(value);
    if (error) throw new Error(error);
    return true;
  }),
];

module.exports = {
  handleValidation,
  loginValidators,
  passwordResetConfirmValidators,
  passwordResetRequestValidators,
  validationError,
};
