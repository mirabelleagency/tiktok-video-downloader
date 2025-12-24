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
  version: document.getElementById('version'),
  // Custom folder elements
  useCustomFolder: document.getElementById('use-custom-folder'),
  customFolderSettings: document.getElementById('custom-folder-settings'),
  customFolderId: document.getElementById('custom-folder-id'),
  customFolderName: document.getElementById('custom-folder-name'),
  testFolderAccess: document.getElementById('test-folder-access'),
  folderStatus: document.getElementById('folder-status'),
  folderIdHelp: document.getElementById('folder-id-help'),
  folderHelpModal: document.getElementById('folder-help-modal'),
  closeFolderModal: document.getElementById('close-folder-modal'),
  // Custom spreadsheet elements
  useCustomSpreadsheet: document.getElementById('use-custom-spreadsheet'),
  customSpreadsheetSettings: document.getElementById('custom-spreadsheet-settings'),
  customSpreadsheetId: document.getElementById('custom-spreadsheet-id'),
  testSpreadsheetAccess: document.getElementById('test-spreadsheet-access'),
  spreadsheetStatus: document.getElementById('spreadsheet-status'),
  spreadsheetIdHelp: document.getElementById('spreadsheet-id-help'),
  spreadsheetHelpModal: document.getElementById('spreadsheet-help-modal'),
  closeSpreadsheetModal: document.getElementById('close-spreadsheet-modal')
};

// Default settings
const defaultSettings = {
  driveFolderName: 'TikTok Downloads',
  sheetsName: 'TikTok Download Log',
  showNotifications: true,
  // Custom folder settings
  useCustomFolderId: false,
  customDriveFolderId: '',
  customFolderName: '',
  // Custom spreadsheet settings
  useCustomSpreadsheetId: false,
  customSpreadsheetId: ''
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
  
  // Custom folder event listeners
  elements.useCustomFolder?.addEventListener('change', toggleCustomFolder);
  elements.testFolderAccess?.addEventListener('click', testFolderAccess);
  elements.folderIdHelp?.addEventListener('click', (e) => {
    e.preventDefault();
    elements.folderHelpModal?.classList.remove('hidden');
  });
  elements.closeFolderModal?.addEventListener('click', () => {
    elements.folderHelpModal?.classList.add('hidden');
  });
  
  // Custom spreadsheet event listeners
  elements.useCustomSpreadsheet?.addEventListener('change', toggleCustomSpreadsheet);
  elements.testSpreadsheetAccess?.addEventListener('click', testSpreadsheetAccess);
  elements.spreadsheetIdHelp?.addEventListener('click', (e) => {
    e.preventDefault();
    elements.spreadsheetHelpModal?.classList.remove('hidden');
  });
  elements.closeSpreadsheetModal?.addEventListener('click', () => {
    elements.spreadsheetHelpModal?.classList.add('hidden');
  });
  
  // Close modals when clicking outside
  elements.folderHelpModal?.addEventListener('click', (e) => {
    if (e.target === elements.folderHelpModal) {
      elements.folderHelpModal.classList.add('hidden');
    }
  });
  elements.spreadsheetHelpModal?.addEventListener('click', (e) => {
    if (e.target === elements.spreadsheetHelpModal) {
      elements.spreadsheetHelpModal.classList.add('hidden');
    }
  });
  
  // Mark unsaved changes
  [elements.driveFolder, elements.sheetsName, elements.showNotifications,
   elements.useCustomFolder, elements.customFolderId, elements.customFolderName,
   elements.useCustomSpreadsheet, elements.customSpreadsheetId].forEach(el => {
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
    
    // Load custom folder settings
    if (elements.useCustomFolder) {
      elements.useCustomFolder.checked = currentSettings.useCustomFolderId ?? false;
      toggleCustomFolder();
    }
    if (elements.customFolderId) {
      elements.customFolderId.value = currentSettings.customDriveFolderId || '';
    }
    if (elements.customFolderName) {
      elements.customFolderName.value = currentSettings.customFolderName || '';
    }
    
    // Load custom spreadsheet settings
    if (elements.useCustomSpreadsheet) {
      elements.useCustomSpreadsheet.checked = currentSettings.useCustomSpreadsheetId ?? false;
      toggleCustomSpreadsheet();
    }
    if (elements.customSpreadsheetId) {
      elements.customSpreadsheetId.value = currentSettings.customSpreadsheetId || '';
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
      showNotifications: elements.showNotifications?.checked ?? defaultSettings.showNotifications,
      // Custom folder settings
      useCustomFolderId: elements.useCustomFolder?.checked ?? false,
      customDriveFolderId: elements.customFolderId?.value || '',
      customFolderName: elements.customFolderName?.value || '',
      // Custom spreadsheet settings
      useCustomSpreadsheetId: elements.useCustomSpreadsheet?.checked ?? false,
      customSpreadsheetId: elements.customSpreadsheetId?.value || ''
    };
    
    await chrome.storage.local.set({ settings });
    
    // Notify service worker of settings change
    await sendMessage({ action: 'settingsUpdated', data: settings });
    
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

// Toggle custom folder settings visibility
function toggleCustomFolder() {
  if (elements.customFolderSettings) {
    elements.customFolderSettings.style.display = elements.useCustomFolder?.checked ? 'block' : 'none';
  }
  // Clear status when toggling
  if (elements.folderStatus) {
    elements.folderStatus.className = 'folder-status';
    elements.folderStatus.textContent = '';
  }
}

// Toggle custom spreadsheet settings visibility
function toggleCustomSpreadsheet() {
  if (elements.customSpreadsheetSettings) {
    elements.customSpreadsheetSettings.style.display = elements.useCustomSpreadsheet?.checked ? 'block' : 'none';
  }
  // Clear status when toggling
  if (elements.spreadsheetStatus) {
    elements.spreadsheetStatus.className = 'folder-status';
    elements.spreadsheetStatus.textContent = '';
  }
}

// Test folder access
async function testFolderAccess() {
  const folderId = elements.customFolderId?.value?.trim();
  
  if (!folderId) {
    showToast('Please enter a folder ID', 'error');
    return;
  }
  
  if (elements.folderStatus) {
    elements.folderStatus.className = 'folder-status checking';
    elements.folderStatus.textContent = '⏳ Checking folder access...';
  }
  
  if (elements.testFolderAccess) {
    elements.testFolderAccess.disabled = true;
  }
  
  try {
    const response = await sendMessage({
      action: 'validateFolder',
      data: { folderId }
    });
    
    if (response.success) {
      if (elements.folderStatus) {
        elements.folderStatus.className = 'folder-status valid';
        elements.folderStatus.textContent = `✅ Valid - "${response.folderName}" - You have write access`;
      }
      // Auto-fill display name if empty
      if (elements.customFolderName && !elements.customFolderName.value && response.folderName) {
        elements.customFolderName.value = response.folderName;
      }
      showToast('Folder access verified', 'success');
    } else {
      if (elements.folderStatus) {
        elements.folderStatus.className = 'folder-status invalid';
        elements.folderStatus.textContent = `❌ ${response.error || 'Access denied or folder not found'}`;
      }
      showToast(response.error || 'Folder access denied', 'error');
    }
  } catch (error) {
    console.error('[Options] Folder validation error:', error);
    if (elements.folderStatus) {
      elements.folderStatus.className = 'folder-status invalid';
      elements.folderStatus.textContent = `❌ Error: ${error.message}`;
    }
    showToast('Failed to validate folder', 'error');
  } finally {
    if (elements.testFolderAccess) {
      elements.testFolderAccess.disabled = false;
    }
  }
}

// Test spreadsheet access
async function testSpreadsheetAccess() {
  const spreadsheetId = elements.customSpreadsheetId?.value?.trim();
  
  if (!spreadsheetId) {
    showToast('Please enter a spreadsheet ID', 'error');
    return;
  }
  
  if (elements.spreadsheetStatus) {
    elements.spreadsheetStatus.className = 'folder-status checking';
    elements.spreadsheetStatus.textContent = '⏳ Checking spreadsheet access...';
  }
  
  if (elements.testSpreadsheetAccess) {
    elements.testSpreadsheetAccess.disabled = true;
  }
  
  try {
    const response = await sendMessage({
      action: 'validateSheet',
      data: { sheetId: spreadsheetId }
    });
    
    if (response.success) {
      if (elements.spreadsheetStatus) {
        elements.spreadsheetStatus.className = 'folder-status valid';
        elements.spreadsheetStatus.textContent = `✅ Valid - "${response.title}" - You have write access`;
      }
      showToast('Spreadsheet access verified', 'success');
    } else {
      if (elements.spreadsheetStatus) {
        elements.spreadsheetStatus.className = 'folder-status invalid';
        elements.spreadsheetStatus.textContent = `❌ ${response.error || 'Access denied or spreadsheet not found'}`;
      }
      showToast(response.error || 'Spreadsheet access denied', 'error');
    }
  } catch (error) {
    console.error('[Options] Spreadsheet validation error:', error);
    if (elements.spreadsheetStatus) {
      elements.spreadsheetStatus.className = 'folder-status invalid';
      elements.spreadsheetStatus.textContent = `❌ Error: ${error.message}`;
    }
    showToast('Failed to validate spreadsheet', 'error');
  } finally {
    if (elements.testSpreadsheetAccess) {
      elements.testSpreadsheetAccess.disabled = false;
    }
  }
}
