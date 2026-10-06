async function listFloors(executor, { includeInactive = false } = {}) {
  const result = await executor.query(
    `SELECT floor_id, floor_label, sort_order, is_active, created_at
     FROM floors
     WHERE ($1::boolean = TRUE OR is_active = TRUE)
     ORDER BY sort_order, floor_label`,
    [!!includeInactive],
  );
  return result.rows;
}

module.exports = {
  listFloors,
};
