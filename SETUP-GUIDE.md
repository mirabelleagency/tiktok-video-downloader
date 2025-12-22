# TikTok Video Downloader - Complete Setup Guide

This guide walks you through everything needed to get the TikTok Video Downloader Chrome extension up and running.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Google Cloud Setup](#google-cloud-setup)
3. [Extension Installation](#extension-installation)
4. [First-Time Configuration](#first-time-configuration)
5. [Usage Guide](#usage-guide)
6. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before starting, ensure you have:

- ✅ **Google Chrome** browser (version 88 or higher)
- ✅ **Node.js** (version 16 or higher) - [Download here](https://nodejs.org/)
- ✅ **Google Account** for Drive/Sheets access
- ✅ **Git** (optional, for version control)

---

## Google Cloud Setup

This is the most important step. You need to create OAuth credentials to allow the extension to access Google Drive and Sheets.

### Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click the project dropdown at the top → **"New Project"**
3. Enter project name: `TikTok Video Downloader`
4. Click **"Create"**
5. Wait for the project to be created, then select it

### Step 2: Enable Required APIs

1. Go to **APIs & Services** → **Library**
2. Search for and enable these APIs:
   - **Google Drive API** - Click on it → Click **"Enable"**
   - **Google Sheets API** - Click on it → Click **"Enable"**

### Step 3: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Select **"External"** user type → Click **"Create"**
3. Fill in the required fields:
   - **App name**: `TikTok Video Downloader`
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. Click **"Save and Continue"**
5. On the **Scopes** page:
   - Click **"Add or Remove Scopes"**
   - Search and add these scopes:
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/spreadsheets`
   - Click **"Update"** → **"Save and Continue"**
6. On **Test users** page:
   - Click **"Add Users"**
   - Add your Google email address
   - Click **"Save and Continue"**
7. Review and click **"Back to Dashboard"**

### Step 4: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **"+ Create Credentials"** → **"OAuth client ID"**
3. Select Application type: **"Chrome Extension"**
4. Enter name: `TikTok Downloader Extension`
5. For **Item ID**, you'll need your extension ID (we'll get this in the next section)
   - For now, enter a placeholder: `aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa`
6. Click **"Create"**
7. **Copy the Client ID** - you'll need this! It looks like:
   ```
   123456789-abcdefghijklmnop.apps.googleusercontent.com
   ```

### Step 5: Update Client ID in Extension

After getting your OAuth Client ID, update the manifest:

1. Open `tiktok-video-downloader/manifest.json`
2. Find the `oauth2` section
3. Replace `YOUR_OAUTH_CLIENT_ID.apps.googleusercontent.com` with your actual Client ID

```json
"oauth2": {
  "client_id": "YOUR_ACTUAL_CLIENT_ID.apps.googleusercontent.com",
  "scopes": [
    "https://www.googleapis.com/auth/drive.file",
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}
```

---

## Extension Installation

### Option A: Development Mode (Recommended for testing)

1. **Open terminal in the project folder:**
   ```powershell
   cd "c:\Projects\TikTok Downloader\tiktok-video-downloader"
   ```

2. **Install dependencies:**
   ```powershell
   npm install
   ```

3. **Create placeholder icons** (or use real ones):
   
   For quick testing, create simple 1x1 pixel PNG files:
   ```powershell
   # Create minimal placeholder icons
   # You can replace these with proper icons later
   ```
   
   Or use an online tool to create proper icons from the SVG in `assets/icons/`

4. **Load the extension in Chrome:**
   - Open Chrome and go to: `chrome://extensions/`
   - Enable **"Developer mode"** (toggle in top-right)
   - Click **"Load unpacked"**
   - Select the `tiktok-video-downloader` folder
   - The extension should appear in your extensions list

5. **Get your Extension ID:**
   - After loading, you'll see an ID like: `abcdefghijklmnopqrstuvwxyz123456`
   - **Copy this ID**

6. **Update Google Cloud OAuth Credentials:**
   - Go back to [Google Cloud Console](https://console.cloud.google.com/)
   - Go to **APIs & Services** → **Credentials**
   - Click on your OAuth 2.0 Client ID
   - Update the **Item ID** field with your actual extension ID
   - Click **"Save"**

7. **Reload the extension:**
   - Go to `chrome://extensions/`
   - Click the refresh icon on your extension

### Option B: Build for Production

1. **Build the extension:**
   ```powershell
   npm run build
   ```

2. **Load from dist folder:**
   - In Chrome extensions page, load unpacked from the `dist` folder

---

## First-Time Configuration

### Connect to Google Drive

1. Click the TikTok Downloader extension icon in Chrome toolbar
2. Click **"Connect Google Drive"**
3. A Google sign-in popup will appear
4. Select your Google account
5. Review permissions and click **"Allow"**
6. The extension should now show "Connected"

### What Gets Created Automatically

Once connected, the extension automatically creates:

1. **Google Drive Folder**: `TikTok Downloads`
   - All downloaded videos are saved here
   - Check your Drive root folder

2. **Google Sheet**: `TikTok Download Log`
   - Logs all downloads with timestamps
   - Columns: Timestamp | TikTok URL | Drive Link | File Name | Username | Status

---

## Usage Guide

### Downloading a Video

1. **Navigate to a TikTok video:**
   - Go to `https://www.tiktok.com/@username/video/123456789`
   - Or browse your For You Page

2. **Click the extension icon**

3. **Video info appears:**
   - Username
   - Video ID
   - Description preview

4. **Click "Download to Drive"**

5. **Wait for completion:**
   - Progress bar shows status
   - "Fetching video..." → "Uploading to Drive..." → "Complete!"

6. **Access your video:**
   - Click "Open in Drive" to view
   - Or check "TikTok Downloads" folder in Drive

### Supported URL Formats

| Format | Example |
|--------|---------|
| Standard | `https://www.tiktok.com/@user/video/123` |
| Short URL | `https://vm.tiktok.com/ABC123/` |
| Mobile | `https://m.tiktok.com/v/123` |
| For You Page | Videos while scrolling FYP |
| Following | Videos in Following feed |
| Profile | Videos on user profiles |

---

## Troubleshooting

### "Not connected to Google Drive"

**Solution:**
1. Click "Connect Google Drive"
2. Make sure popup blocker isn't blocking the auth window
3. Check that your email is added as a test user in Google Cloud Console

### "No video detected"

**Solution:**
1. Make sure you're on a TikTok video page
2. Wait for the video to fully load
3. Refresh the page and try again
4. For feed videos, scroll until the video is centered on screen

### "Download failed"

**Possible causes:**
1. **CORS/Network issues**: TikTok may be blocking the request
   - Try refreshing the TikTok page
   - Try a different video
   
2. **Token expired**: 
   - Sign out and sign back in
   
3. **Regional restrictions**:
   - Some videos may be region-locked

### "Authorization error"

**Solution:**
1. Verify OAuth credentials in Google Cloud Console
2. Make sure extension ID matches the one in OAuth settings
3. Ensure Drive API and Sheets API are enabled
4. Check that your email is in test users list

### Extension not showing in toolbar

**Solution:**
1. Click the puzzle piece icon in Chrome toolbar
2. Find "TikTok Video Downloader"
3. Click the pin icon to pin it to toolbar

---

## File Locations Reference

| What | Where |
|------|-------|
| Downloaded Videos | Google Drive → "TikTok Downloads" folder |
| Download Log | Google Drive → "TikTok Download Log" spreadsheet |
| Extension Settings | Chrome → chrome://extensions/ |
| OAuth Credentials | [Google Cloud Console](https://console.cloud.google.com/) |

---

## Quick Reference: Key Files to Edit

| File | Purpose | When to Edit |
|------|---------|--------------|
| `manifest.json` | OAuth Client ID | After getting credentials |
| `src/utils/constants.js` | Drive folder name, sheet name | If you want different names |
| `src/popup/popup.css` | Styling | To customize appearance |

---

## Support

If you encounter issues:

1. Check the browser console (F12 → Console) for errors
2. Check the extension's service worker logs:
   - Go to `chrome://extensions/`
   - Click "Service Worker" under the extension
   - Look for error messages

---

## Security Notes

- Your OAuth credentials should be kept private
- The extension only requests access to files it creates (drive.file scope)
- Downloaded videos are stored in your personal Google Drive
- No data is sent to third parties

---

**Setup Complete! 🎉**

You're ready to start downloading TikTok videos directly to your Google Drive!
