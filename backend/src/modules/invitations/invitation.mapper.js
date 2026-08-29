function mapInvitationRow(row) {
  return row || null;
}

function mapInvitationRows(rows) {
  return (rows || []).map(mapInvitationRow);
}

function mapSession(user, token) {
  return { token, user };
}

module.exports = {
  mapInvitationRow,
  mapInvitationRows,
  mapSession,
};
