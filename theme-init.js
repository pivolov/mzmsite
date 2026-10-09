'use strict';

// Read before CSS loads to avoid a light flash when dark is selected.
try {
  if (localStorage.getItem('mzm-theme') === 'dark') {
    document.documentElement.dataset.theme = 'dark';
  }
} catch { /* The default light theme also works without storage. */ }
