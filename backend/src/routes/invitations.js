const express = require('express');
const { body, validationResult } = require('express-validator');
const pool = require('../config/db');
const { requireAuth } = require('../middleware/auth');
const { validateManagedUser } = require('../config/authPolicy');
const { canCreateInvitation, canViewAllOperationalData, canManageUsers } = require('../utils/authorization');
const {
  buildInvitationUrl,
  createInvitationToken,
  hashInvitationToken,
  validateInvitationRequest,
} = require('../utils/invitations');
const {
  acceptInvitationRecord,
  createInvitationRecord,
  revokeInvitationRecord,
} = require('../services/invitations');

const router = express.Router();
router.get('/', requireAuth, async (req, res) => {
  if (!canViewAllOperationalData(req.user)) {
    return res.status(403).json({ error: 'You do not have permission to view invitations.' });
  }

  const { status } = req.query;
  const params = [];
  let where = '';

  if (status) {
    params.push(status);
    where = `WHERE i.status = $${params.length}`;
  }

  try {
    const result = await pool.query(
      `SELECT i.invitation_id, i.full_name, i.email, i.preferred_username, i.user_type, i.role,
              i.department_id, d.name AS department_name, i.sponsor_name, i.account_start_date,
              i.account_expiration_date, i.status, i.expires_at, i.accepted_at, i.created_at,
              inviter.full_name AS invited_by_name, accepted.full_name AS accepted_user_name
       FROM invitations i
       LEFT JOIN departments d ON d.department_id = i.department_id
       LEFT JOIN users inviter ON inviter.user_id = i.invited_by_user_id
       LEFT JOIN users accepted ON accepted.user_id = i.accepted_user_id
       ${where}
       ORDER BY i.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to load invitations.' });
  }
});

router.post(
  '/',
  requireAuth,
  [
    body('full_name').trim().notEmpty().withMessage('Full name is required'),
    body('email').trim().isEmail().withMessage('A valid email is required'),
    body('role').isIn(['admin', 'ict_officer', 'technician', 'staff']).withMessage('Invalid role'),
    body('user_type').isIn(['employee', 'intern', 'corper', 'contractor', 'guest']).withMessage('Invalid user type'),
    body('department_id').optional({ nullable: true }).isInt().withMessage('Invalid department'),
  ],
  async (req, res) => {
    if (!canCreateInvitation(req.user)) {
      return res.status(403).json({ error: 'Only administrators may create invitations.' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const invitationError = validateInvitationRequest(req.body) || validateManagedUser(req.body);
    if (invitationError) {
      return res.status(400).json({ error: invitationError });
    }

    const {
      full_name,
      email,
      preferred_username,
      role,
      user_type,
      department_id,
      sponsor_name,
      supervisor_user_id,
      account_start_date,
      account_expiration_date,
      expires_in_days,
    } = req.body;

    const normalizedEmail = email.trim().toLowerCase();
    const rawToken = createInvitationToken();
    const tokenHash = hashInvitationToken(rawToken);
    const expiresInDays = Math.max(Number(expires_in_days) || 7, 1);

    try {
      const existing = await pool.query(
        'SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)',
        [normalizedEmail]
      );
      if (existing.rows.length > 0) {
        return res.status(409).json({ error: 'A user with that email address already exists.' });
      }

      const invitation = await createInvitationRecord({
        full_name,
        email: normalizedEmail,
        preferred_username,
        role,
        user_type,
        department_id,
        sponsor_name,
        supervisor_user_id,
        invited_by_user_id: req.user.user_id,
        token_hash: tokenHash,
        account_start_date,
        account_expiration_date,
        expires_in_days: expiresInDays,
      });

      res.status(201).json({
        ...invitation,
        acceptance_url: buildInvitationUrl(rawToken),
      });
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to create invitation.' });
    }
  }
);

router.post(
  '/accept',
  [
    body('token').trim().notEmpty().withMessage('Invitation token is required'),
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('phone').optional({ nullable: true }).trim(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array()[0].msg });
    }

    const tokenHash = hashInvitationToken(req.body.token);

    try {
      const invitationResult = await pool.query(
        `SELECT i.*
         FROM invitations i
         WHERE i.token_hash = $1`,
        [tokenHash]
      );

      if (invitationResult.rows.length === 0) {
        return res.status(404).json({ error: 'Invitation not found.' });
      }

      const invitation = invitationResult.rows[0];

      if (invitation.status !== 'pending') {
        return res.status(409).json({ error: 'This invitation is no longer active.' });
      }

      if (new Date(invitation.expires_at) < new Date()) {
        await pool.query(
          `UPDATE invitations
           SET status = 'expired', updated_at = NOW()
           WHERE invitation_id = $1`,
          [invitation.invitation_id]
        );
        return res.status(410).json({ error: 'This invitation has expired.' });
      }

      const duplicateUser = await pool.query(
        'SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)',
        [invitation.email, req.body.username]
      );
      if (duplicateUser.rows.length > 0) {
        return res.status(409).json({ error: 'That email address or username is already in use.' });
      }

      const session = await acceptInvitationRecord(
        invitation,
        req.body.username,
        req.body.password,
        req.body.phone
      );

      res.status(201).json(session);
    } catch (err) {
      console.error(err);
      res.status(500).json({ error: 'Failed to accept invitation.' });
    }
  }
);

router.post('/:id/revoke', requireAuth, async (req, res) => {
  if (!canManageUsers(req.user)) {
    return res.status(403).json({ error: 'Only administrators may revoke invitations.' });
  }

  try {
    const result = await revokeInvitationRecord(req.params.id, req.user.user_id);

    if (!result) {
      return res.status(404).json({ error: 'Pending invitation not found.' });
    }
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to revoke invitation.' });
  }
});

module.exports = router;
