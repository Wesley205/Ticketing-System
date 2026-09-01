const UiBadges = {
  renderBadge(label, className = '') {
    const classes = ['badge', className].filter(Boolean).join(' ');
    return `<span class="${classes}">${escapeHtml(label || '-')}</span>`;
  },

  renderStatus(value) {
    return `<span class="badge ${statusClass(value)}">${escapeHtml(value || '-')}</span>`;
  },

  renderPriority(value) {
    return `<span class="badge priority-${escapeHtml(value || 'Medium')}">${escapeHtml(value || '-')}</span>`;
  },
};
