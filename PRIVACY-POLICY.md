# Privacy Policy for TikTok Video Downloader to Drive

**Last Updated: December 24, 2024**

## Overview

TikTok Video Downloader to Drive ("the Extension") is a Chrome browser extension that allows users to download TikTok videos directly to their Google Drive account. This Privacy Policy explains how we collect, use, and protect your information.

## Information We Collect

### Information You Provide
- **Google Account Access**: When you connect to Google Drive, we access your Google account through OAuth 2.0 authentication to enable file uploads and spreadsheet logging.

### Information Collected Automatically
- **TikTok Video URLs**: When you initiate a download, the Extension reads the TikTok video URL from the current page.
- **Video Metadata**: Creator username, video ID, and timestamps are collected for organizational purposes.

### Information We Do NOT Collect
- Personal identification information beyond what's necessary for Google Drive access
- Browsing history outside of TikTok pages
- Cookies or tracking data
- Analytics or usage statistics
- IP addresses
- Device identifiers

## How We Use Your Information

### Google Drive Integration
- **Purpose**: Upload downloaded videos to your Google Drive
- **Scope**: `drive.file` - We can only access files created by the Extension
- **Storage**: Videos are stored in a "TikTok Downloads" folder in YOUR Drive

### Google Sheets Logging
- **Purpose**: Maintain a log of your downloads for your reference
- **Scope**: `spreadsheets` - We create and update a single spreadsheet
- **Data Logged**: Timestamp, TikTok URL, Drive link, filename, creator username, status

### Email Access
- **Purpose**: Display which Google account is connected
- **Scope**: `userinfo.email` - Read-only access to your email address
- **Usage**: Shown in the extension popup for user confirmation

## Data Storage and Security

### Local Storage Only
- User preferences (folder settings, logging options) are stored locally in Chrome's `storage.sync`
- No data is transmitted to external servers owned by us
- All video transfers go directly from TikTok to Google's servers

### No External Servers
This Extension does NOT:
- Send data to any server other than Google's APIs
- Use third-party analytics services
- Store any user data externally
- Track user behavior

### Data Retention
- Local preferences: Stored until extension is uninstalled or cleared
- Google Drive files: Remain in YOUR Drive until YOU delete them
- Google Sheets logs: Remain in YOUR Sheets until YOU delete them

## Third-Party Services

### Google APIs
This Extension uses official Google APIs:
- Google Drive API
- Google Sheets API
- Google Identity Services

These services are governed by [Google's Privacy Policy](https://policies.google.com/privacy).

### TikTok
The Extension accesses publicly available video data from TikTok. TikTok's data practices are governed by [TikTok's Privacy Policy](https://www.tiktok.com/legal/privacy-policy).

## Permissions Explained

| Permission | Why We Need It |
|------------|----------------|
| `identity` | To authenticate with Google for Drive/Sheets access |
| `storage` | To save your local preferences |
| `activeTab` | To read the TikTok URL when you click download |
| `scripting` | To inject scripts that detect video URLs on TikTok pages |
| `tiktok.com` host access | To access TikTok pages and detect video content |
| `googleapis.com` host access | To communicate with Google Drive and Sheets APIs |

## User Rights

You have the right to:
- **Access**: View what data the Extension has stored locally (via Chrome's extension storage)
- **Delete**: Remove all local data by uninstalling the Extension
- **Revoke**: Remove Google account access at any time via [Google Account Permissions](https://myaccount.google.com/permissions)
- **Control**: Choose whether to enable download logging

## Children's Privacy

This Extension is not intended for use by children under 13 years of age. We do not knowingly collect information from children under 13.

## Changes to This Privacy Policy

We may update this Privacy Policy from time to time. We will notify users of any material changes by updating the "Last Updated" date at the top of this policy.

## Open Source

The source code for this Extension is available for review, ensuring transparency in how your data is handled.

## Contact

If you have questions about this Privacy Policy or the Extension's data practices, please contact:

**Email**: [Your Contact Email]
**GitHub**: [Your GitHub Repository URL]

## Consent

By using this Extension, you consent to this Privacy Policy.

---

*This Extension is not affiliated with, endorsed by, or sponsored by TikTok, ByteDance, or Google.*
