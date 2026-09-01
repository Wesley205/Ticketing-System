function renderWhenPermitted(permissionKey, html) {
  return hasPermission(permissionKey) ? html : '';
}

function isActionAllowed(permissionKey, predicate = true) {
  return hasPermission(permissionKey) && Boolean(predicate);
}
