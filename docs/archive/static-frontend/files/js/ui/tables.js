const UiTables = {
  renderBody(bodyId, emptyId, rowsHtml, emptyMessage) {
    const body = document.getElementById(bodyId);
    const empty = document.getElementById(emptyId);
    if (body) body.innerHTML = rowsHtml;
    if (empty) empty.style.display = rowsHtml ? 'none' : 'block';
    if (empty && !rowsHtml && emptyMessage) empty.textContent = emptyMessage;
  },
};
