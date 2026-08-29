const test = require("node:test");
const assert = require("node:assert/strict");

const constants = require("./serviceRequest.constants");
const mapper = require("./serviceRequest.mapper");
const policy = require("./serviceRequest.policy");
const repository = require("./serviceRequest.repository");
const router = require("./serviceRequest.routes");
const service = require("./serviceRequest.service");

test("service request module exposes the expected ticket constants", () => {
  assert.ok(constants.TICKET_TYPES.includes("Incident"));
  assert.ok(constants.TICKET_TYPES.includes("Change Request"));
  assert.ok(constants.TICKET_STATUSES.includes("Reopened"));
  assert.ok(constants.TICKET_STATUSES.includes("Cancelled"));
});

test("service request mapper preserves rows and attaches computed permissions", () => {
  const row = { request_id: 1, ticket_number: "NSC-2026-00001" };
  assert.deepEqual(mapper.mapTicketRow(row), row);
  assert.deepEqual(mapper.mapTicketList([row]), [row]);
  assert.deepEqual(mapper.attachPermissions(row, { can_assign: true }), {
    ...row,
    permissions: { can_assign: true },
  });
});

test("service request policy builds record-level permissions", () => {
  const technician = {
    user_id: 4,
    role: "technician",
    user_type: "employee",
    is_active: true,
    account_status: "active",
  };
  const ticket = {
    requester_id: 9,
    assigned_technician_id: 4,
    status: "Assigned",
  };

  const permissions = policy.buildTicketPermissions(technician, ticket, ["Accepted"]);
  assert.equal(permissions.can_add_comment, true);
  assert.equal(permissions.can_add_internal_note, true);
  assert.equal(permissions.can_view_internal_artifacts, true);
  assert.equal(permissions.can_assign, false);
  assert.deepEqual(permissions.allowed_status_transitions, ["Accepted"]);
});

test("service request repository builds scoped list queries without executing SQL", async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql, params });
      return { rows: [{ request_id: 7 }] };
    },
  };

  const rows = await repository.listServiceRequests(
    client,
    { user_id: 3, role: "technician", user_type: "employee", is_active: true, account_status: "active" },
    { status: "Assigned", mine: "false" },
  );

  assert.deepEqual(rows, [{ request_id: 7 }]);
  assert.match(calls[0].sql, /assigned_technician_id = \$1/);
  assert.match(calls[0].sql, /sr.status = \$2/);
  assert.deepEqual(calls[0].params, [3, "Assigned"]);
});

test("service request service keeps legacy workflow helpers available", () => {
  assert.equal(service.buildTicketNumber(42, new Date("2026-08-24T10:00:00Z")), "NSC-2026-00042");
  assert.equal(typeof service.createTicket, "function");
  assert.equal(typeof service.assignTicket, "function");
  assert.equal(typeof service.updateStatus, "function");
});

test("service request router composes route middleware in the module", () => {
  assert.equal(typeof router, "function");
  assert.ok(router.stack.length >= 10);
});
