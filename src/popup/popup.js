// TikTok Video Downloader - Popup Script
// Modern UI with stats tracking and activity feed

// DOM Elements
const elements = {
  authSection: document.getElementById('auth-section'),
  mainSection: document.getElementById('main-section'),
  loadingOverlay: document.getElementById('loading-overlay'),
  signInBtn: document.getElementById('sign-in-btn'),
  signOutBtn: document.getElementById('sign-out-btn'),
  statusText: document.getElementById('status-text'),
  downloadCurrentBtn: document.getElementById('download-current-btn'),
  openDriveBtn: document.getElementById('open-drive-btn'),
  openSheetsBtn: document.getElementById('open-sheets-btn'),
  progressSection: document.getElementById('progress-section'),
  progressStatus: document.getElementById('progress-status'),
  progressBar: document.getElementById('progress-bar'),
  progressPercentage: document.getElementById('progress-percentage'),
  progressSize: document.getElementById('progress-size'),
  cancelBtn: document.getElementById('cancel-btn'),
  totalDownloads: document.getElementById('total-downloads'),
  totalUploads: document.getElementById('total-uploads'),
  clearStatsBtn: document.getElementById('clear-stats-btn'),
  activityList: document.getElementById('activity-list'),
  loadingText: document.getElementById('loading-text')
};

// State
const state = {
  isAuthenticated: false,
  currentTab: null,
  currentDownloadId: null
};

// Initialize popup
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Popup] Initializing...');
  
  // Get current tab
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  state.currentTab = tabs[0];
  
  // Check auth and initialize
  await checkAuth();
  setupEventListeners();
  
  console.log('[Popup] Initialized');
});

// Setup event listeners
function setupEventListeners() {
  elements.signInBtn?.addEventListener('click', handleSignIn);
  elements.signOutBtn?.addEventListener('click', handleSignOut);
  elements.downloadCurrentBtn?.addEventListener('click', handleDownload);
  elements.openDriveBtn?.addEventListener('click', openDrive);
  elements.openSheetsBtn?.addEventListener('click', openSheets);
  elements.clearStatsBtn?.addEventListener('click', clearStats);
  elements.cancelBtn?.addEventListener('click', cancelDownload);
  
  // Settings button
  document.getElementById('open-settings-btn')?.addEventListener('click', openSettings);
  
  // Listen for progress updates
  chrome.runtime.onMessage.addListener(handleProgressMessage);
}

// Check authentication status
async function checkAuth() {
  showLoading('Checking authentication...');
  
  try {
    const result = await sendMessage({ type: 'GET_AUTH_STATUS' });
    state.isAuthenticated = result.authenticated;
    
    if (state.isAuthenticated) {
      showMainSection();
      await loadStats();
      await loadRecentActivity();
      updateDownloadButton();
    } else {
      showAuthSection();
    }
  } catch (error) {
    console.error('[Popup] Auth check failed:', error);
    showAuthSection();
  }
  
  hideLoading();
}

// Handle sign in
async function handleSignIn() {
  console.log('[Popup] Sign in clicked');
  showLoading('Signing in with Google...');
  
  try {
    const result = await sendMessage({ type: 'AUTHENTICATE' });
    
    if (result.success) {
      state.isAuthenticated = true;
      showMainSection();
      await loadStats();
      updateDownloadButton();
      showStatus('Signed in successfully', 'success');
    } else {
      showStatus('Sign in failed: ' + (result.error || 'Unknown error'), 'error');
    }
  } catch (error) {
    console.error('[Popup] Sign in error:', error);
    showStatus('Sign in failed: ' + error.message, 'error');
  }
  
  hideLoading();
}

// Handle sign out
async function handleSignOut() {
  showLoading('Signing out...');
  
  try {
    await sendMessage({ type: 'SIGN_OUT' });
    state.isAuthenticated = false;
    showAuthSection();
    showStatus('Signed out', 'info');
  } catch (error) {
    console.error('[Popup] Sign out failed:', error);
    showStatus('Sign out failed', 'error');
  }
  
  hideLoading();
}

// Handle download
async function handleDownload() {
  if (!state.currentTab) {
    showStatus('No active tab', 'error');
    return;
  }
  
  const url = state.currentTab.url;
  if (!url?.includes('tiktok.com')) {
    showStatus('Not a TikTok page', 'error');
    return;
  }
  
  elements.downloadCurrentBtn.disabled = true;
  showProgress('Detecting video...');
  
  try {
    // Get video info from content script
    const videoInfo = await chrome.tabs.sendMessage(state.currentTab.id, {
      type: 'GET_VIDEO_INFO'
    });
    
    if (!videoInfo?.success || !videoInfo?.videoData) {
      showStatus('No video found on this page', 'error');
      hideProgress();
      elements.downloadCurrentBtn.disabled = false;
      return;
    }
    
    showProgress('Starting download...');
    
    // Start download
    const result = await sendMessage({
      type: 'START_DOWNLOAD',
      videoData: videoInfo.videoData
    });
    
    if (result.success) {
      showStatus('Download complete!', 'success');
      await loadStats();
      await loadRecentActivity();
      
      // Copy link to clipboard if available
      if (result.driveLink) {
        try {
          await navigator.clipboard.writeText(result.driveLink);
          showStatus('Link copied to clipboard!', 'success');
        } catch (e) {
          // Clipboard access may be denied
        }
      }
    } else {
      showStatus('Download failed: ' + result.error, 'error');
    }
  } catch (error) {
    console.error('[Popup] Download failed:', error);
    showStatus('Download failed - make sure you are on a video page', 'error');
  }
  
  hideProgress();
  elements.downloadCurrentBtn.disabled = false;
}

// Update download button state
function updateDownloadButton() {
  if (state.currentTab) {
    const isTikTok = state.currentTab.url?.includes('tiktok.com');
    elements.downloadCurrentBtn.disabled = !isTikTok;
    elements.downloadCurrentBtn.title = isTikTok 
      ? 'Download video from current tab' 
      : 'Navigate to TikTok to download videos';
  }
}

// Open Google Drive folder
async function openDrive() {
  try {
    const result = await chrome.storage.local.get('driveFolderId');
    const folderId = result.driveFolderId;
    if (folderId) {
      chrome.tabs.create({ url: `https://drive.google.com/drive/folders/${folderId}` });
    } else {
      chrome.tabs.create({ url: 'https://drive.google.com' });
    }
  } catch {
    chrome.tabs.create({ url: 'https://drive.google.com' });
  }
}

// Open Google Sheets log
async function openSheets() {
  try {
    const result = await chrome.storage.local.get('sheetId');
    const sheetId = result.sheetId;
    if (sheetId) {
      chrome.tabs.create({ url: `https://docs.google.com/spreadsheets/d/${sheetId}` });
    } else {
      chrome.tabs.create({ url: 'https://sheets.google.com' });
    }
  } catch {
    chrome.tabs.create({ url: 'https://sheets.google.com' });
  }
}

// Open Settings page
function openSettings() {
  chrome.runtime.openOptionsPage();
}

// Clear stats
async function clearStats() {
  try {
    await chrome.storage.local.set({ 
      stats: { totalDownloads: 0, totalUploads: 0 } 
    });
    elements.totalDownloads.textContent = '0';
    elements.totalUploads.textContent = '0';
  } catch (error) {
    console.error('[Popup] Clear stats failed:', error);
  }
}

// Cancel download
function cancelDownload() {
  if (state.currentDownloadId) {
    sendMessage({ 
      type: 'CANCEL_DOWNLOAD', 
      downloadId: state.currentDownloadId 
    });
    hideProgress();
    showStatus('Download cancelled', 'info');
    state.currentDownloadId = null;
  }
}

// Handle progress messages
function handleProgressMessage(message) {
  if (message.type === 'DOWNLOAD_PROGRESS') {
    const { percent, message: statusMsg } = message;
    state.currentDownloadId = message.downloadId;
    
    elements.progressSection?.classList.remove('hidden');
    elements.progressStatus.textContent = statusMsg || 'Processing...';
    elements.progressBar.style.width = `${percent}%`;
    elements.progressPercentage.textContent = `${Math.round(percent)}%`;
    
    if (message.loaded && message.total) {
      elements.progressSize.textContent = `${formatBytes(message.loaded)} / ${formatBytes(message.total)}`;
    }
    
    if (percent >= 100) {
      setTimeout(() => {
        hideProgress();
        state.currentDownloadId = null;
        loadStats();
        loadRecentActivity();
      }, 1500);
    }
  }
  return false;
}

// Load stats
async function loadStats() {
  try {
    const result = await chrome.storage.local.get('stats');
    const stats = result.stats || { totalDownloads: 0, totalUploads: 0 };
    elements.totalDownloads.textContent = stats.totalDownloads || 0;
    elements.totalUploads.textContent = stats.totalUploads || 0;
  } catch (error) {
    console.error('[Popup] Load stats failed:', error);
  }
}

// Load recent activity
async function loadRecentActivity() {
  if (!elements.activityList) return;
  
  try {
    const result = await sendMessage({ type: 'GET_RECENT_ACTIVITY' });
    
    if (result.success && result.recentActivity?.length > 0) {
      const html = result.recentActivity.map(item => {
        const timeAgo = formatTimeAgo(item.timestamp);
        const icon = '';
        const username = item.username ? `@${item.username}` : 'Unknown';
        
        return `
          <div class="activity-item">
            <span class="activity-icon">${icon}</span>
            <div class="activity-details">
              <span class="activity-username">${username}</span>
              <span class="activity-time">${timeAgo}</span>
            </div>
          </div>
        `;
      }).join('');
      
      elements.activityList.innerHTML = html;
    } else {
      elements.activityList.innerHTML = '<p class="empty-state">No downloads yet</p>';
    }
  } catch (error) {
    console.error('[Popup] Load activity failed:', error);
    elements.activityList.innerHTML = '<p class="empty-state">No downloads yet</p>';
  }
}

// UI Helpers
function showAuthSection() {
  elements.authSection?.classList.remove('hidden');
  elements.mainSection?.classList.add('hidden');
}

function showMainSection() {
  elements.authSection?.classList.add('hidden');
  elements.mainSection?.classList.remove('hidden');
}

function showLoading(text = 'Loading...') {
  if (elements.loadingText) elements.loadingText.textContent = text;
  elements.loadingOverlay?.classList.remove('hidden');
}

function hideLoading() {
  elements.loadingOverlay?.classList.add('hidden');
}

function showProgress(status) {
  elements.progressSection?.classList.remove('hidden');
  elements.progressStatus.textContent = status;
  elements.progressBar.style.width = '0%';
  elements.progressPercentage.textContent = '0%';
  elements.progressSize.textContent = '';
}

function hideProgress() {
  elements.progressSection?.classList.add('hidden');
  elements.progressBar.style.width = '0%';
  elements.progressPercentage.textContent = '0%';
  elements.progressSize.textContent = '';
}

function showStatus(text, type = 'info') {
  if (elements.statusText) {
    elements.statusText.textContent = text;
    elements.statusText.className = `status-text ${type}`;
    
    setTimeout(() => {
      elements.statusText.textContent = 'Ready';
      elements.statusText.className = 'status-text';
    }, 3000);
  }
}

// Utility functions
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

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function formatTimeAgo(timestamp) {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)}d ago`;
  return new Date(timestamp).toLocaleDateString();
}

