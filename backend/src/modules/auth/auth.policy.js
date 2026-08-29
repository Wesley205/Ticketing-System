function currentDateIso() {
  return new Date().toISOString().slice(0, 10);
}

function formatDateToIso(dateVal) {
  if (!dateVal) return null;
  return new Date(dateVal).toISOString().slice(0, 10);
}

function checkAccountStatus(user, nowIso = currentDateIso()) {
  if (!user) {
    return { valid: false, reason: "missing", statusCode: 401, message: "Account not found. Please log in again." };
  }

  if (user.account_status === "suspended") {
    return { valid: false, reason: "suspended", statusCode: 403, message: "This account is suspended. Contact an administrator." };
  }

  if (user.account_status === "deactivated" || !user.is_active) {
    return { valid: false, reason: "deactivated", statusCode: 401, message: "This account is inactive. Please log in with an active account." };
  }

  const startDate = formatDateToIso(user.account_start_date);
  if (startDate && startDate > nowIso) {
    return { valid: false, reason: "not_started", statusCode: 403, message: "This account is not yet active." };
  }

  const expirationDate = formatDateToIso(user.account_expiration_date);
  if (expirationDate && expirationDate < nowIso) {
    return { valid: false, reason: "expired", expired: true, statusCode: 403, message: "This temporary account has expired. Contact an administrator." };
  }

  return { valid: true };
}

module.exports = {
  checkAccountStatus,
  currentDateIso,
  formatDateToIso,
};
