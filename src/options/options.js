/**
 * TikTok Video Downloader - Options Page
 * Settings management and configuration
 * 
 * @version 1.0.0
 */

// DOM Elements
const elements = {
  driveFolder: document.getElementById('drive-folder'),
  sheetsName: document.getElementById('sheets-name'),
  showNotifications: document.getElementById('show-notifications'),
  spreadsheetSelect: document.getElementById('spreadsheet-select'),
  refreshSpreadsheets: document.getElementById('refresh-spreadsheets'),
  currentSheetInfo: document.getElementById('current-sheet-info'),
  accountInfo: document.getElementById('account-info'),
  signOutBtn: document.getElementById('sign-out-btn'),
  saveBtn: document.getElementById('save-btn'),
  resetBtn: document.getElementById('reset-btn'),
  toast: document.getElementById('toast'),
  toastMessage: document.getElementById('toast-message'),
  version: document.getElementById('version')
};

// Default settings
const defaultSettings = {
  driveFolderName: 'TikTok Downloads',
  sheetsName: 'TikTok Download Log',
  showNotifications: true
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Options] Initializing...');
  
  await loadSettings();
  await checkAuthStatus();
  await loadCurrentSpreadsheet();
  loadVersion();
  setupEventListeners();
  
  console.log('[Options] Initialized');
});

// Setup event listeners
function setupEventListeners() {
  elements.saveBtn?.addEventListener('click', saveSettings);
  elements.resetBtn?.addEventListener('click', resetSettings);
  elements.signOutBtn?.addEventListener('click', signOut);
  elements.refreshSpreadsheets?.addEventListener('click', loadSpreadsheets);
  elements.spreadsheetSelect?.addEventListener('change', selectSpreadsheet);
  
  // Mark unsaved changes
  [elements.driveFolder, elements.sheetsName, elements.showNotifications].forEach(el => {
    el?.addEventListener('change', () => {
      elements.saveBtn.textContent = 'Save Settings*';
    });
  });
}

// Load settings from storage
async function loadSettings() {
  try {
    const { settings } = await chrome.storage.local.get('settings');
    const currentSettings = settings || defaultSettings;
    
    if (elements.driveFolder) {
      elements.driveFolder.value = currentSettings.driveFolderName || defaultSettings.driveFolderName;
    }
    if (elements.sheetsName) {
      elements.sheetsName.value = currentSettings.sheetsName || defaultSettings.sheetsName;
    }
    if (elements.showNotifications) {
      elements.showNotifications.checked = currentSettings.showNotifications ?? defaultSettings.showNotifications;
    }
    
    console.log('[Options] Settings loaded');
  } catch (error) {
    console.error('[Options] Failed to load settings:', error);
    showToast('Failed to load settings', 'error');
  }
}

// Save settings to storage
async function saveSettings() {
  try {
    const settings = {
      driveFolderName: elements.driveFolder?.value || defaultSettings.driveFolderName,
      sheetsName: elements.sheetsName?.value || defaultSettings.sheetsName,
      showNotifications: elements.showNotifications?.checked ?? defaultSettings.showNotifications
    };
    
    await chrome.storage.local.set({ settings });
    elements.saveBtn.textContent = 'Save Settings';
    showToast('Settings saved successfully', 'success');
    console.log('[Options] Settings saved');
  } catch (error) {
    console.error('[Options] Failed to save settings:', error);
    showToast('Failed to save settings', 'error');
  }
}

// Reset settings to defaults
async function resetSettings() {
  if (!confirm('Are you sure you want to reset all settings to defaults?')) {
    return;
  }
  
  try {
    await chrome.storage.local.set({ settings: defaultSettings });
    await loadSettings();
    showToast('Settings reset to defaults', 'success');
    console.log('[Options] Settings reset');
  } catch (error) {
    console.error('[Options] Failed to reset settings:', error);
    showToast('Failed to reset settings', 'error');
  }
}

// Check authentication status
async function checkAuthStatus() {
  try {
    const response = await sendMessage({ action: 'checkAuth' });
    
    if (response.authenticated) {
      elements.accountInfo.innerHTML = `
        <p class="signed-in">✓ Signed in with Google</p>
      `;
      elements.signOutBtn.style.display = 'inline-flex';
    } else {
      elements.accountInfo.innerHTML = `
        <p class="not-signed-in">Not signed in</p>
        <p class="help-text">Sign in through the extension popup to enable downloads</p>
      `;
      elements.signOutBtn.style.display = 'none';
    }
  } catch (error) {
    console.error('[Options] Failed to check auth:', error);
  }
}

// Sign out
async function signOut() {
  if (!confirm('Are you sure you want to sign out?')) {
    return;
  }
  
  try {
    await sendMessage({ action: 'logout' });
    await checkAuthStatus();
    showToast('Signed out successfully', 'success');
  } catch (error) {
    console.error('[Options] Sign out failed:', error);
    showToast('Failed to sign out', 'error');
  }
}

// Load current spreadsheet info
async function loadCurrentSpreadsheet() {
  try {
    const { sheetId, sheetName } = await chrome.storage.local.get(['sheetId', 'sheetName']);
    
    if (sheetId) {
      updateCurrentSheetDisplay(sheetName || sheetId);
    }
  } catch (error) {
    console.error('[Options] Failed to load current spreadsheet:', error);
  }
}

// Update current spreadsheet display
function updateCurrentSheetDisplay(name) {
  if (elements.currentSheetInfo) {
    elements.currentSheetInfo.innerHTML = `
      <span class="sheet-name">${name}</span>
      <span class="sheet-status">✓ Active</span>
    `;
  }
}

// Load available spreadsheets
async function loadSpreadsheets() {
  if (!elements.spreadsheetSelect || !elements.refreshSpreadsheets) return;
  
  try {
    elements.spreadsheetSelect.disabled = true;
    elements.refreshSpreadsheets.disabled = true;
    elements.spreadsheetSelect.innerHTML = '<option value="">Loading...</option>';
    
    const response = await sendMessage({ action: 'listSpreadsheets' });
    
    if (response.success && response.spreadsheets) {
      let options = '<option value="">-- Select a spreadsheet --</option>';
      
      for (const sheet of response.spreadsheets) {
        const date = new Date(sheet.modifiedTime).toLocaleDateString();
        options += `<option value="${sheet.id}">${sheet.name} (${date})</option>`;
      }
      
      elements.spreadsheetSelect.innerHTML = options;
      elements.spreadsheetSelect.disabled = false;
      showToast(`Found ${response.spreadsheets.length} spreadsheets`, 'success');
    } else {
      elements.spreadsheetSelect.innerHTML = '<option value="">No spreadsheets found</option>';
      showToast('No spreadsheets found', 'info');
    }
  } catch (error) {
    console.error('[Options] Failed to load spreadsheets:', error);
    elements.spreadsheetSelect.innerHTML = '<option value="">Error loading</option>';
    showToast('Failed to load spreadsheets', 'error');
  } finally {
    elements.refreshSpreadsheets.disabled = false;
  }
}

// Select a spreadsheet
async function selectSpreadsheet() {
  const spreadsheetId = elements.spreadsheetSelect?.value;
  if (!spreadsheetId) return;
  
  try {
    elements.spreadsheetSelect.disabled = true;
    showToast('Setting target spreadsheet...', 'info');
    
    const response = await sendMessage({
      action: 'setTargetSpreadsheet',
      data: { spreadsheetId }
    });
    
    if (response.success) {
      await chrome.storage.local.set({
        sheetId: spreadsheetId,
        sheetName: response.title
      });
      updateCurrentSheetDisplay(response.title);
      showToast(`Spreadsheet set: ${response.title}`, 'success');
    } else {
      showToast(`Failed: ${response.error}`, 'error');
    }
  } catch (error) {
    console.error('[Options] Failed to set spreadsheet:', error);
    showToast('Failed to set spreadsheet', 'error');
  } finally {
    elements.spreadsheetSelect.disabled = false;
    elements.spreadsheetSelect.value = '';
  }
}

// Load version from manifest
function loadVersion() {
  try {
    const manifest = chrome.runtime.getManifest();
    if (elements.version) {
      elements.version.textContent = manifest.version;
    }
  } catch (error) {
    console.error('[Options] Failed to load version:', error);
  }
}

// Show toast notification
function showToast(message, type = 'info') {
  if (!elements.toast || !elements.toastMessage) return;
  
  elements.toastMessage.textContent = message;
  elements.toast.className = `toast ${type}`;
  elements.toast.classList.remove('hidden');
  
  setTimeout(() => {
    elements.toast.classList.add('hidden');
  }, 3000);
}

// Send message to service worker
function sendMessage(message) {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
      } else {
        resolve(response);
      }
    });
  });
}
