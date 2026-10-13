const CATEGORY_DEFINITIONS = Object.freeze({
  'Account Access': Object.freeze([
    'Password reset',
    'MFA problem',
    'Account locked',
    'Permission request',
    'New account',
    'Application access',
  ]),
  Computer: Object.freeze([
    'Will not start',
    'Computer problem',
    'Slow computer',
    'Blank screen',
    'Keyboard or mouse',
    'Monitor problem',
    'Camera or microphone',
    'Battery or charging',
    'Storage space',
  ]),
  Network: Object.freeze([
    'Wi-Fi connection',
    'Network cable',
    'Internet unavailable',
    'VPN connection',
    'Slow connection',
    'Network outage',
  ]),
  Printing: Object.freeze([
    'Printer offline',
    'Print queue',
    'Paper jam',
    'Toner or ink',
    'Scanner problem',
    'Printer setup',
  ]),
  Software: Object.freeze([
    'Application not working',
    'Application installation',
    'Application update',
    'Application configuration',
    'Browser problem',
    'File synchronization',
  ]),
  Email: Object.freeze([
    'Cannot send email',
    'Cannot receive email',
    'Mailbox problem',
    'Calendar problem',
    'Email attachment',
    'Email account setup',
  ]),
  Security: Object.freeze([
    'Suspicious email',
    'Phishing report',
    'Malware warning',
    'Suspicious login',
    'Lost or stolen device',
    'Security incident',
  ]),
  'Phone and Calls': Object.freeze([
    'Phone not working',
    'Cannot make calls',
    'Cannot receive calls',
    'Extension problem',
    'VoIP problem',
    'Headset problem',
  ]),
  Other: Object.freeze([
    'General ICT help',
    'ICT equipment request',
    'Unclear issue',
  ]),
});

const CLASSIFICATION_CATEGORIES = Object.freeze(Object.keys(CATEGORY_DEFINITIONS));
const LEGACY_CATEGORY_ALIASES = Object.freeze({
  Printer: 'Printing',
  Internet: 'Network',
  Hardware: 'Computer',
  Access: 'Account Access',
  Infrastructure: 'Network',
  Telecommunications: 'Phone and Calls',
});

function isValidClassification(category, subcategory) {
  const canonicalCategory = LEGACY_CATEGORY_ALIASES[category] || category;
  return CLASSIFICATION_CATEGORIES.includes(canonicalCategory)
    && (!subcategory || CATEGORY_DEFINITIONS[canonicalCategory].includes(subcategory));
}

module.exports = {
  CATEGORY_DEFINITIONS,
  CLASSIFICATION_CATEGORIES,
  LEGACY_CATEGORY_ALIASES,
  isValidClassification,
};
