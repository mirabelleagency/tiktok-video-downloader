# TikTok Video Downloader - Complete Documentation Guide

> **Version:** 1.0.0  
> **Last Updated:** December 23, 2025  
> **Platform:** Google Chrome Extension (Manifest V3)

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Features](#features)
4. [Installation](#installation)
5. [Configuration](#configuration)
6. [User Guide](#user-guide)
7. [API Reference](#api-reference)
8. [File Structure](#file-structure)
9. [Development Guide](#development-guide)
10. [Testing](#testing)
11. [Troubleshooting](#troubleshooting)
12. [Security](#security)
13. [FAQ](#faq)
14. [Changelog](#changelog)

---

## Overview

### What is TikTok Video Downloader?

TikTok Video Downloader is a Chrome extension that allows users to download TikTok videos directly to their Google Drive with automatic logging to Google Sheets. It provides a seamless, one-click solution for saving and organizing TikTok content.

### Key Benefits

| Benefit | Description |
|---------|-------------|
| 🎯 **One-Click Downloads** | Download videos without leaving TikTok |
| ☁️ **Cloud Storage** | Automatic upload to Google Drive |
| 📊 **Automatic Logging** | Track all downloads in Google Sheets |
| 🔒 **Secure** | OAuth 2.0 authentication, no data stored locally |
| 🎨 **Modern UI** | TikTok-inspired dark theme interface |

### System Requirements

- **Browser:** Google Chrome version 88 or higher
- **OS:** Windows, macOS, or Linux
- **Account:** Google Account for Drive/Sheets integration
- **Internet:** Active internet connection

---

## Architecture

### High-Level Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     TikTok Video Downloader                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐  │
│  │   Popup     │  │   Options   │  │    Content Scripts      │  │
│  │   (UI)      │  │   (Config)  │  │  (TikTok Integration)   │  │
│  └──────┬──────┘  └──────┬──────┘  └────────────┬────────────┘  │
│         │                │                      │                │
│         └────────────────┼──────────────────────┘                │
│                          │                                       │
│                    ┌─────▼─────┐                                │
│                    │  Service  │                                │
│                    │  Worker   │                                │
│                    └─────┬─────┘                                │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
          ▼                ▼                ▼
    ┌──────────┐    ┌──────────┐    ┌──────────┐
    │  TikTok  │    │  Google  │    │  Google  │
    │  Server  │    │  Drive   │    │  Sheets  │
    └──────────┘    └──────────┘    └──────────┘
```

### Component Responsibilities

| Component | File(s) | Purpose |
|-----------|---------|---------|
| **Popup** | `src/popup/*` | User interface for initiating downloads |
| **Content Script** | `src/content/tiktok.js` | Detects videos on TikTok pages |
| **Injected Script** | `src/content/injected.js` | Intercepts network requests for video URLs |
| **Service Worker** | `src/background/service-worker.js` | Handles auth, downloads, uploads, and logging |
| **Options** | `src/options/*` | Extension settings configuration |
| **Constants** | `src/utils/constants.js` | Shared configuration values |
| **Validation** | `src/utils/validation.js` | Input validation and sanitization |
| **Errors** | `src/utils/errors.js` | Error codes, messages, and recovery hints |
| **Retry** | `src/utils/retry.js` | Exponential backoff retry logic |
| **Network** | `src/utils/network.js` | Offline detection and network monitoring |
| **Rate Limit** | `src/utils/ratelimit.js` | Token bucket rate limiting for APIs |

### Data Flow

1. **Video Detection** → Content script detects TikTok video on page
2. **User Action** → User clicks "Download" in popup
3. **Video Fetch** → Service worker fetches video from TikTok
4. **Upload** → Video uploaded to Google Drive
5. **Logging** → Download logged to Google Sheets
6. **Notification** → User receives completion status

---

## Features

### Core Features

#### 1. One-Click Video Download
- Single button click to initiate download
- Automatic video URL detection
- Support for multiple URL formats

#### 2. Google Drive Integration
- Automatic upload to dedicated folder
- Creates "TikTok Downloads" folder automatically
- Organized storage with consistent naming

#### 3. Google Sheets Logging
- Automatic log creation: "TikTok Download Log"
- Tracks: Timestamp, URL, Drive Link, Filename, Username, Status
- Sortable and searchable records

#### 4. Progress Tracking
- Real-time download progress bar
- Percentage and size indicators
- Cancel option during download

#### 5. Statistics Dashboard
- Total downloads counter
- Total uploads tracker
- Recent activity feed

### Supported URL Formats

| Format | Pattern | Example |
|--------|---------|---------|
| Standard | `@username/video/ID` | `tiktok.com/@user/video/123456` |
| Short URL | `vm.tiktok.com/CODE` | `vm.tiktok.com/ABC123/` |
| Mobile | `m.tiktok.com/v/ID` | `m.tiktok.com/v/123456` |
| For You Page | Feed videos | Videos while browsing |
| Following | Following feed | Videos from followed creators |
| Profile | Profile videos | Videos on user profiles |

---

## Installation

### Prerequisites

1. **Node.js** (v16.0.0 or higher)
   ```powershell
   # Check Node.js version
   node --version
   ```

2. **npm** (v7.0.0 or higher)
   ```powershell
   # Check npm version
   npm --version
   ```

3. **Google Chrome** (v88 or higher)

### Step-by-Step Installation

#### 1. Clone/Download the Repository

```powershell
cd "c:\Projects\TikTok Downloader"
```

#### 2. Install Dependencies

```powershell
cd tiktok-video-downloader
npm install
```

#### 3. Build the Extension

For development:
```powershell
npm run dev
```

For production:
```powershell
npm run build
```

#### 4. Load in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `tiktok-video-downloader` folder
5. Copy the generated **Extension ID**

#### 5. Configure OAuth (See Configuration section)

---

## Configuration

### Google Cloud Console Setup

#### Create Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **New Project**
3. Name: `TikTok Video Downloader`
4. Click **Create**

#### Enable APIs

Navigate to **APIs & Services → Library** and enable:

| API | Purpose |
|-----|---------|
| Google Drive API | Upload videos to Drive |
| Google Sheets API | Log downloads to Sheets |

#### Configure OAuth Consent Screen

1. Go to **APIs & Services → OAuth consent screen**
2. Select **External** user type
3. Fill required fields:
   - App name: `TikTok Video Downloader`
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/drive.file`
   - `https://www.googleapis.com/auth/spreadsheets`
5. Add test users (your Google email)

#### Create OAuth Credentials

1. Go to **APIs & Services → Credentials**
2. Click **+ Create Credentials → OAuth client ID**
3. Application type: **Chrome Extension**
4. Enter your Extension ID from Chrome
5. Copy the generated **Client ID**

### Update manifest.json

```json
{
  "oauth2": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "scopes": [
      "https://www.googleapis.com/auth/drive.file",
      "https://www.googleapis.com/auth/spreadsheets"
    ]
  }
}
```

### Extension Options

Access via Chrome extension options or the settings button in popup:

| Setting | Default | Description |
|---------|---------|-------------|
| Drive Folder | "TikTok Downloads" | Destination folder name |
| Sheet Name | "TikTok Download Log" | Log spreadsheet name |
| Auto-log | Enabled | Automatically log downloads |

---

## User Guide

### Getting Started

#### First-Time Setup

1. **Click the extension icon** in Chrome toolbar
2. **Click "Connect Google Drive"**
3. **Sign in** with your Google account
4. **Grant permissions** for Drive and Sheets access
5. You're ready to download!

### Downloading Videos

#### Method 1: From Video Page

1. Navigate to a TikTok video URL
2. Click the extension icon
3. Verify video info is displayed
4. Click **"Download to Drive"**
5. Wait for completion

#### Method 2: From Feed

1. Browse TikTok For You Page or Following feed
2. When a video you want is playing
3. Click the extension icon
4. Download the currently displayed video

### Viewing Downloads

#### In Google Drive

1. Open [Google Drive](https://drive.google.com/)
2. Navigate to "TikTok Downloads" folder
3. Videos are named: `@username_videoID.mp4`

#### In Download Log

1. Open "TikTok Download Log" in Google Sheets
2. Columns include:
   - **Timestamp**: When downloaded
   - **TikTok URL**: Original video URL
   - **Drive Link**: Direct link to file
   - **File Name**: Saved filename
   - **Username**: Creator's username
   - **Status**: Success/Failed

### Managing Downloads

#### View Statistics

- **Total Downloads**: Lifetime download count
- **Total Uploads**: Successful Drive uploads
- **Recent Activity**: Last 10 downloads

#### Clear Statistics

1. Click the stats icon (bar chart) in popup
2. Click **"Clear Stats"**
3. Confirm to reset counters

---

## API Reference

### Rate Limiting

The extension includes a token bucket rate limiter for API calls:

```javascript
// Available pre-configured limiters
const { rateLimiters, withRateLimit, canMakeRequest, getWaitTimeForService } = require('./utils/ratelimit');

// Check if request can be made
if (canMakeRequest('googleDrive')) {
  // Make API call
}

// Wait for token before making request
await rateLimiters.googleDrive.waitForToken();

// Wrap function with rate limiting
const limitedFetch = withRateLimit(fetch, 'googleDrive');
```

#### Pre-configured Limiters

| Service | Tokens/Second | Max Tokens | Purpose |
|---------|---------------|------------|---------|
| `googleDrive` | 5 | 10 | Google Drive API calls |
| `googleSheets` | 2 | 5 | Google Sheets API calls |
| `videoFetch` | 3 | 6 | TikTok video fetching |

### Message Types

The extension uses Chrome message passing. Here are the available message types:

#### Authentication

| Message Type | Payload | Response |
|--------------|---------|----------|
| `GET_AUTH_STATUS` | None | `{ authenticated: boolean }` |
| `AUTHENTICATE` | None | `{ success: boolean, error?: string }` |
| `SIGN_OUT` | None | `{ success: boolean }` |

#### Downloads

| Message Type | Payload | Response |
|--------------|---------|----------|
| `DOWNLOAD_VIDEO` | `{ url, filename }` | `{ success, driveId?, error? }` |
| `CANCEL_DOWNLOAD` | `{ downloadId }` | `{ success: boolean }` |
| `GET_DOWNLOAD_STATUS` | `{ downloadId }` | `{ status, progress }` |

#### Video Detection

| Message Type | Payload | Response |
|--------------|---------|----------|
| `GET_VIDEO_INFO` | None | `{ found, url?, username?, videoId? }` |
| `VIDEO_DETECTED` | `{ url, username }` | None (broadcast) |

#### Storage

| Message Type | Payload | Response |
|--------------|---------|----------|
| `GET_STATS` | None | `{ downloads, uploads }` |
| `CLEAR_STATS` | None | `{ success: boolean }` |
| `GET_ACTIVITY` | `{ limit? }` | `{ activities: [] }` |

### Content Script API

#### Injected Script Events

```javascript
// Dispatched when video URL is intercepted
window.dispatchEvent(new CustomEvent('tiktok-video-url', {
  detail: { url: 'video-url-here' }
}));
```

---

## File Structure

```
tiktok-video-downloader/
│
├── manifest.json              # Extension manifest (MV3)
├── package.json               # Node.js dependencies
├── webpack.config.js          # Build configuration
├── jest.config.js             # Test configuration
├── .eslintrc.json             # ESLint configuration
├── README.md                  # Quick start guide
├── SETUP-GUIDE.md             # Detailed setup instructions
├── DOCUMENTATION-GUIDE.md     # This file
├── ASSESSMENT-GUIDE.md        # Extension assessment & recommendations
│
├── assets/
│   └── icons/
│       ├── icon16.png         # Toolbar icon
│       ├── icon32.png         # Extension list icon
│       ├── icon48.png         # Extension page icon
│       └── icon128.png        # Store listing icon
│
├── src/
│   ├── background/
│   │   └── service-worker.js  # Background service worker
│   │
│   ├── content/
│   │   ├── tiktok.js          # Main content script
│   │   └── injected.js        # XHR/Fetch interceptor
│   │
│   ├── popup/
│   │   ├── popup.html         # Popup structure
│   │   ├── popup.js           # Popup logic
│   │   └── popup.css          # Popup styling
│   │
│   ├── options/
│   │   ├── options.html       # Options page structure
│   │   ├── options.js         # Options logic
│   │   └── options.css        # Options styling
│   │
│   └── utils/
│       ├── constants.js       # Shared constants
│       ├── validation.js      # Input validation utilities
│       ├── errors.js          # Error codes and messages
│       ├── retry.js           # Retry with exponential backoff
│       ├── network.js         # Offline detection utilities
│       └── ratelimit.js       # Token bucket rate limiting
│
├── scripts/
│   └── create-icons.js        # Icon generation utility
│
├── tests/
│   ├── mocks/
│   │   └── chrome.mock.js     # Chrome API mocks
│   ├── content.test.js        # Content script tests (44 tests)
│   ├── errors.test.js         # Error definitions tests (6 tests)
│   ├── network.test.js        # Network utility tests (11 tests)
│   ├── options.test.js        # Options page tests (30 tests)
│   ├── popup.test.js          # Popup logic tests (21 tests)
│   ├── ratelimit.test.js      # Rate limiter tests (21 tests)
│   ├── retry.test.js          # Retry utility tests (15 tests)
│   ├── service-worker.test.js # Service worker tests (12 tests)
│   ├── tiktok.test.js         # TikTok URL pattern tests (11 tests)
│   ├── validation.test.js     # Validation utility tests (24 tests)
│   └── setup.js               # Test setup configuration
│
└── dist/                      # Production build output
```

---

## Development Guide

### Setting Up Development Environment

```powershell
# Install dependencies
npm install

# Start development mode with watch
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run tests
npm test
```

### Code Style

- **JavaScript:** ES6+ features
- **Formatting:** 2-space indentation
- **Naming:** camelCase for variables/functions, PascalCase for classes

### Adding New Features

1. **Plan the feature** - Define scope and affected components
2. **Update constants** - Add any new configuration values
3. **Modify service worker** - Add message handlers if needed
4. **Update content scripts** - Add TikTok page integration
5. **Update popup/options** - Add UI elements
6. **Test thoroughly** - Write unit tests
7. **Update documentation** - Document changes

### Debugging

#### Service Worker

1. Go to `chrome://extensions/`
2. Find the extension
3. Click **"Service Worker"** link
4. DevTools opens for background script

#### Content Scripts

1. Open TikTok in Chrome
2. Press F12 to open DevTools
3. Go to **Console** tab
4. Filter by extension name

#### Popup

1. Right-click extension icon
2. Select **"Inspect popup"**
3. DevTools opens for popup

---

## Testing

### Test Suite Overview

The extension includes comprehensive test coverage:

| Test File | Tests | Description |
|-----------|-------|-------------|
| `content.test.js` | 44 | Content script functionality |
| `errors.test.js` | 6 | Error definitions and helpers |
| `network.test.js` | 11 | Network utilities |
| `options.test.js` | 30 | Options page logic |
| `popup.test.js` | 21 | Popup interface logic |
| `ratelimit.test.js` | 21 | Rate limiting utilities |
| `retry.test.js` | 15 | Retry mechanism |
| `service-worker.test.js` | 12 | Background service worker |
| `tiktok.test.js` | 11 | TikTok URL patterns |
| `validation.test.js` | 24 | Input validation |
| **Total** | **187** | All tests passing |

### Running Tests

```powershell
# Run all tests
npm test

# Run tests with coverage
npm test -- --coverage

# Run specific test file
npm test -- tests/tiktok.test.js
```

### Test Structure

```javascript
describe('Component Name', () => {
  beforeEach(() => {
    // Setup
  });

  test('should do something', () => {
    // Test logic
    expect(result).toBe(expected);
  });
});
```

### Manual Testing Checklist

- [ ] Extension loads without errors
- [ ] OAuth flow completes successfully
- [ ] Video detection works on all URL types
- [ ] Download completes and uploads to Drive
- [ ] Log entry appears in Sheets
- [ ] Statistics update correctly
- [ ] Cancel download works
- [ ] Sign out clears session

---

## Troubleshooting

### Common Issues

#### Extension Won't Load

| Symptom | Cause | Solution |
|---------|-------|----------|
| "Manifest file is invalid" | JSON syntax error | Check manifest.json for errors |
| "Could not load icon" | Missing icon files | Run `npm run create-icons` |
| No errors but blank popup | JS error in popup | Check popup console |

#### Authentication Fails

| Symptom | Cause | Solution |
|---------|-------|----------|
| "OAuth error" | Wrong Client ID | Update manifest.json with correct ID |
| "Access denied" | Not a test user | Add email to test users in Cloud Console |
| Popup blocked | Browser settings | Allow popups for chrome-extension:// |

#### Downloads Fail

| Symptom | Cause | Solution |
|---------|-------|----------|
| "No video detected" | Video not loaded | Refresh page, wait for video |
| "CORS error" | Network blocking | Try different video, check internet |
| "Upload failed" | Token expired | Sign out and sign back in |

### Error Codes

| Code | Message | Resolution |
|------|---------|------------|
| `AUTH_001` | Invalid OAuth token | Re-authenticate |
| `AUTH_002` | Scope not granted | Check OAuth scopes |
| `DL_001` | Video URL not found | Refresh TikTok page |
| `DL_002` | Download timeout | Check internet, retry |
| `UP_001` | Drive upload failed | Check Drive quota |
| `UP_002` | Folder not found | Extension will create folder |
| `LOG_001` | Sheet logging failed | Check Sheets API status |

---

## Security

### Permissions Explained

| Permission | Purpose | Why Needed |
|------------|---------|------------|
| `identity` | OAuth authentication | Google sign-in |
| `storage` | Local data storage | Save stats and preferences |
| `activeTab` | Current tab access | Detect video on page |
| `scripting` | Script injection | Insert content scripts |

### Data Handling

- **No external servers** - All processing done locally
- **OAuth tokens** - Stored securely in Chrome
- **Video data** - Only uploaded to your Drive
- **Download logs** - Only written to your Sheets

### Best Practices

1. **Keep credentials private** - Never share your OAuth Client ID publicly
2. **Use test users** - Only authorized users can use the extension
3. **Review permissions** - Only grant necessary access
4. **Monitor activity** - Check Drive/Sheets for unexpected access

---

## FAQ

### General

**Q: Is this extension free?**  
A: Yes, completely free to use.

**Q: Does it work with private videos?**  
A: Only videos you can view can be downloaded.

**Q: What video quality is downloaded?**  
A: The highest quality available from TikTok.

### Technical

**Q: Why do I need to connect Google?**  
A: To save videos to your Drive and log downloads to Sheets.

**Q: Can I use a different cloud storage?**  
A: Currently only Google Drive is supported.

**Q: Does it work on mobile?**  
A: No, Chrome extensions only work on desktop.

### Troubleshooting

**Q: Why is my video not detected?**  
A: Make sure the video is fully loaded and visible on screen.

**Q: Why does authentication keep failing?**  
A: Check that your Extension ID matches the OAuth credentials.

**Q: Where are my downloads?**  
A: In Google Drive under "TikTok Downloads" folder.

---

## Changelog

### Version 1.0.0 (December 2025)

**Initial Release**
- One-click video downloading
- Google Drive integration
- Google Sheets logging
- Progress tracking UI
- Statistics dashboard
- Activity feed
- Options page for configuration
- Support for multiple URL formats

**Enhancement Phase**
- Input validation utilities (validation.js)
- Structured error handling (errors.js)
- Retry mechanism with exponential backoff (retry.js)
- Network connectivity detection (network.js)
- Rate limiting utilities (ratelimit.js)
- Content Security Policy
- Accessibility improvements (ARIA labels)
- Comprehensive test suite (187 tests)
- Copyright-free icon design

---

## Support & Contributing

### Getting Help

1. Check this documentation
2. Review the [SETUP-GUIDE.md](SETUP-GUIDE.md)
3. Check browser console for errors
4. Check service worker logs

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

### License

This project is for personal use. Please respect TikTok's Terms of Service when downloading content.

---

**Documentation Complete** ✅

*This guide covers all aspects of the TikTok Video Downloader Chrome extension. For quick setup, refer to [SETUP-GUIDE.md](SETUP-GUIDE.md). For basic information, see [README.md](README.md).*
