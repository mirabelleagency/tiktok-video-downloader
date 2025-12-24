// TikTok Video Downloader - Service Worker
// Handles OAuth, Google Drive uploads, and Google Sheets logging

import { 
  GOOGLE_APIS, 
  STORAGE_KEYS, 
  CONFIG, 
  MESSAGE_TYPES 
} from '../utils/constants.js';

import {
  isValidVideoUrl,
  sanitizeUsername,
  sanitizeVideoId,
  isValidFileSize
} from '../utils/validation.js';

// State management
let authToken = null;
let driveFolderId = null;
let sheetId = null;

// Initialize on service worker startup
chrome.runtime.onInstalled.addListener(async () => {
  console.log('TikTok Video Downloader extension installed');
  await loadStoredData();
});

chrome.runtime.onStartup.addListener(async () => {
  await loadStoredData();
});

// Load stored authentication data
async function loadStoredData() {
  const data = await chrome.storage.local.get([
    STORAGE_KEYS.AUTH_TOKEN,
    STORAGE_KEYS.DRIVE_FOLDER_ID,
    STORAGE_KEYS.SHEET_ID
  ]);
  
  authToken = data[STORAGE_KEYS.AUTH_TOKEN] || null;
  driveFolderId = data[STORAGE_KEYS.DRIVE_FOLDER_ID] || null;
  sheetId = data[STORAGE_KEYS.SHEET_ID] || null;
}

// Message listener for popup and content script communication
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  handleMessage(message, sender).then(sendResponse);
  return true; // Keep message channel open for async response
});

async function handleMessage(message, sender) {
  // Get tabId from sender or find active TikTok tab
  let tabId = sender.tab?.id;
  if (!tabId) {
    // Message from popup - find active TikTok tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs[0] && tabs[0].url?.includes('tiktok.com')) {
      tabId = tabs[0].id;
    }
  }
  console.log('[SW] Handling message:', message.type || message.action, 'tabId:', tabId);
  
  // Support both 'type' (popup) and 'action' (options) message formats
  const messageType = message.type || message.action;
  
  switch (messageType) {
    case MESSAGE_TYPES.AUTHENTICATE:
      return await authenticate();
    
    case MESSAGE_TYPES.SIGN_OUT:
      return await signOut();
    
    case MESSAGE_TYPES.GET_AUTH_STATUS:
      return await getAuthStatus();
    
    case MESSAGE_TYPES.START_DOWNLOAD:
      return await downloadVideo(message.videoData, tabId);
    
    case MESSAGE_TYPES.GET_RECENT_ACTIVITY:
      return await getRecentActivity();
    
    case MESSAGE_TYPES.GET_VIDEO_INFO:
      return await getVideoInfoFromTab(tabId);
    
    case 'checkAuth':
      return await getAuthStatus();
    
    case 'logout':
      return await signOut();
    
    case 'listSpreadsheets':
      return await listSpreadsheets();
    
    case 'setTargetSpreadsheet':
      return await setTargetSpreadsheet(message.data);
    
    case 'validateFolder':
      return await validateFolder(message.data);
    
    case 'validateSheet':
      return await validateSheet(message.data);
    
    case 'settingsUpdated':
      return await handleSettingsUpdate(message.data);
    
    default:
      console.log('[SW] Unknown message type:', messageType);
      return { success: false, error: 'Unknown message type' };
  }
}

// ============ AUTHENTICATION ============

async function authenticate() {
  try {
    console.log('[SW] Starting authentication...');
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          reject(new Error(chrome.runtime.lastError.message));
        } else {
          resolve(token);
        }
      });
    });
    
    console.log('[SW] Token obtained:', token ? 'Yes' : 'No');
    authToken = token;
    await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: token });
    
    // Ensure Drive folder and Sheet exist
    await ensureDriveFolder();
    await ensureSheet();
    
    // Try to get user info (optional - may fail if scope not granted)
    let userInfo = null;
    try {
      userInfo = await getUserInfo(token);
      await chrome.storage.local.set({ [STORAGE_KEYS.USER_INFO]: userInfo });
    } catch (e) {
      console.log('[SW] Could not get user info (optional):', e.message);
      // Use placeholder
      userInfo = { email: 'Connected', picture: '' };
    }
    
    console.log('[SW] Authentication successful');
    return { 
      success: true, 
      userInfo,
      message: 'Successfully connected to Google Drive' 
    };
  } catch (error) {
    console.error('[SW] Authentication error:', error);
    return { success: false, error: error.message };
  }
}

async function signOut() {
  try {
    if (authToken) {
      await new Promise((resolve) => {
        chrome.identity.removeCachedAuthToken({ token: authToken }, resolve);
      });
    }
    
    authToken = null;
    await chrome.storage.local.remove([
      STORAGE_KEYS.AUTH_TOKEN,
      STORAGE_KEYS.USER_INFO
    ]);
    
    return { success: true, message: 'Signed out successfully' };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function getAuthStatus() {
  try {
    if (!authToken) {
      await loadStoredData();
    }
    
    if (!authToken) {
      console.log('[SW] No auth token found');
      return { authenticated: false };
    }
    
    // Try to verify token by making a simple API call
    try {
      const response = await fetch('https://www.googleapis.com/drive/v3/about?fields=user', {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('[SW] Auth verified, user:', data.user?.emailAddress);
        return { 
          authenticated: true, 
          userInfo: { 
            email: data.user?.emailAddress || 'Connected',
            picture: data.user?.photoLink || ''
          }
        };
      } else {
        throw new Error('Token invalid');
      }
    } catch (e) {
      // Token is invalid, try to get a fresh one silently
      console.log('[SW] Token check failed, trying silent refresh...');
      try {
        const newToken = await new Promise((resolve, reject) => {
          chrome.identity.getAuthToken({ interactive: false }, (token) => {
            if (chrome.runtime.lastError || !token) {
              reject(new Error('No token'));
            } else {
              resolve(token);
            }
          });
        });
        
        authToken = newToken;
        await chrome.storage.local.set({ [STORAGE_KEYS.AUTH_TOKEN]: newToken });
        return { authenticated: true, userInfo: { email: 'Connected', picture: '' } };
      } catch (refreshError) {
        // Clear invalid token
        authToken = null;
        await chrome.storage.local.remove([STORAGE_KEYS.AUTH_TOKEN]);
        return { authenticated: false };
      }
    }
  } catch (error) {
    console.error('[SW] getAuthStatus error:', error);
    return { authenticated: false };
  }
}

async function getUserInfo(token) {
  const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: { Authorization: `Bearer ${token}` }
  });
  
  if (!response.ok) {
    throw new Error('Failed to get user info');
  }
  
  return await response.json();
}

// ============ GOOGLE DRIVE ============

// Load custom settings
async function loadCustomSettings() {
  const { settings } = await chrome.storage.local.get('settings');
  return settings || {};
}

async function ensureDriveFolder() {
  console.log('[SW] ensureDriveFolder called');
  
  // Check if custom folder is enabled
  const settings = await loadCustomSettings();
  console.log('[SW] Settings:', JSON.stringify(settings));
  
  if (settings.useCustomFolderId && settings.customDriveFolderId) {
    console.log('[SW] Using custom folder ID:', settings.customDriveFolderId);
    // Validate custom folder still exists and is accessible
    try {
      const response = await fetch(
        `${GOOGLE_APIS.DRIVE_FILES}/${settings.customDriveFolderId}?fields=id,name,trashed&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      console.log('[SW] Custom folder check response:', response.status);
      
      if (response.ok) {
        const folder = await response.json();
        console.log('[SW] Custom folder details:', folder.name, 'trashed:', folder.trashed);
        if (!folder.trashed) {
          driveFolderId = settings.customDriveFolderId;
          console.log('[SW] Using custom folder:', folder.name, 'ID:', driveFolderId);
          return driveFolderId;
        }
      } else {
        const errorText = await response.text();
        console.warn('[SW] Custom folder check failed:', response.status, errorText);
      }
      // Custom folder not accessible, fall back to default
      console.warn('[SW] Custom folder not accessible, falling back to default');
    } catch (e) {
      console.warn('[SW] Custom folder validation failed, falling back to default:', e.message);
    }
  }
  
  // Default behavior - use or create standard folder
  if (driveFolderId) {
    // Verify folder still exists
    try {
      const response = await fetch(
        `${GOOGLE_APIS.DRIVE_FILES}/${driveFolderId}?fields=id,name,trashed&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      if (response.ok) {
        const folder = await response.json();
        if (!folder.trashed) {
          return driveFolderId;
        }
      }
    } catch (e) {
      // Folder doesn't exist, create new one
    }
  }
  
  // Search for existing folder
  const searchResponse = await fetch(
    `${GOOGLE_APIS.DRIVE_FILES}?q=name='${CONFIG.DRIVE_FOLDER_NAME}' and mimeType='application/vnd.google-apps.folder' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  if (searchResponse.ok) {
    const result = await searchResponse.json();
    if (result.files && result.files.length > 0) {
      driveFolderId = result.files[0].id;
      await chrome.storage.local.set({ [STORAGE_KEYS.DRIVE_FOLDER_ID]: driveFolderId });
      return driveFolderId;
    }
  }
  
  // Create new folder
  const createResponse = await fetch(GOOGLE_APIS.DRIVE_FILES, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      name: CONFIG.DRIVE_FOLDER_NAME,
      mimeType: 'application/vnd.google-apps.folder'
    })
  });
  
  if (!createResponse.ok) {
    throw new Error('Failed to create Drive folder');
  }
  
  const folder = await createResponse.json();
  driveFolderId = folder.id;
  await chrome.storage.local.set({ [STORAGE_KEYS.DRIVE_FOLDER_ID]: driveFolderId });
  
  return driveFolderId;
}

async function uploadToDrive(videoData, videoBlob, _onProgress) {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const fileName = `tiktok_@${videoData.username}_${videoData.videoId}_${timestamp}.mp4`;
  
  const metadata = {
    name: fileName,
    parents: [driveFolderId]
  };
  
  // Create multipart upload
  const boundary = '-------TikTokDownloaderBoundary';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;
  
  const metadataString = JSON.stringify(metadata);
  
  // Build multipart body
  const bodyParts = [
    delimiter,
    'Content-Type: application/json; charset=UTF-8\r\n\r\n',
    metadataString,
    delimiter,
    'Content-Type: video/mp4\r\n\r\n'
  ];
  
  const bodyStart = new Blob(bodyParts, { type: 'text/plain' });
  const bodyEnd = new Blob([closeDelimiter], { type: 'text/plain' });
  const body = new Blob([bodyStart, videoBlob, bodyEnd]);
  
  const response = await fetch(
    `${GOOGLE_APIS.DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,webViewLink,webContentLink&supportsAllDrives=true`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    }
  );
  
  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Drive upload failed: ${error}`);
  }
  
  const file = await response.json();
  
  // Make file viewable by anyone with link
  await fetch(`${GOOGLE_APIS.DRIVE_FILES}/${file.id}/permissions?supportsAllDrives=true`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      role: 'reader',
      type: 'anyone'
    })
  });
  
  return {
    fileId: file.id,
    fileName: file.name,
    webViewLink: file.webViewLink,
    webContentLink: file.webContentLink
  };
}

// ============ GOOGLE SHEETS ============

async function ensureSheet() {
  // Check if custom spreadsheet is enabled
  const settings = await loadCustomSettings();
  
  if (settings.useCustomSpreadsheetId && settings.customSpreadsheetId) {
    // Validate custom spreadsheet still exists and is accessible
    try {
      const response = await fetch(
        `${GOOGLE_APIS.SHEETS}/${settings.customSpreadsheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      if (response.ok) {
        const sheet = await response.json();
        sheetId = settings.customSpreadsheetId;
        console.log('[SW] Using custom spreadsheet:', sheet.properties.title);
        
        // Check if TikTok Download Log sheet tab exists, create if not
        const hasLogSheet = sheet.sheets?.some(s => s.properties.title === CONFIG.SHEET_TAB_NAME);
        if (!hasLogSheet) {
          console.log('[SW] Creating TikTok Download Log sheet tab in custom spreadsheet');
          await createDownloadsSheet(sheetId);
        }
        
        return sheetId;
      }
      // Custom spreadsheet not accessible, fall back to default
      console.warn('[SW] Custom spreadsheet not accessible, falling back to default');
    } catch (e) {
      console.warn('[SW] Custom spreadsheet validation failed, falling back to default:', e.message);
    }
  }
  
  // Default behavior
  if (sheetId) {
    // Verify sheet still exists
    try {
      const response = await fetch(
        `${GOOGLE_APIS.SHEETS}/${sheetId}?fields=spreadsheetId`,
        { headers: { Authorization: `Bearer ${authToken}` } }
      );
      
      if (response.ok) {
        return sheetId;
      }
    } catch (e) {
      // Sheet doesn't exist, create new one
    }
  }
  
  // Search for existing sheet in Drive
  const searchResponse = await fetch(
    `${GOOGLE_APIS.DRIVE_FILES}?q=name='${CONFIG.SHEET_NAME}' and mimeType='application/vnd.google-apps.spreadsheet' and trashed=false&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${authToken}` } }
  );
  
  if (searchResponse.ok) {
    const result = await searchResponse.json();
    if (result.files && result.files.length > 0) {
      sheetId = result.files[0].id;
      await chrome.storage.local.set({ [STORAGE_KEYS.SHEET_ID]: sheetId });
      return sheetId;
    }
  }
  
  // Create new sheet
  const createResponse = await fetch(GOOGLE_APIS.SHEETS, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${authToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      properties: {
        title: CONFIG.SHEET_NAME
      },
      sheets: [{
        properties: {
          title: CONFIG.SHEET_TAB_NAME
        },
        data: [{
          startRow: 0,
          startColumn: 0,
          rowData: [{
            values: [
              { userEnteredValue: { stringValue: 'Timestamp' } },
              { userEnteredValue: { stringValue: 'TikTok URL' } },
              { userEnteredValue: { stringValue: 'Drive Link' } },
              { userEnteredValue: { stringValue: 'File Name' } },
              { userEnteredValue: { stringValue: 'Username' } },
              { userEnteredValue: { stringValue: 'Description' } },
              { userEnteredValue: { stringValue: 'Status' } }
            ]
          }]
        }]
      }]
    })
  });
  
  if (!createResponse.ok) {
    throw new Error('Failed to create Google Sheet');
  }
  
  const sheet = await createResponse.json();
  sheetId = sheet.spreadsheetId;
  await chrome.storage.local.set({ [STORAGE_KEYS.SHEET_ID]: sheetId });
  
  return sheetId;
}

async function logToSheet(videoData, driveFile, status = 'Success') {
  const timestamp = new Date().toLocaleString();
  
  // Clean up description - remove newlines and limit length
  const description = (videoData.description || '')
    .replace(/[\n\r]+/g, ' ')
    .substring(0, 500);
  
  const values = [[
    timestamp,
    videoData.pageUrl,
    driveFile.webViewLink,
    driveFile.fileName,
    `@${videoData.username}`,
    description,
    status
  ]];
  
  const response = await fetch(
    `${GOOGLE_APIS.SHEETS}/${sheetId}/values/${encodeURIComponent(CONFIG.SHEET_TAB_NAME)}!A:G:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ values })
    }
  );
  
  if (!response.ok) {
    console.error('Failed to log to sheet:', await response.text());
  }
}

// ============ VIDEO DOWNLOAD ============

async function downloadVideo(videoData, tabId) {
  try {
    if (!authToken) {
      return { success: false, error: 'Not authenticated. Please connect to Google Drive.' };
    }
    
    // Validate video data
    if (!videoData || !videoData.videoUrl) {
      return { success: false, error: 'Invalid video data: No video URL provided.' };
    }
    
    // Validate video URL is from trusted TikTok CDN
    if (!isValidVideoUrl(videoData.videoUrl)) {
      console.error('[SW] Invalid video URL rejected:', videoData.videoUrl?.substring(0, 100));
      return { success: false, error: 'Invalid video URL. URL must be from TikTok CDN.' };
    }
    
    // Sanitize video data
    const sanitizedData = {
      ...videoData,
      username: sanitizeUsername(videoData.username),
      videoId: sanitizeVideoId(videoData.videoId) || videoData.videoId,
      description: (videoData.description || '').substring(0, 500) // Limit description length
    };
    
    console.log('[SW] Starting download for:', sanitizedData.videoId);
    
    // Notify popup of progress
    sendProgressUpdate(tabId, 'Fetching video...', 10);
    
    // Try multiple methods to fetch the video
    let videoBlob = null;
    
    // Method 1: Try direct fetch with various headers
    const fetchMethods = [
      // Basic fetch
      () => fetch(sanitizedData.videoUrl),
      // With TikTok referer
      () => fetch(sanitizedData.videoUrl, {
        headers: {
          'Referer': 'https://www.tiktok.com/'
        }
      }),
      // With full headers
      () => fetch(sanitizedData.videoUrl, {
        headers: {
          'Referer': 'https://www.tiktok.com/',
          'Origin': 'https://www.tiktok.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        mode: 'cors',
        credentials: 'omit'
      }),
      // No-cors mode (limited but might work)
      () => fetch(sanitizedData.videoUrl, { mode: 'no-cors' })
    ];
    
    for (const fetchMethod of fetchMethods) {
      try {
        console.log('[SW] Trying fetch method...');
        const response = await fetchMethod();
        
        if (response.ok || response.type === 'opaque') {
          const blob = await response.blob();
          // Check if we got actual video data (not empty or too small)
          if (blob.size > 10000) { // At least 10KB
            // Validate file size before proceeding
            if (!isValidFileSize(blob.size, 500)) {
              console.warn('[SW] Video file too large:', blob.size);
              return { success: false, error: 'Video file exceeds maximum size (500MB).' };
            }
            videoBlob = blob;
            console.log('[SW] Video fetched, size:', blob.size);
            break;
          }
        }
      } catch (e) {
        console.log('[SW] Fetch method failed:', e.message);
      }
    }
    
    // Method 2: If direct fetch failed, try via content script
    if (!videoBlob && tabId) {
      console.log('[SW] Direct fetch failed. Trying to fetch via content script...');
      console.log('[SW] Sending FETCH_VIDEO to tab:', tabId);
      try {
        const contentResponse = await chrome.tabs.sendMessage(tabId, {
          type: 'FETCH_VIDEO',
          videoUrl: sanitizedData.videoUrl
        });
        
        console.log('[SW] Content script response:', JSON.stringify(contentResponse ? {
          success: contentResponse.success,
          hasData: !!contentResponse.videoData,
          size: contentResponse.size,
          error: contentResponse.error
        } : 'null'));
        
        if (contentResponse && contentResponse.success && contentResponse.videoData) {
          // Convert base64 to blob
          console.log('[SW] Converting base64 to blob...');
          const binaryString = atob(contentResponse.videoData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          videoBlob = new Blob([bytes], { type: 'video/mp4' });
          console.log('[SW] Video received from content script, size:', videoBlob.size);
          
          // Validate file size
          if (!isValidFileSize(videoBlob.size, 500)) {
            console.warn('[SW] Video file too large:', videoBlob.size);
            return { success: false, error: 'Video file exceeds maximum size (500MB).' };
          }
        } else if (contentResponse && contentResponse.error) {
          console.log('[SW] Content script returned error:', contentResponse.error);
        }
      } catch (e) {
        console.log('[SW] Content script fetch failed:', e.message);
      }
    }
    
    if (!videoBlob || videoBlob.size < 10000) {
      throw new Error('Could not fetch video. TikTok may be blocking the request. Try refreshing the page.');
    }
    
    sendProgressUpdate(tabId, 'Downloading video...', 30);
    sendProgressUpdate(tabId, 'Uploading to Google Drive...', 60);
    
    // Ensure Drive folder exists before upload
    await ensureDriveFolder();
    
    // Upload to Drive (use sanitized data)
    const driveFile = await uploadToDrive(sanitizedData, videoBlob);
    
    sendProgressUpdate(tabId, 'Logging to Google Sheets...', 90);
    
    // Ensure Sheet exists before logging
    await ensureSheet();
    
    // Log to Sheets
    await logToSheet(sanitizedData, driveFile);
    
    // Save to recent activity
    await saveRecentActivity({
      timestamp: Date.now(),
      username: sanitizedData.username,
      videoId: sanitizedData.videoId,
      driveLink: driveFile.webViewLink,
      fileName: driveFile.fileName
    });
    
    // Update stats
    await updateStats('download');
    await updateStats('upload');
    
    sendProgressUpdate(tabId, 'Complete!', 100);
    
    return {
      success: true,
      driveLink: driveFile.webViewLink,
      fileName: driveFile.fileName,
      message: 'Video downloaded successfully!'
    };
    
  } catch (error) {
    console.error('[SW] Download error:', error);
    return { success: false, error: error.message };
  }
}

function sendProgressUpdate(tabId, message, percent) {
  if (tabId) {
    chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.DOWNLOAD_PROGRESS,
      message,
      percent
    }).catch(() => {});
  }
  
  // Also broadcast to popup
  chrome.runtime.sendMessage({
    type: MESSAGE_TYPES.DOWNLOAD_PROGRESS,
    message,
    percent
  }).catch(() => {});
}

// ============ RECENT ACTIVITY ============

async function saveRecentActivity(activity) {
  const data = await chrome.storage.local.get([STORAGE_KEYS.RECENT_ACTIVITY]);
  let recentActivity = data[STORAGE_KEYS.RECENT_ACTIVITY] || [];
  
  recentActivity.unshift(activity);
  
  // Keep only last N items
  if (recentActivity.length > CONFIG.MAX_RECENT_ACTIVITY) {
    recentActivity = recentActivity.slice(0, CONFIG.MAX_RECENT_ACTIVITY);
  }
  
  await chrome.storage.local.set({ [STORAGE_KEYS.RECENT_ACTIVITY]: recentActivity });
}

async function updateStats(type) {
  const data = await chrome.storage.local.get('stats');
  const stats = data.stats || { totalDownloads: 0, totalUploads: 0 };
  
  if (type === 'download') {
    stats.totalDownloads = (stats.totalDownloads || 0) + 1;
  } else if (type === 'upload') {
    stats.totalUploads = (stats.totalUploads || 0) + 1;
  }
  
  await chrome.storage.local.set({ stats });
}

async function getRecentActivity() {
  const data = await chrome.storage.local.get([STORAGE_KEYS.RECENT_ACTIVITY]);
  return { 
    success: true, 
    recentActivity: data[STORAGE_KEYS.RECENT_ACTIVITY] || [] 
  };
}

// ============ TAB COMMUNICATION ============

async function getVideoInfoFromTab(tabId) {
  if (!tabId) {
    return { success: false, error: 'No active tab' };
  }
  
  try {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: MESSAGE_TYPES.GET_VIDEO_INFO
    });
    return response;
  } catch (error) {
    return { success: false, error: 'Not on a TikTok page or content script not loaded' };
  }
}

// ============ SPREADSHEET MANAGEMENT ============

async function listSpreadsheets() {
  try {
    if (!authToken) {
      await loadStoredData();
    }
    
    if (!authToken) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Search for spreadsheets in Google Drive
    const query = encodeURIComponent("mimeType='application/vnd.google-apps.spreadsheet'");
    const response = await fetch(
      `https://www.googleapis.com/drive/v3/files?q=${query}&orderBy=modifiedTime desc&pageSize=50&fields=files(id,name,modifiedTime)`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to list spreadsheets');
    }
    
    const data = await response.json();
    return { 
      success: true, 
      spreadsheets: data.files || [] 
    };
  } catch (error) {
    console.error('[SW] List spreadsheets error:', error);
    return { success: false, error: error.message };
  }
}

async function setTargetSpreadsheet(data) {
  try {
    if (!data?.spreadsheetId) {
      return { success: false, error: 'No spreadsheet ID provided' };
    }
    
    if (!authToken) {
      await loadStoredData();
    }
    
    if (!authToken) {
      return { success: false, error: 'Not authenticated' };
    }
    
    // Get spreadsheet details
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${data.spreadsheetId}?fields=spreadsheetId,properties.title`,
      {
        headers: { Authorization: `Bearer ${authToken}` }
      }
    );
    
    if (!response.ok) {
      throw new Error('Failed to access spreadsheet');
    }
    
    const sheetData = await response.json();
    
    // Store the sheet ID
    sheetId = data.spreadsheetId;
    await chrome.storage.local.set({ 
      [STORAGE_KEYS.SHEET_ID]: data.spreadsheetId,
      sheetName: sheetData.properties.title
    });
    
    return { 
      success: true, 
      title: sheetData.properties.title 
    };
  } catch (error) {
    console.error('[SW] Set target spreadsheet error:', error);
    return { success: false, error: error.message };
  }
}

// ============ CUSTOM FOLDER/SPREADSHEET VALIDATION ============

async function validateFolder(data) {
  try {
    console.log('[SW] validateFolder called with:', data);
    
    if (!data?.folderId) {
      console.log('[SW] No folder ID provided');
      return { success: false, error: 'No folder ID provided' };
    }
    
    if (!authToken) {
      console.log('[SW] No authToken, loading stored data...');
      await loadStoredData();
    }
    
    if (!authToken) {
      console.log('[SW] Still no authToken after loadStoredData');
      return { success: false, error: 'Not authenticated. Please sign in first.' };
    }
    
    console.log('[SW] Validating folder with token:', authToken ? 'present' : 'missing');
    
    // Check if folder exists and get its details
    // supportsAllDrives=true is required for shared drives/folders
    const response = await fetch(
      `${GOOGLE_APIS.DRIVE_FILES}/${data.folderId}?fields=id,name,mimeType,trashed,capabilities&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    console.log('[SW] Folder validation response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.log('[SW] Folder validation error response:', errorText);
      
      if (response.status === 404) {
        return { success: false, error: 'Folder not found. Please check the folder ID.' };
      } else if (response.status === 403) {
        return { success: false, error: 'Access denied. You do not have permission to access this folder.' };
      }
      throw new Error(`Failed to validate folder: ${response.status} - ${errorText}`);
    }
    
    const folder = await response.json();
    
    // Check if it's actually a folder
    if (folder.mimeType !== 'application/vnd.google-apps.folder') {
      return { success: false, error: 'The provided ID is not a folder.' };
    }
    
    // Check if folder is trashed
    if (folder.trashed) {
      return { success: false, error: 'This folder has been deleted.' };
    }
    
    // Check write permissions
    if (folder.capabilities && !folder.capabilities.canAddChildren) {
      return { success: false, error: 'You do not have write access to this folder. Ask the owner for Editor access.' };
    }
    
    return {
      success: true,
      folderName: folder.name,
      folderId: folder.id
    };
  } catch (error) {
    console.error('[SW] Folder validation error:', error);
    return { success: false, error: error.message };
  }
}

async function validateSheet(data) {
  try {
    if (!data?.sheetId) {
      return { success: false, error: 'No spreadsheet ID provided' };
    }
    
    if (!authToken) {
      await loadStoredData();
    }
    
    if (!authToken) {
      return { success: false, error: 'Not authenticated. Please sign in first.' };
    }
    
    // Check if spreadsheet exists and get its details
    const response = await fetch(
      `${GOOGLE_APIS.SHEETS}/${data.sheetId}?fields=spreadsheetId,properties.title,sheets.properties`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (!response.ok) {
      if (response.status === 404) {
        return { success: false, error: 'Spreadsheet not found. Please check the spreadsheet ID.' };
      } else if (response.status === 403) {
        return { success: false, error: 'Access denied. You do not have permission to access this spreadsheet.' };
      }
      throw new Error('Failed to validate spreadsheet');
    }
    
    const sheet = await response.json();
    
    // Try to verify write access by checking if we can get sheet properties
    // (If user has view-only access, they can still read but won't be able to write)
    // We'll test write access by attempting to get values (which requires at least read access)
    const writeTestResponse = await fetch(
      `${GOOGLE_APIS.SHEETS}/${data.sheetId}/values/A1`,
      { headers: { Authorization: `Bearer ${authToken}` } }
    );
    
    if (!writeTestResponse.ok && writeTestResponse.status === 403) {
      return { success: false, error: 'You do not have permission to access this spreadsheet. Ask the owner for Editor access.' };
    }
    
    return {
      success: true,
      title: sheet.properties.title,
      spreadsheetId: sheet.spreadsheetId
    };
  } catch (error) {
    console.error('[SW] Spreadsheet validation error:', error);
    return { success: false, error: error.message };
  }
}

async function handleSettingsUpdate(settings) {
  try {
    console.log('[SW] Settings updated:', settings);
    
    // If custom folder is enabled, update driveFolderId
    if (settings.useCustomFolderId && settings.customDriveFolderId) {
      driveFolderId = settings.customDriveFolderId;
      await chrome.storage.local.set({ [STORAGE_KEYS.DRIVE_FOLDER_ID]: settings.customDriveFolderId });
    } else {
      // Reset to null so ensureDriveFolder will create/find default folder
      driveFolderId = null;
      await chrome.storage.local.remove([STORAGE_KEYS.DRIVE_FOLDER_ID]);
    }
    
    // If custom spreadsheet is enabled, update sheetId
    if (settings.useCustomSpreadsheetId && settings.customSpreadsheetId) {
      sheetId = settings.customSpreadsheetId;
      await chrome.storage.local.set({ [STORAGE_KEYS.SHEET_ID]: settings.customSpreadsheetId });
    } else {
      // Reset to null so ensureSheet will create/find default sheet
      sheetId = null;
      await chrome.storage.local.remove([STORAGE_KEYS.SHEET_ID]);
    }
    
    return { success: true };
  } catch (error) {
    console.error('[SW] Settings update error:', error);
    return { success: false, error: error.message };
  }
}

async function createDownloadsSheet(spreadsheetId) {
  try {
    // Add a new sheet called "TikTok Download Log" with headers
    await fetch(
      `${GOOGLE_APIS.SHEETS}/${spreadsheetId}:batchUpdate`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          requests: [{
            addSheet: {
              properties: {
                title: CONFIG.SHEET_TAB_NAME
              }
            }
          }]
        })
      }
    );
    
    // Add headers to the new sheet
    await fetch(
      `${GOOGLE_APIS.SHEETS}/${spreadsheetId}/values/${encodeURIComponent(CONFIG.SHEET_TAB_NAME)}!A1:G1?valueInputOption=USER_ENTERED`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${authToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [[
            'Timestamp',
            'TikTok URL',
            'Drive Link',
            'File Name',
            'Username',
            'Description',
            'Status'
          ]]
        })
      }
    );
    
    console.log('[SW] Created TikTok Download Log sheet in custom spreadsheet');
  } catch (error) {
    console.error('[SW] Failed to create TikTok Download Log sheet:', error);
    // Don't throw - logging will still work, just without headers
  }
}

console.log('TikTok Video Downloader service worker loaded');
