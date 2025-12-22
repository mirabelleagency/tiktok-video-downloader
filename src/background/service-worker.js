// TikTok Video Downloader - Service Worker
// Handles OAuth, Google Drive uploads, and Google Sheets logging

import { 
  GOOGLE_APIS, 
  STORAGE_KEYS, 
  CONFIG, 
  MESSAGE_TYPES 
} from '../utils/constants.js';

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
  console.log('[SW] Handling message:', message.type, 'tabId:', tabId);
  
  switch (message.type) {
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
    
    default:
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

async function ensureDriveFolder() {
  if (driveFolderId) {
    // Verify folder still exists
    try {
      const response = await fetch(
        `${GOOGLE_APIS.DRIVE_FILES}/${driveFolderId}?fields=id,name,trashed`,
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

async function uploadToDrive(videoData, videoBlob, onProgress) {
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
    `${GOOGLE_APIS.DRIVE_UPLOAD}?uploadType=multipart&fields=id,name,webViewLink,webContentLink`,
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
  await fetch(`${GOOGLE_APIS.DRIVE_FILES}/${file.id}/permissions`, {
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
          title: 'Downloads'
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
  
  const values = [[
    timestamp,
    videoData.pageUrl,
    driveFile.webViewLink,
    driveFile.fileName,
    `@${videoData.username}`,
    status
  ]];
  
  const response = await fetch(
    `${GOOGLE_APIS.SHEETS}/${sheetId}/values/Downloads!A:F:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`,
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
    
    console.log('[SW] Starting download for:', videoData.videoId);
    
    // Notify popup of progress
    sendProgressUpdate(tabId, 'Fetching video...', 10);
    
    // Try multiple methods to fetch the video
    let videoBlob = null;
    
    // Method 1: Try direct fetch with various headers
    const fetchMethods = [
      // Basic fetch
      () => fetch(videoData.videoUrl),
      // With TikTok referer
      () => fetch(videoData.videoUrl, {
        headers: {
          'Referer': 'https://www.tiktok.com/'
        }
      }),
      // With full headers
      () => fetch(videoData.videoUrl, {
        headers: {
          'Referer': 'https://www.tiktok.com/',
          'Origin': 'https://www.tiktok.com',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        mode: 'cors',
        credentials: 'omit'
      }),
      // No-cors mode (limited but might work)
      () => fetch(videoData.videoUrl, { mode: 'no-cors' })
    ];
    
    for (const fetchMethod of fetchMethods) {
      try {
        console.log('[SW] Trying fetch method...');
        const response = await fetchMethod();
        
        if (response.ok || response.type === 'opaque') {
          const blob = await response.blob();
          // Check if we got actual video data (not empty or too small)
          if (blob.size > 10000) { // At least 10KB
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
          videoUrl: videoData.videoUrl
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
    
    // Upload to Drive
    const driveFile = await uploadToDrive(videoData, videoBlob);
    
    sendProgressUpdate(tabId, 'Logging to Google Sheets...', 90);
    
    // Log to Sheets
    await logToSheet(videoData, driveFile);
    
    // Save to recent activity
    await saveRecentActivity({
      timestamp: Date.now(),
      username: videoData.username,
      videoId: videoData.videoId,
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

console.log('TikTok Video Downloader service worker loaded');
