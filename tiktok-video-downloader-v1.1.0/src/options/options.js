/**
 * TikTok Video Downloader - Options Page
 * Settings management and configuration
 * 
 * @version 1.0.0
 */

// DOM Elements
const elements = {
  showNotifications: document.getElementById('show-notifications'),
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
  showNotifications: true
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Options] Initializing...');
  
  await loadSettings();
  await checkAuthStatus();
  loadVersion();
  setupEventListeners();
  
  console.log('[Options] Initialized');
});

// Setup event listeners
function setupEventListeners() {
  elements.saveBtn?.addEventListener('click', saveSettings);
  elements.resetBtn?.addEventListener('click', resetSettings);
  elements.signOutBtn?.addEventListener('click', signOut);
  
  // Mark unsaved changes
  [elements.showNotifications].forEach(el => {
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
