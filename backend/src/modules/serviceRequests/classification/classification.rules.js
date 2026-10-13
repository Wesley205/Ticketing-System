const RULES = Object.freeze([
  {
    id: 'security-phishing',
    signals: [['phishing', 'suspicious email', 'malware', 'virus', 'ransomware']],
    recommendation: { category: 'Security', subcategory: 'Security incident', ticket_type: 'Incident' },
    weight: 0.96,
  },
  {
    id: 'access-authentication',
    signals: [['password', 'login', 'sign in', 'signin', 'mfa', 'multi-factor', 'locked account', 'permission']],
    recommendation: { category: 'Account Access', subcategory: 'Application access', ticket_type: 'Access Request' },
    weight: 0.9,
  },
  {
    id: 'network-wifi',
    signals: [['wifi', 'wi fi', 'wi-fi', 'wireless', 'internet', 'network', 'ethernet', 'vpn']],
    recommendation: { category: 'Network', subcategory: 'Wi-Fi connection', ticket_type: 'Incident' },
    weight: 0.88,
  },
  {
    id: 'printer',
    signals: [['printer', 'printing', 'print', 'paper jam', 'toner', 'scanner']],
    recommendation: { category: 'Printing', subcategory: 'Printer offline', ticket_type: 'Incident' },
    weight: 0.86,
  },
  {
    id: 'endpoint-hardware',
    signals: [['laptop', 'desktop', 'monitor', 'keyboard', 'mouse', 'computer', 'screen']],
    recommendation: { category: 'Computer', subcategory: 'Computer problem', ticket_type: 'Incident' },
    weight: 0.78,
  },
  {
    id: 'email-software',
    signals: [['email', 'outlook', 'mailbox', 'mail', 'attachment']],
    recommendation: { category: 'Email', subcategory: 'Cannot send email', ticket_type: 'Incident' },
    weight: 0.76,
  },
  {
    id: 'telecommunications',
    signals: [['phone', 'telephone', 'extension', 'sip', 'voip', 'call']],
    recommendation: { category: 'Phone and Calls', subcategory: 'Phone not working', ticket_type: 'Incident' },
    weight: 0.76,
  },
  {
    id: 'planned-change',
    signals: [['upgrade', 'migration', 'configure', 'configuration', 'install', 'installation', 'setup']],
    recommendation: { category: 'Software', subcategory: 'Application installation', ticket_type: 'Service Request' },
    weight: 0.7,
  },
]);

module.exports = { RULES };
