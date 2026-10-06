function buildInvitationListQuery(filters = {}) {
  const params = [];
  let where = '';

  if (filters.status) {
    params.push(filters.status);
    where = `WHERE i.status = $${params.length}`;
  }

  return { where, params };
}

async function listInvitations(executor, filters = {}) {
  const { where, params } = buildInvitationListQuery(filters);
  const result = await executor.query(
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
  return result.rows;
}

async function findUserByEmail(executor, email) {
  const result = await executor.query(
    'SELECT user_id FROM users WHERE LOWER(email) = LOWER($1)',
    [email]
  );
  return result.rows[0] || null;
}

async function findInvitationByTokenHash(executor, tokenHash) {
  const result = await executor.query(
    `SELECT i.*
     FROM invitations i
     WHERE i.token_hash = $1`,
    [tokenHash]
  );
  return result.rows[0] || null;
}

async function findInvitationById(executor, invitationId) {
  const result = await executor.query(
    `SELECT i.*
     FROM invitations i
     WHERE i.invitation_id = $1`,
    [invitationId]
  );
  return result.rows[0] || null;
}

async function markInvitationExpired(executor, invitationId) {
  await executor.query(
    `UPDATE invitations
     SET status = 'expired', updated_at = NOW()
     WHERE invitation_id = $1`,
    [invitationId]
  );
}

async function findDuplicateAcceptedUser(executor, email, username) {
  const result = await executor.query(
    'SELECT user_id FROM users WHERE LOWER(email) = LOWER($1) OR LOWER(username) = LOWER($2)',
    [email, username]
  );
  return result.rows[0] || null;
}

async function insertInvitation(client, invitationData) {
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
  return result.rows[0];
}

async function insertInvitationEmailDelivery(client, invitation, acceptanceUrl) {
  const subject = 'NSC ICT account invitation';
  const body = [
    `Hello ${invitation.full_name},`,
    '',
    'An administrator has invited you to activate your NSC ICT Service Desk account.',
    '',
    `Activation link: ${acceptanceUrl}`,
    '',
    `This invitation expires on ${new Date(invitation.expires_at).toISOString()}.`,
    '',
    'If you did not expect this invitation, contact your NSC ICT administrator.',
  ].join('\n');

  const result = await client.query(
    `INSERT INTO notification_deliveries
      (notification_id, recipient_user_id, channel, delivery_status, recipient_address, subject, body_text)
     VALUES (NULL,NULL,'email','pending',$1,$2,$3)
     RETURNING notification_delivery_id, delivery_status, recipient_address, subject, queued_at`,
    [invitation.email, subject, body]
  );

  return result.rows[0] || null;
}

async function lockInvitation(client, invitationId) {
  const result = await client.query(
    `SELECT invitation_id, status, expires_at
     FROM invitations
     WHERE invitation_id = $1
     FOR UPDATE`,
    [invitationId]
  );
  return result.rows[0] || null;
}

async function insertAcceptedUser(client, invitation, username, passwordHash, phone) {
  const result = await client.query(
    `INSERT INTO users
      (full_name, email, username, password_hash, role, user_type, department_id, phone,
       sponsor_name, supervisor_user_id, account_start_date, account_expiration_date, invitation_id)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
     RETURNING user_id, full_name, email, username, role, user_type, department_id, phone,
               sponsor_name, account_start_date, account_expiration_date, is_active, session_version, created_at`,
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
  return result.rows[0];
}

async function markInvitationAccepted(client, invitationId, acceptedUserId) {
  const result = await client.query(
    `UPDATE invitations
     SET status = 'accepted',
         accepted_user_id = $1,
         accepted_at = NOW(),
         updated_at = NOW()
     WHERE invitation_id = $2
       AND status = 'pending'
       AND accepted_at IS NULL`,
    [acceptedUserId, invitationId]
  );
  return result.rowCount === 1;
}

async function ensureNotificationPreferences(client, userId) {
  await client.query(
    `INSERT INTO notification_preferences (user_id)
     VALUES ($1)
     ON CONFLICT (user_id) DO NOTHING`,
    [userId]
  );
}

async function revokeInvitation(client, invitationId) {
  const result = await client.query(
    `UPDATE invitations
     SET status = 'revoked',
         revoked_at = NOW(),
         updated_at = NOW()
     WHERE invitation_id = $1 AND status = 'pending'
     RETURNING invitation_id, email, status`,
    [invitationId]
  );
  return result.rows[0] || null;
}

module.exports = {
  buildInvitationListQuery,
  ensureNotificationPreferences,
  findDuplicateAcceptedUser,
  findInvitationById,
  findInvitationByTokenHash,
  findUserByEmail,
  insertInvitationEmailDelivery,
  insertAcceptedUser,
  insertInvitation,
  listInvitations,
  lockInvitation,
  markInvitationAccepted,
  markInvitationExpired,
  revokeInvitation,
};
