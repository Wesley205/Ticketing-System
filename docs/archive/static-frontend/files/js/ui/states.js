const UiStates = {
  empty(message) {
    return renderPageState('empty', 'Nothing to show', message);
  },

  loading(message = 'Loading...') {
    return renderPageState('loading', 'Loading', message);
  },

  error(message) {
    return renderPageState('error', 'Something went wrong', message);
  },
};
