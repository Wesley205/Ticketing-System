const USER_TYPES = ['employee', 'intern', 'corper', 'contractor', 'guest'];
const TEMPORARY_USER_TYPES = ['intern', 'corper', 'contractor', 'guest'];
const ROLES = ['admin', 'ict_officer', 'technician', 'staff'];

function getOrganizationEmailDomains() {
  const raw = process.env.ORGANIZATION_EMAIL_DOMAINS || process.env.ORG_EMAIL_DOMAINS || 'nscict.local';
  return raw
    .split(',')
    .map((domain) => domain.trim().toLowerCase())
    .filter(Boolean);
}

function isOrganizationEmail(email) {
  if (!email || !email.includes('@')) return false;
  const domain = email.split('@').pop().toLowerCase();
  return getOrganizationEmailDomains().includes(domain);
}

function isTemporaryUser(userType) {
  return TEMPORARY_USER_TYPES.includes(String(userType || '').toLowerCase());
}

function normalizeUserType(userType) {
  return String(userType || 'employee').trim().toLowerCase();
}

function validateManagedUser(details) {
  const userType = normalizeUserType(details.user_type);
  const email = String(details.email || '').trim().toLowerCase();
  const sponsorName = String(details.sponsor_name || '').trim();
  const accountStartDate = details.account_start_date || null;
  const accountExpirationDate = details.account_expiration_date || null;

  if (!USER_TYPES.includes(userType)) {
    return 'Invalid user type.';
  }

  if (details.role && !ROLES.includes(details.role)) {
    return 'Invalid role.';
  }

  if (userType === 'employee' && !isOrganizationEmail(email)) {
    return `Employee accounts must use an approved organization email domain: ${getOrganizationEmailDomains().join(', ')}`;
  }

  if (isTemporaryUser(userType)) {
    if (!sponsorName) {
      return 'Temporary users require a sponsor or supervisor.';
    }
    if (!accountExpirationDate) {
      return 'Temporary users require an account expiration date.';
    }
  }

  if (accountStartDate && accountExpirationDate && accountStartDate > accountExpirationDate) {
    return 'Account expiration date cannot be earlier than the account start date.';
  }

  return null;
}

function isConfiguredForSecureAccess() {
  return Boolean(getOrganizationEmailDomains().length);
}

function isStrongJwtSecret(secret) {
  return typeof secret === 'string' && secret.length >= 32 && !/replace_this|change_this/i.test(secret);
}

module.exports = {
  ROLES,
  TEMPORARY_USER_TYPES,
  USER_TYPES,
  getOrganizationEmailDomains,
  isConfiguredForSecureAccess,
  isOrganizationEmail,
  isStrongJwtSecret,
  isTemporaryUser,
  normalizeUserType,
  validateManagedUser,
};
