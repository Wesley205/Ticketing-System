const UiModals = {
  open(id) {
    const node = document.getElementById(id);
    if (node) node.classList.add('open');
  },

  close(id) {
    const node = document.getElementById(id);
    if (node) node.classList.remove('open');
  },
};
