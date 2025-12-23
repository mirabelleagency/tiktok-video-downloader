# Chrome Web Store Submission Guide

## TikTok Video Downloader Extension

This guide walks you through every step to publish your extension to the Chrome Web Store.

---

## 📋 Pre-Submission Checklist

- [x] Developer account created and fee paid ($5) ✅ DONE
- [ ] OAuth consent screen verified by Google
- [ ] Privacy policy created and hosted online
- [ ] Store listing assets prepared
- [ ] Extension built and packaged
- [ ] Manifest.json updated for production

---

## Step 1: Create a Chrome Web Store Developer Account

### 1.1 Register
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Sign in with your Google Account
3. Pay the **one-time $5 registration fee**
4. Accept the Developer Agreement

### 1.2 Verify Your Identity (Required for new developers)
- Google may require identity verification
- This typically takes 2-3 business days
- You cannot publish until verification is complete

---

## Step 2: Google OAuth Verification (CRITICAL)

Since your extension uses sensitive OAuth scopes, Google requires verification.

### 2.1 Prepare Your OAuth Consent Screen

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project: **TikTok Video Downloader**
3. Navigate to: **APIs & Services** → **OAuth consent screen**

### 2.2 Configure Consent Screen

Fill in the following:

| Field | Value |
|-------|-------|
| App name | TikTok Video Downloader to Drive |
| User support email | your-email@gmail.com |
| App logo | Upload your 128x128 icon |
| Application home page | Your website or GitHub repo URL |
| Application privacy policy link | URL where you'll host privacy policy |
| Application terms of service link | (optional) |
| Authorized domains | Your domain (e.g., github.io) |
| Developer contact email | your-email@gmail.com |

### 2.3 Scopes Configuration

Your extension uses these scopes (already in manifest.json):
- `https://www.googleapis.com/auth/drive.file` - Create and manage Drive files
- `https://www.googleapis.com/auth/spreadsheets` - Read/write Google Sheets
- `https://www.googleapis.com/auth/userinfo.email` - View email address

### 2.4 Submit for Verification

1. In OAuth consent screen, click **"Prepare for verification"**
2. Provide justification for each scope:
   - **drive.file**: "Store downloaded TikTok videos in user's Google Drive"
   - **spreadsheets**: "Log download history to a Google Sheet for user reference"
   - **userinfo.email**: "Display user's email to confirm which account is connected"
3. Upload a YouTube video demonstrating your extension (unlisted is fine)
4. Submit and wait for Google's review (can take 1-4 weeks)

> **⚠️ IMPORTANT**: Your extension will NOT work for other users until OAuth is verified!

---

## Step 3: Create and Host Privacy Policy

### 3.1 Create Privacy Policy

I've created a privacy policy file at `PRIVACY-POLICY.md`. You need to:

1. Host it online (options below)
2. Update the URL in Google Cloud Console
3. Include URL in Chrome Web Store listing

### 3.2 Hosting Options

**Option A: GitHub Pages (Free & Easy)**
1. Create a GitHub repo for your extension (if not already)
2. Enable GitHub Pages in repo settings
3. Create `docs/privacy-policy.html` 
4. Your URL will be: `https://yourusername.github.io/repo-name/privacy-policy.html`

**Option B: Google Sites (Free)**
1. Go to [Google Sites](https://sites.google.com/)
2. Create a new site
3. Add a page with your privacy policy
4. Publish and use the public URL

**Option C: Your Own Website**
- Host at any URL you control

---

## Step 4: Prepare Store Listing Assets

### 4.1 Required Assets

| Asset | Size | Notes |
|-------|------|-------|
| Icon | 128x128 | ✅ Already have |
| Screenshot 1 | 1280x800 or 640x400 | Required - Show extension in action |

### 4.2 Recommended Assets

| Asset | Size | Notes |
|-------|------|-------|
| Small Promo Tile | 440x280 | Shown in search results |
| Large Promo Tile | 920x680 | Featured listing |
| Marquee Promo | 1400x560 | Homepage feature (rare) |

### 4.3 Screenshot Suggestions

Take screenshots showing:
1. **Extension popup** on a TikTok video page
2. **Download in progress** state
3. **Google Drive folder** with downloaded videos
4. **Google Sheet** with download log
5. **Options page** showing settings

### 4.4 Creating Screenshots

```powershell
# Use Windows Snipping Tool or:
# 1. Open Chrome DevTools (F12)
# 2. Click device toolbar icon
# 3. Set to 1280x800
# 4. Take screenshot
```

---

## Step 5: Update Manifest for Production

### 5.1 Remove Development Key

Edit `manifest.json` and remove the entire `key` field:

```json
// REMOVE THIS LINE:
"key": "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAk5fF7A...",
```

> The Chrome Web Store assigns its own key when you publish.

### 5.2 Final Manifest Checklist

- [x] `manifest_version`: 3
- [x] `name`: Descriptive name
- [x] `version`: Semantic versioning (1.0.0)
- [x] `description`: Clear, under 132 characters
- [x] `icons`: All sizes (16, 32, 48, 128)
- [ ] `key`: REMOVED for production

---

## Step 6: Build and Package Extension

### 6.1 Build for Production

```powershell
cd "c:\Projects\TikTok Downloader\tiktok-video-downloader"
npm run build
```

### 6.2 Create ZIP Package

**Option A: Using PowerShell**
```powershell
# From the extension directory
$excludeItems = @('node_modules', '.git', 'coverage', '*.md', 'tests')
Compress-Archive -Path * -DestinationPath tiktok-downloader-v1.0.0.zip -Force
```

**Option B: Manual**
1. Create a new folder with only these items:
   - `manifest.json` (with key removed)
   - `src/` folder
   - `assets/` folder
   - `dist/` folder (if using webpack build)
2. ZIP the folder

### 6.3 What to EXCLUDE from ZIP

- `node_modules/`
- `.git/`
- `coverage/`
- `tests/`
- `*.md` files (except if referenced)
- `package.json`
- `package-lock.json`
- `webpack.config.js`
- `jest.config.js`
- Development scripts

---

## Step 7: Submit to Chrome Web Store

### 7.1 Upload Extension

1. Go to [Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Click **"New Item"**
3. Upload your ZIP file
4. Wait for initial validation

### 7.2 Fill Out Store Listing

#### Basic Information

| Field | Recommended Value |
|-------|-------------------|
| Language | English (United States) |
| Title | TikTok Video Downloader to Drive |
| Summary | Download TikTok videos directly to Google Drive with automatic logging |

#### Detailed Description
```
📥 Download TikTok videos directly to your Google Drive!

FEATURES:
• One-click video downloads from any TikTok page
• Automatic upload to Google Drive
• Download history logged to Google Sheets
• Works with all TikTok URL formats
• Clean, TikTok-inspired dark interface
• Secure OAuth authentication

HOW IT WORKS:
1. Browse to any TikTok video
2. Click the extension icon
3. Connect to Google Drive (first time only)
4. Click "Download to Drive"
5. Video saved to "TikTok Downloads" folder

SUPPORTED URLS:
• Standard videos: tiktok.com/@user/video/123
• Short URLs: vm.tiktok.com/ABC123
• Mobile URLs: m.tiktok.com/v/123
• For You Page videos
• Following feed videos

PRIVACY:
• Your data stays in YOUR Google Drive
• No external servers
• No tracking or analytics
• Full source code available

REQUIREMENTS:
• Google Account for Drive/Sheets access
• Chrome browser

---
This extension is not affiliated with TikTok or ByteDance.
```

#### Category & Tags
- **Category**: Productivity
- **Tags**: tiktok, video downloader, google drive, social media

### 7.3 Privacy Tab

| Field | Value |
|-------|-------|
| Single purpose | Download TikTok videos to Google Drive |
| Permission justifications | See below |
| Privacy policy URL | Your hosted privacy policy URL |
| Data usage | User's TikTok URL data is used solely for downloading |

#### Permission Justifications

**identity**
> Required to authenticate users with Google OAuth for Google Drive and Google Sheets access. No identity information is stored or transmitted externally.

**storage**
> Used to store user preferences (download folder settings, logging preferences) locally in the browser. No data is sent to external servers.

**activeTab**
> Required to read the current TikTok page URL and detect video content for download. Only activates when user clicks the extension.

**scripting**
> Required to inject content scripts that detect and extract TikTok video URLs from the page DOM.

**Host Permissions (tiktok.com)**
> Required to access TikTok pages, detect video URLs, and intercept video stream data for downloading.

**Host Permissions (googleapis.com)**
> Required to upload videos to Google Drive and log downloads to Google Sheets via Google APIs.

### 7.4 Distribution Tab

- **Visibility**: Public
- **Countries**: All countries (unless you have restrictions)

---

## Step 8: Submit for Review

1. Click **"Submit for Review"**
2. Review process typically takes **1-3 business days**
3. You'll receive email notification when approved or if changes needed

---

## Common Rejection Reasons & Fixes

### 1. "Insufficient justification for permissions"
**Fix**: Provide more detailed explanations in the Privacy tab

### 2. "Missing privacy policy"
**Fix**: Host privacy policy and add URL to listing

### 3. "OAuth consent screen not verified"
**Fix**: Complete Google OAuth verification first

### 4. "Deceptive functionality"
**Fix**: Ensure description accurately describes what extension does

### 5. "Single purpose violation"
**Fix**: Remove any unrelated features; focus on video downloading

---

## Post-Publish Checklist

After approval:

- [ ] Test the published version from Chrome Web Store
- [ ] Verify OAuth works for new users
- [ ] Monitor reviews for issues
- [ ] Set up crash reporting (optional)
- [ ] Plan update schedule

---

## Updating Your Extension

When releasing updates:

1. Increment version in `manifest.json` (e.g., 1.0.1)
2. Build and create new ZIP
3. Go to Developer Dashboard
4. Click your extension → **"Package"** tab
5. Upload new ZIP
6. Submit for review

---

## Timeline Estimate

| Step | Time |
|------|------|
| Developer account setup | 1 day |
| OAuth verification | 1-4 weeks |
| Asset creation | 1-2 days |
| Submission | 30 minutes |
| Review process | 1-3 days |
| **Total** | **1-5 weeks** |

> The OAuth verification is usually the longest wait time.

---

## Quick Reference Links

- [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
- [Google Cloud Console](https://console.cloud.google.com/)
- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [Chrome Web Store Program Policies](https://developer.chrome.com/docs/webstore/program-policies/)
- [OAuth Verification FAQ](https://support.google.com/cloud/answer/9110914)

---

## Need Help?

If you encounter issues:
1. Check the [Chrome Extension FAQ](https://developer.chrome.com/docs/extensions/mv3/faq/)
2. Post on [Stack Overflow](https://stackoverflow.com/questions/tagged/google-chrome-extension)
3. Review [Chrome Web Store Support](https://support.google.com/chrome_webstore/)
