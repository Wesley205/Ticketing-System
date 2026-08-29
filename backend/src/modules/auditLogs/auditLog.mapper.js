function mapAuditLogRow(row) {
  return row || null;
}

function mapAuditLogRows(rows) {
  return (rows || []).map(mapAuditLogRow);
}

module.exports = {
  mapAuditLogRow,
  mapAuditLogRows,
};
