const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { withTransaction } = require('../utils/transactions');
const { logAction } = require('../utils/audit');

const SALT_ROUNDS = 10;

function buildSession(user) {
  const token = jwt.sign(
    {
      user_id: user.user_id,
      role: user.role,
      user_type: user.user_type,
      full_name: user.full_name,
    },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '8h' }
  );

  return { token, user };
}

async function createInvitationRecord(invitationData) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `INSERT INTO invitations
        (full_name, email, preferred_username, user_type, role, department_id, sponsor_name,
         supervisor_user_id, invited_by_user_id, token_hash, account_start_date,
         account_expiration_date, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,COALESCE($11, CURRENT_DATE),$12, NOW() + ($13 || ' days')::INTERVAL)
       RETURNING invitation_id, full_name, email, preferred_username, user_type, role, department_id,
                 sponsor_name, account_start_date, account_expiration_date, expires_at, status, created_at`,
      [
        invitationData.full_name,
        invitationData.email,
        invitationData.preferred_username || null,
        invitationData.user_type,
        invitationData.role,
        invitationData.department_id || null,
        invitationData.sponsor_name || null,
        invitationData.supervisor_user_id || null,
        invitationData.invited_by_user_id,
        invitationData.token_hash,
        invitationData.account_start_date || null,
        invitationData.account_expiration_date || null,
        String(invitationData.expires_in_days),
      ]
    );

    await logAction(
      invitationData.invited_by_user_id,
      'Invitation created',
      'invitation',
      result.rows[0].invitation_id,
      `Created invitation for ${invitationData.email}`,
      client
    );

    return result.rows[0];
  });
}

async function acceptInvitationRecord(invitation, username, password, phone) {
  return withTransaction(async (client) => {
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    const createdUser = await client.query(
      `INSERT INTO users
        (full_name, email, username, password_hash, role, user_type, department_id, phone,
         sponsor_name, supervisor_user_id, account_start_date, account_expiration_date, invitation_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING user_id, full_name, email, username, role, user_type, department_id, phone,
                 sponsor_name, account_start_date, account_expiration_date, is_active, created_at`,
      [
        invitation.full_name,
        invitation.email,
        username.trim(),
        passwordHash,
        invitation.role,
        invitation.user_type,
        invitation.department_id,
        phone || null,
        invitation.sponsor_name,
        invitation.supervisor_user_id,
        invitation.account_start_date,
        invitation.account_expiration_date,
        invitation.invitation_id,
      ]
    );

    await client.query(
      `UPDATE invitations
       SET status = 'accepted',
           accepted_user_id = $1,
           accepted_at = NOW(),
           updated_at = NOW()
       WHERE invitation_id = $2`,
      [createdUser.rows[0].user_id, invitation.invitation_id]
    );

    await client.query(
      `INSERT INTO notification_preferences (user_id)
       VALUES ($1)
       ON CONFLICT (user_id) DO NOTHING`,
      [createdUser.rows[0].user_id]
    );

    await logAction(
      createdUser.rows[0].user_id,
      'Invitation accepted',
      'invitation',
      invitation.invitation_id,
      `${invitation.email} accepted an invitation`,
      client
    );

    return buildSession(createdUser.rows[0]);
  });
}

async function revokeInvitationRecord(invitationId, adminUserId) {
  return withTransaction(async (client) => {
    const result = await client.query(
      `UPDATE invitations
       SET status = 'revoked',
           revoked_at = NOW(),
           updated_at = NOW()
       WHERE invitation_id = $1 AND status = 'pending'
       RETURNING invitation_id, email, status`,
      [invitationId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    await logAction(
      adminUserId,
      'Invitation revoked',
      'invitation',
      invitationId,
      `Revoked invitation for ${result.rows[0].email}`,
      client
    );
    return result.rows[0];
  });
}

module.exports = {
  acceptInvitationRecord,
  buildSession,
  createInvitationRecord,
  revokeInvitationRecord,
};
