/**
 * Smart Finance Pro - Settings & Preference Manager
 */

import { getSettings, updateSettings, exportBackup, restoreBackup, resetAllData } from './storage.js';

/**
 * Initializes settings event hooks and pre-populates forms.
 * @param {Object} callbacks - Functions to trigger on settings changes (e.g., renderApp, showToast)
 */
export function initSettings(callbacks = {}) {
  const settings = getSettings();
  const themeToggle = document.getElementById('themeToggle');
  const currencySelect = document.getElementById('currencySelect');
  const resetBtn = document.getElementById('resetDataBtn');
  const exportBtn = document.getElementById('exportDataBtn');
  const importFileInput = document.getElementById('importDataFile');
  const importBtn = document.getElementById('importDataBtn');

  // Pre-populate settings UI
  if (currencySelect) {
    currencySelect.value = settings.currency || 'INR';
  }

  // Bind Currency Selector
  if (currencySelect) {
    currencySelect.addEventListener('change', (e) => {
      const newCurrency = e.target.value;
      updateSettings({ currency: newCurrency });
      if (callbacks.showToast) {
        callbacks.showToast(`Currency updated to ${newCurrency}`, 'success');
      }
      if (callbacks.renderApp) {
        callbacks.renderApp();
      }
    });
  }

  // Bind Export Button
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      try {
        const dataStr = exportBackup();
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        
        const timestamp = new Date().toISOString().split('T')[0];
        a.href = url;
        a.download = `SmartFinancePro_Backup_${timestamp}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        if (callbacks.showToast) {
          callbacks.showToast('Data backup exported successfully!', 'success');
        }
      } catch (err) {
        console.error(err);
        if (callbacks.showToast) {
          callbacks.showToast('Failed to export backup data.', 'danger');
        }
      }
    });
  }

  // Bind Import Trigger
  if (importBtn && importFileInput) {
    importBtn.addEventListener('click', () => {
      importFileInput.click();
    });

    importFileInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = function(event) {
        const result = restoreBackup(event.target.result);
        if (result.success) {
          if (callbacks.showToast) {
            callbacks.showToast('Data restored successfully! Refreshing dashboard...', 'success');
          }
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } else {
          if (callbacks.showToast) {
            callbacks.showToast(result.error || 'Failed to restore backup.', 'danger');
          }
        }
      };
      reader.readAsText(file);
      // Clear value so the same file can be uploaded again
      importFileInput.value = '';
    });
  }

  // Bind Reset Button
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (callbacks.showConfirm) {
        callbacks.showConfirm(
          'Reset All Data?',
          'Are you absolutely sure you want to delete all transactions, budgets, goals, and customized settings? This action cannot be undone. The app will reload with fresh sample data.',
          () => {
            resetAllData();
            if (callbacks.showToast) {
              callbacks.showToast('Application reset successfully!', 'success');
            }
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          }
        );
      } else {
        // Fallback standard confirm
        if (confirm('Are you sure you want to reset all data to default samples?')) {
          resetAllData();
          window.location.reload();
        }
      }
    });
  }
}

/**
 * Handles Dark/Light mode theme updates on the body tag
 * @param {string} theme - 'dark' | 'light'
 */
export function applyTheme(theme) {
  const root = document.documentElement;
  const themeToggleIcon = document.querySelector('#themeToggle i');

  if (theme === 'light') {
    root.classList.remove('dark-theme');
    root.classList.add('light-theme');
    if (themeToggleIcon) {
      themeToggleIcon.setAttribute('data-lucide', 'moon');
    }
  } else {
    root.classList.remove('light-theme');
    root.classList.add('dark-theme');
    if (themeToggleIcon) {
      themeToggleIcon.setAttribute('data-lucide', 'sun');
    }
  }
  
  if (window.lucide) {
    window.lucide.createIcons();
  }
  
  updateSettings({ theme });
}
