const UiFeedback = {
  clearBox(id) {
    const node = document.getElementById(id);
    if (!node) return;
    node.textContent = '';
    node.style.display = 'none';
  },

  setBox(id, message) {
    const node = document.getElementById(id);
    if (!node) return;
    if (!message) {
      this.clearBox(id);
      return;
    }
    node.textContent = message;
    node.style.display = 'block';
  },

  renderMuted(message) {
    return `<div class="muted">${escapeHtml(message)}</div>`;
  },
};
