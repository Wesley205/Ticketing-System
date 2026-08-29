function mapTicketRow(row) {
  return row || null;
}

function mapTicketList(rows) {
  return rows.map(mapTicketRow);
}

function attachPermissions(ticket, permissions) {
  if (!ticket) return null;
  return {
    ...ticket,
    permissions,
  };
}

module.exports = {
  attachPermissions,
  mapTicketList,
  mapTicketRow,
};
