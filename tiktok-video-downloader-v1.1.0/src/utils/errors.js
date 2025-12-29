// TikTok Video Downloader - Error Definitions
// Centralized error codes and user-friendly messages

/**
 * Error code prefix definitions
 * AUTH - Authentication errors
 * DL   - Download errors
 * UP   - Upload errors
 * LOG  - Logging errors
 * VAL  - Validation errors
 */

export const ERROR_CODES = {
  // Authentication Errors (AUTH_xxx)
  AUTH_NOT_AUTHENTICATED: {
    code: 'AUTH_001',
    message: 'Not signed in to Google. Please connect your account.',
    userMessage: 'Please sign in to Google Drive first.',
    recoveryHint: 'Click the "Connect Google Drive" button.'
  },
  AUTH_TOKEN_EXPIRED: {
    code: 'AUTH_002',
    message: 'Authentication token has expired.',
    userMessage: 'Your session has expired. Please sign in again.',
    recoveryHint: 'Click sign out, then sign in again.'
  },
  AUTH_SCOPE_DENIED: {
    code: 'AUTH_003',
    message: 'Required permissions not granted.',
    userMessage: 'Missing permissions. Please grant access to Google Drive.',
    recoveryHint: 'Sign out and sign in again, then approve all permissions.'
  },
  
  // Download Errors (DL_xxx)
  DL_NO_VIDEO_DETECTED: {
    code: 'DL_001',
    message: 'No video detected on page.',
    userMessage: 'Could not find a video on this page.',
    recoveryHint: 'Make sure you\'re on a TikTok video page and the video is loaded.'
  },
  DL_FETCH_FAILED: {
    code: 'DL_002',
    message: 'Failed to fetch video from TikTok.',
    userMessage: 'Could not download the video. TikTok may be blocking the request.',
    recoveryHint: 'Try refreshing the TikTok page and try again.'
  },
  DL_VIDEO_TOO_LARGE: {
    code: 'DL_003',
    message: 'Video file exceeds maximum size.',
    userMessage: 'This video is too large to download (max 500MB).',
    recoveryHint: 'Try a shorter video.'
  },
  DL_INVALID_URL: {
    code: 'DL_004',
    message: 'Invalid video URL.',
    userMessage: 'The video URL appears to be invalid.',
    recoveryHint: 'Refresh the page and try again.'
  },
  DL_NETWORK_ERROR: {
    code: 'DL_005',
    message: 'Network error during download.',
    userMessage: 'Network error. Please check your internet connection.',
    recoveryHint: 'Check your internet connection and try again.'
  },
  DL_TIMEOUT: {
    code: 'DL_006',
    message: 'Download timed out.',
    userMessage: 'Download took too long and timed out.',
    recoveryHint: 'Check your internet speed and try again.'
  },
  DL_REGION_BLOCKED: {
    code: 'DL_007',
    message: 'Video may be region-restricted.',
    userMessage: 'This video may not be available in your region.',
    recoveryHint: 'Try a different video.'
  },
  
  // Upload Errors (UP_xxx)
  UP_DRIVE_FAILED: {
    code: 'UP_001',
    message: 'Failed to upload to Google Drive.',
    userMessage: 'Could not upload video to Google Drive.',
    recoveryHint: 'Check your Google Drive storage quota and try again.'
  },
  UP_FOLDER_NOT_FOUND: {
    code: 'UP_002',
    message: 'Drive folder not found.',
    userMessage: 'The download folder was not found.',
    recoveryHint: 'Sign out and sign in again to recreate the folder.'
  },
  UP_QUOTA_EXCEEDED: {
    code: 'UP_003',
    message: 'Google Drive storage quota exceeded.',
    userMessage: 'Your Google Drive is full.',
    recoveryHint: 'Free up space in Google Drive or upgrade storage.'
  },
  
  // Logging Errors (LOG_xxx)
  LOG_SHEET_FAILED: {
    code: 'LOG_001',
    message: 'Failed to log to Google Sheets.',
    userMessage: 'Could not update the download log.',
    recoveryHint: 'The download succeeded, but logging failed. Check the log sheet.'
  },
  LOG_SHEET_NOT_FOUND: {
    code: 'LOG_002',
    message: 'Log spreadsheet not found.',
    userMessage: 'The log spreadsheet was not found.',
    recoveryHint: 'Check settings or sign out and in to recreate the sheet.'
  },
  
  // Validation Errors (VAL_xxx)
  VAL_INVALID_VIDEO_DATA: {
    code: 'VAL_001',
    message: 'Invalid video data.',
    userMessage: 'Could not process the video information.',
    recoveryHint: 'Refresh the page and try again.'
  },
  VAL_UNTRUSTED_URL: {
    code: 'VAL_002',
    message: 'Video URL is not from a trusted source.',
    userMessage: 'Security check failed for this video URL.',
    recoveryHint: 'Make sure you\'re on an official TikTok page.'
  },
  
  // Generic Errors
  UNKNOWN_ERROR: {
    code: 'ERR_999',
    message: 'An unknown error occurred.',
    userMessage: 'Something went wrong.',
    recoveryHint: 'Please try again. If the problem persists, refresh the page.'
  }
};

/**
 * Creates an error object with code and details
 * @param {string} errorKey - Key from ERROR_CODES
 * @param {string} details - Additional error details
 * @returns {object} Error object with code, message, and hints
 */
export function createError(errorKey, details = '') {
  const errorDef = ERROR_CODES[errorKey] || ERROR_CODES.UNKNOWN_ERROR;
  
  return {
    code: errorDef.code,
    message: errorDef.message,
    userMessage: details ? `${errorDef.userMessage} (${details})` : errorDef.userMessage,
    recoveryHint: errorDef.recoveryHint,
    timestamp: new Date().toISOString()
  };
}

/**
 * Gets user-friendly error message
 * @param {string} errorKey - Key from ERROR_CODES
 * @returns {string} User-friendly message
 */
export function getUserMessage(errorKey) {
  const errorDef = ERROR_CODES[errorKey] || ERROR_CODES.UNKNOWN_ERROR;
  return errorDef.userMessage;
}

/**
 * Maps raw error messages to error codes
 * @param {string} rawMessage - Raw error message
 * @returns {string} Error key from ERROR_CODES
 */
export function mapErrorToCode(rawMessage) {
  const message = rawMessage.toLowerCase();
  
  if (message.includes('not authenticated') || message.includes('not signed in')) {
    return 'AUTH_NOT_AUTHENTICATED';
  }
  if (message.includes('token') && (message.includes('expired') || message.includes('invalid'))) {
    return 'AUTH_TOKEN_EXPIRED';
  }
  if (message.includes('no video')) {
    return 'DL_NO_VIDEO_DETECTED';
  }
  if (message.includes('fetch') || message.includes('blocking')) {
    return 'DL_FETCH_FAILED';
  }
  if (message.includes('too large') || message.includes('size')) {
    return 'DL_VIDEO_TOO_LARGE';
  }
  if (message.includes('network') || message.includes('connection')) {
    return 'DL_NETWORK_ERROR';
  }
  if (message.includes('timeout')) {
    return 'DL_TIMEOUT';
  }
  if (message.includes('drive') && message.includes('upload')) {
    return 'UP_DRIVE_FAILED';
  }
  if (message.includes('quota')) {
    return 'UP_QUOTA_EXCEEDED';
  }
  if (message.includes('sheet') || message.includes('log')) {
    return 'LOG_SHEET_FAILED';
  }
  
  return 'UNKNOWN_ERROR';
}

/**
 * Formats error for display in popup
 * @param {Error|string} error - Error object or message
 * @returns {object} Formatted error for UI
 */
export function formatErrorForUI(error) {
  const rawMessage = error instanceof Error ? error.message : String(error);
  const errorKey = mapErrorToCode(rawMessage);
  const errorDef = ERROR_CODES[errorKey] || ERROR_CODES.UNKNOWN_ERROR;
  
  return {
    code: errorDef.code,
    title: errorDef.userMessage,
    hint: errorDef.recoveryHint,
    details: rawMessage
  };
}
