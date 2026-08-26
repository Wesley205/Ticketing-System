const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../config/db");
const { requireAuth } = require("../middleware/auth");
const { buildFrontendAccessProfile } = require("../utils/authorization");
const { logAction } = require("../utils/audit");

const router = express.Router();

function issueToken(user) {
  return jwt.sign(
    {
      user_id: user.user_id,
      role: user.role,
      user_type: user.user_type,
      full_name: user.full_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || "8h" },
  );
}

// Helper to check account status consistently across all endpoints
function checkAccountStatus(user) {
  if (!user.is_active) {
    return {
      valid: false,
      message: "This account is inactive. Contact an administrator.",
    };
  }

  const today = new Date().toISOString().slice(0, 10);

  const startDate = user.account_start_date
    ? new Date(user.account_start_date).toISOString().slice(0, 10)
    : null;

  if (startDate && startDate > today) {
    return { valid: false, message: "This account is not yet active." };
  }

  const expirationDate = user.account_expiration_date
    ? new Date(user.account_expiration_date).toISOString().slice(0, 10)
    : null;

  if (expirationDate && expirationDate < today) {
    return {
      valid: false,
      expired: true,
      message: "This temporary account has expired. Contact an administrator.",
    };
  }

  return { valid: true };
}

function withFrontendAccessProfile(user) {
  const status = checkAccountStatus(user);

  // Force user object properties to stay in sync with date logic
  const normalizedUser = {
    ...user,
    is_active: status.valid,
  };

  return {
    ...normalizedUser,
    access_profile: buildFrontendAccessProfile(normalizedUser),
  };
}

router.post("/register", (req, res) => {
  res.status(403).json({
    error:
      "Public registration has been disabled. Contact an administrator for an invitation or approved account setup.",
  });
});

router.post(
  "/login",
  [
    body("identifier")
      .trim()
      .notEmpty()
      .withMessage("Email or username is required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const { identifier, password } = req.body;

    try {
      const result = await pool.query(
        "SELECT * FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($1)",
        [identifier],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      const user = result.rows[0];

      // Validate account status
      const status = checkAccountStatus(user);
      if (!status.valid) {
        if (status.expired) {
          await pool.query(
            `UPDATE users
             SET is_active = FALSE,
                 deactivated_at = COALESCE(deactivated_at, NOW()),
                 deactivation_reason = COALESCE(deactivation_reason, 'Temporary account expired')
             WHERE user_id = $1`,
            [user.user_id],
          );
          await logAction(
            user.user_id,
            "Login blocked - expired account",
            "user",
            user.user_id,
            `${user.full_name} attempted to log in after account expiry`,
          );
        }
        return res.status(403).json({ error: status.message });
      }

      const match = await bcrypt.compare(password, user.password_hash);
      if (!match) {
        return res.status(401).json({ error: "Invalid credentials." });
      }

      await pool.query(
        "UPDATE users SET last_login_at = NOW() WHERE user_id = $1",
        [user.user_id],
      );

      const token = issueToken(user);

      await logAction(
        user.user_id,
        "User logged in",
        "user",
        user.user_id,
        `${user.full_name} logged in`,
      );

      delete user.password_hash;
      res.json({ token, user: withFrontendAccessProfile(user) });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Login failed. Please try again." });
    }
  },
);

router.get("/me", requireAuth, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.user_id, u.full_name, u.email, u.username, u.role, u.user_type, u.phone,
              u.is_active, u.created_at, u.last_login_at, u.account_start_date, u.account_expiration_date,
              u.sponsor_name, u.department_id, d.name AS department_name
       FROM users u
       LEFT JOIN departments d ON d.department_id = u.department_id
       WHERE u.user_id = $1`,
      [req.user.user_id],
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "User not found." });
    }

    const user = result.rows[0];
    const status = checkAccountStatus(user);

    if (!status.valid) {
      return res.status(403).json({ error: status.message });
    }

    res.json(withFrontendAccessProfile(user));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load profile." });
  }
});

module.exports = router;
