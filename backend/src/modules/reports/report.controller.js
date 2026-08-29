const service = require('./report.service');
const {
  REPORT_ERROR_MESSAGES,
  TICKET_CATEGORIES,
  TICKET_TYPES,
} = require('./report.constants');

function sendError(res, err, status, message) {
  console.error(err);
  return res.status(status).json({ error: err.message || message });
}

async function filters(req, res) {
  try {
    const data = await service.getReportFilters();
    return res.json({
      ...data,
      ticket_categories: TICKET_CATEGORIES,
      ticket_types: TICKET_TYPES,
    });
  } catch (err) {
    return sendError(res, err, 500, REPORT_ERROR_MESSAGES.filtersFailed);
  }
}

async function summary(req, res) {
  try {
    return res.json(await service.getReportSummary(req.query));
  } catch (err) {
    return sendError(res, err, 400, REPORT_ERROR_MESSAGES.summaryFailed);
  }
}

async function tickets(req, res) {
  try {
    return res.json(await service.getTicketReportRows(req.query));
  } catch (err) {
    return sendError(res, err, 400, REPORT_ERROR_MESSAGES.ticketRowsFailed);
  }
}

async function assets(req, res) {
  try {
    return res.json(await service.getAssetReportRows(req.query));
  } catch (err) {
    return sendError(res, err, 400, REPORT_ERROR_MESSAGES.assetRowsFailed);
  }
}

async function maintenance(req, res) {
  try {
    return res.json(await service.getMaintenanceReportRows(req.query));
  } catch (err) {
    return sendError(res, err, 400, REPORT_ERROR_MESSAGES.maintenanceRowsFailed);
  }
}

async function exportAssetsCsv(req, res) {
  try {
    const csv = await service.exportAssetsCsv(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="assets_report.csv"');
    return res.send(csv);
  } catch (err) {
    return sendError(res, err, 400, REPORT_ERROR_MESSAGES.assetCsvFailed);
  }
}

async function exportServiceRequestsCsv(req, res) {
  try {
    const csv = await service.exportServiceRequestsCsv(req.query);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="service_requests_report.csv"');
    return res.send(csv);
  } catch (err) {
    return sendError(res, err, 400, REPORT_ERROR_MESSAGES.requestCsvFailed);
  }
}

module.exports = {
  assets,
  exportAssetsCsv,
  exportServiceRequestsCsv,
  filters,
  maintenance,
  summary,
  tickets,
};
