const legacyServiceRequests = require("../../services/serviceRequests");

module.exports = {
  STATUS_TRANSITION_ERROR_MESSAGES: {
    invalid: "Invalid ticket status.",
    missing: "Request not found.",
    same: "Ticket is already in that status.",
  },
  TICKET_PRIORITIES: legacyServiceRequests.TICKET_PRIORITIES,
  TICKET_SOURCE_CHANNELS: legacyServiceRequests.TICKET_SOURCE_CHANNELS,
  TICKET_STATUSES: legacyServiceRequests.TICKET_STATUSES,
  TICKET_TYPES: legacyServiceRequests.TICKET_TYPES,
};
