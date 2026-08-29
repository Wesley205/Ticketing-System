const express = require("express");
const { requireAuth } = require("../../middleware/auth");
const controller = require("./auth.controller");
const validator = require("./auth.validator");

const router = express.Router();

router.post("/register", controller.disabledRegistration);
router.post(
  "/login",
  validator.loginValidators,
  validator.handleValidation,
  controller.login,
);
router.post("/logout", requireAuth, controller.logout);
router.get("/me", requireAuth, controller.me);
router.post(
  "/password-reset/request",
  validator.passwordResetRequestValidators,
  validator.handleValidation,
  controller.requestPasswordReset,
);
router.post(
  "/password-reset/confirm",
  validator.passwordResetConfirmValidators,
  validator.handleValidation,
  controller.confirmPasswordReset,
);

module.exports = router;
