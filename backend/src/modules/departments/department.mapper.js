function mapDepartmentRow(row) {
  if (!row) return null;
  return {
    ...row,
    staff_count: row.staff_count === undefined ? row.staff_count : Number(row.staff_count),
    asset_count: row.asset_count === undefined ? row.asset_count : Number(row.asset_count),
    request_count: row.request_count === undefined ? row.request_count : Number(row.request_count),
  };
}

function mapDepartmentDetail({ department, staff = [], assets = [], serviceRequests = [] }) {
  return {
    ...department,
    staff,
    assets,
    service_requests: serviceRequests,
  };
}

module.exports = {
  mapDepartmentDetail,
  mapDepartmentRow,
};
