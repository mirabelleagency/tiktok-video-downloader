// TikTok Video Downloader - Constants
export const TIKTOK_PATTERNS = {
  // Standard video: https://www.tiktok.com/@username/video/1234567890123456789
  VIDEO: /tiktok\.com\/@([^/]+)\/video\/(\d+)/,
  
  // Short URL: https://vm.tiktok.com/ABC123/
  SHORT: /vm\.tiktok\.com\/([A-Za-z0-9]+)/,
  
  // Mobile URL: https://m.tiktok.com/v/1234567890123456789
  MOBILE: /m\.tiktok\.com\/v\/(\d+)/,
  
  // For You Page (FYP): https://www.tiktok.com/foryou
  FYP: /tiktok\.com\/foryou/,
  
  // Following feed: https://www.tiktok.com/following
  FOLLOWING: /tiktok\.com\/following/,
  
  // User profile: https://www.tiktok.com/@username
  PROFILE: /tiktok\.com\/@([^/?]+)$/
};

// API endpoints to monitor for video URLs
export const TIKTOK_API_ENDPOINTS = [
  '/api/item/detail/',
  '/api/recommend/item_list/',
  '/node/video/PlayAddr',
  '/api/post/item_list/',
  '/aweme/v1/feed/',
  '/aweme/v1/play/'
];

// Video URL patterns in API responses
export const VIDEO_URL_KEYS = [
  'playAddr',
  'downloadAddr',
  'play_addr',
  'download_addr',
  'video_url',
  'PlayAddr'
];

// Google API endpoints
export const GOOGLE_APIS = {
  DRIVE_UPLOAD: 'https://www.googleapis.com/upload/drive/v3/files',
  DRIVE_FILES: 'https://www.googleapis.com/drive/v3/files',
  SHEETS: 'https://sheets.googleapis.com/v4/spreadsheets'
};

// Hardcoded Google Drive and Sheets configuration
export const HARDCODED_CONFIG = {
  DRIVE_FOLDER_ID: '1vgczbmoBWRe4pMVtyuXfAjsyTge8XbDg',
  SHEET_ID: '1Tu4Copj7TO_psKL7IoiRSVzU86ZCdMhcFe08aYU_ioM'
};

// Storage keys
export const STORAGE_KEYS = {
  AUTH_TOKEN: 'authToken',
  DRIVE_FOLDER_ID: 'driveFolderId',
  SHEET_ID: 'sheetId',
  RECENT_ACTIVITY: 'recentActivity',
  USER_INFO: 'userInfo',
  SETTINGS: 'settings'
};

// Extension settings
export const CONFIG = {
  DRIVE_FOLDER_NAME: 'TikTok Downloads',
  SHEET_NAME: 'TikTok Download Log',
  SHEET_TAB_NAME: 'TikTok Download Log',
  MAX_RECENT_ACTIVITY: 10,
  REQUEST_TIMEOUT: 30000
};

// Message types for communication between scripts
export const MESSAGE_TYPES = {
  // Content script -> Background
  VIDEO_DETECTED: 'VIDEO_DETECTED',
  DOWNLOAD_REQUEST: 'DOWNLOAD_REQUEST',
  GET_AUTH_STATUS: 'GET_AUTH_STATUS',
  
  // Background -> Content script
  VIDEO_URL_FOUND: 'VIDEO_URL_FOUND',
  DOWNLOAD_PROGRESS: 'DOWNLOAD_PROGRESS',
  DOWNLOAD_COMPLETE: 'DOWNLOAD_COMPLETE',
  DOWNLOAD_ERROR: 'DOWNLOAD_ERROR',
  
  // Popup -> Background
  GET_VIDEO_INFO: 'GET_VIDEO_INFO',
  START_DOWNLOAD: 'START_DOWNLOAD',
  AUTHENTICATE: 'AUTHENTICATE',
  SIGN_OUT: 'SIGN_OUT',
  GET_RECENT_ACTIVITY: 'GET_RECENT_ACTIVITY',
  
  // Background -> Popup
  AUTH_SUCCESS: 'AUTH_SUCCESS',
  AUTH_ERROR: 'AUTH_ERROR',
  VIDEO_INFO: 'VIDEO_INFO',
  NO_VIDEO: 'NO_VIDEO'
};
