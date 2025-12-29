# TikTok Video Downloader Chrome Extension

Download TikTok videos directly to Google Drive with automatic logging to Google Sheets.

## Features

- 🎵 **One-Click Download**: Download TikTok videos with a single click
- ☁️ **Google Drive Integration**: Videos are saved directly to your Google Drive
- 📊 **Automatic Logging**: All downloads are logged to Google Sheets
- 🎨 **TikTok-Inspired UI**: Clean, dark interface with TikTok's color scheme
- 📱 **Multiple URL Support**: Works with standard videos, short URLs, and feed videos
- 🔒 **Security**: Input validation, URL sanitization, Content Security Policy
- 🔄 **Reliability**: Retry mechanism with exponential backoff, network detection
- ✅ **Tested**: 188 tests covering all major functionality
- 🏠 **For You Page Support**: Downloads from FYP and homepage
- 📁 **Custom Folder Support**: Save to shared Google Drive folders ✨ NEW
- 📋 **Custom Spreadsheet Support**: Log to shared team spreadsheets ✨ NEW

## Installation

### Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Build the extension:
   ```bash
   npm run build
   ```
4. Load the extension in Chrome:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select the `dist` folder (or the project root for non-bundled version)

### OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project: "TikTok Video Downloader"
3. Enable the following APIs:
   - Google Drive API
   - Google Sheets API
4. Create OAuth 2.0 credentials:
   - Application type: Chrome Extension
   - Add your extension ID to authorized origins
5. Update `manifest.json` with your OAuth client ID

## Usage

1. Navigate to any TikTok video page
2. Click the extension icon in your toolbar
3. Connect to Google Drive (first time only)
4. Click "Download to Drive"
5. Video will be saved to "TikTok Downloads" folder in your Drive

## Project Structure

```
tiktok-video-downloader/
├── src/
│   ├── background/
│   │   └── service-worker.js    # Auth, Drive upload, Sheets logging
│   ├── content/
│   │   ├── tiktok.js            # Video detection & extraction
│   │   └── injected.js          # XHR/Fetch interceptor
│   ├── popup/
│   │   ├── popup.html           # UI structure (with ARIA labels)
│   │   ├── popup.js             # UI logic
│   │   └── popup.css            # Styling
│   ├── options/
│   │   ├── options.html         # Settings page
│   │   ├── options.js           # Settings logic
│   │   └── options.css          # Settings styling
│   └── utils/
│       ├── constants.js         # API endpoints, patterns
│       ├── validation.js        # Input validation & sanitization
│       ├── errors.js            # Error codes & messages
│       ├── retry.js             # Retry with exponential backoff
│       ├── network.js           # Connectivity detection
│       └── ratelimit.js         # API rate limiting
├── tests/                       # 188 tests
├── assets/icons/                # Extension icons
├── manifest.json                # MV3 manifest
└── package.json
```

## Supported URL Formats

- Standard video: `https://www.tiktok.com/@username/video/1234567890`
- Short URL: `https://vm.tiktok.com/ABC123/`
- Mobile URL: `https://m.tiktok.com/v/1234567890`
- For You Page videos
- Following feed videos
- Profile page videos

## Google Sheets Log Format

| Timestamp | TikTok URL | Drive Link | File Name | Username | Description | Status |
|-----------|------------|------------|-----------|----------|-------------|--------|

## Custom Folder & Spreadsheet Support

### Using a Custom Google Drive Folder

1. Go to extension settings (right-click icon → Options)
2. Check "Use custom Drive folder"
3. Enter the folder ID (found in the folder URL: `drive.google.com/drive/folders/XXXXX`)
4. Click "Test Folder Access" to verify
5. Save settings

**For shared folders**: You need "Editor" access. Ask the folder owner to share it with you.

### Using a Custom Spreadsheet

1. Go to extension settings
2. Check "Use custom spreadsheet ID"
3. Enter the spreadsheet ID (found in the URL: `docs.google.com/spreadsheets/d/XXXXX/edit`)
4. Click "Test Spreadsheet Access" to verify
5. Save settings

**Note**: The extension will auto-create a "Downloads" sheet tab if it doesn't exist.

## Development

```bash
# Watch mode for development
npm run dev

# Build for production
npm run build

# Run linter
npm run lint

# Run tests
npm test
```

## Known Limitations

- TikTok's anti-bot measures may occasionally block video downloads
- Some region-locked videos may not be accessible
- Blob URLs cannot be downloaded directly (requires interceptor)

## Troubleshooting

1. **Video not detected**: Refresh the TikTok page and try again
2. **Download failed**: Check if you're signed into Google Drive
3. **No video URL found**: TikTok may have changed their API structure

## License

MIT

## Credits

Based on the architecture of the Instagram Video Downloader extension.
