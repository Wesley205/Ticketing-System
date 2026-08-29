const DEPARTMENT_ERROR_MESSAGES = Object.freeze({
  createDuplicate: 'A department with that name already exists.',
  createFailed: 'Failed to create department.',
  detailForbidden: 'You do not have permission to view this department.',
  detailFailed: 'Failed to load department.',
  listFailed: 'Failed to load departments.',
  notFound: 'Department not found.',
  updateFailed: 'Failed to update department.',
});

module.exports = {
  DEPARTMENT_ERROR_MESSAGES,
};
