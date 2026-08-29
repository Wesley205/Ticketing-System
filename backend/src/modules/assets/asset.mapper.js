function mapAssetRow(row) {
  return row || null;
}

function mapAssetDetail({ asset, maintenanceHistory = [], assignmentHistory = [], statusHistory = [], linkedTickets = [] }) {
  return {
    ...asset,
    maintenance_history: maintenanceHistory,
    assignment_history: assignmentHistory,
    status_history: statusHistory,
    linked_tickets: linkedTickets,
  };
}

module.exports = {
  mapAssetDetail,
  mapAssetRow,
};
