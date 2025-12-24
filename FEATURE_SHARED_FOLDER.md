# Feature: Shared Folder Support

**Branch:** `feature/shared-folder-support`  
**Created:** December 24, 2024  
**Status:** ✅ Implemented

---

## 📋 Overview

Allow users to specify a custom Google Drive folder ID to save downloaded videos. This enables saving to shared folders from other Google accounts, organizational drives, or any folder the user has write access to.

---

## 🎯 User Stories

1. **As a user**, I want to save videos to a shared team folder so my colleagues can access them.
2. **As a user**, I want to use an existing organized folder structure instead of a new "Instagram Downloads" folder.
3. **As a user**, I want to specify any folder I have access to, including shared drives.

---

## 🔍 Current Behavior Analysis

### How Folder ID is Currently Used

| Location | File | Current Behavior |
|----------|------|------------------|
| State | `service-worker.js:32` | `driveFolderId: null` in memory state |
| Storage | `service-worker.js:373` | Saved as `drive.folderId` |
| Init | `service-worker.js:331-375` | `initializeDriveFolder()` creates/finds folder by name |
| Upload | `service-worker.js:405` | Uses `state.driveFolderId` as parent |
| Settings | `options.js:39` | Only stores folder **name**, not ID |

### Current Flow

```
1. User authenticates
       ↓
2. initializeDriveFolder() called
       ↓
3. Search for folder by NAME in user's Drive
       ↓
4. If found → use existing folder ID
   If not → create new folder → get ID
       ↓
5. Store folder ID in state.driveFolderId
       ↓
6. All uploads use this folder ID
```

---

## 🚀 Proposed Changes

### New Settings

| Setting | Type | Default | Description |
|---------|------|---------|-------------|
| `useCustomFolderId` | boolean | `false` | Toggle custom folder mode |
| `customDriveFolderId` | string | `''` | User-provided folder ID |
| `customFolderName` | string | `''` | Display name (for UI only) |

### New Flow

```
1. User authenticates
       ↓
2. Check settings: useCustomFolderId?
       ↓
   YES → Validate custom folder ID (check write access)
         ↓
         Valid → Use custom ID
         Invalid → Show error, fall back to default
       ↓
   NO → Use existing initializeDriveFolder() logic
       ↓
3. All uploads use resolved folder ID
```

---

## ✅ Implementation Checklist

### Phase 1: Settings UI
- [x] Add "Custom Folder" section to options.html
- [x] Add toggle: "Use custom Drive folder"
- [x] Add input: "Folder ID" text field
- [x] Add input: "Folder Name" (optional, for display)
- [x] Add "Test Folder Access" button
- [x] Add status indicator (valid/invalid/checking)
- [x] Add help text explaining how to get folder ID

### Phase 2: Storage & State
- [x] Update DEFAULT_SETTINGS in options.js
- [x] Update initializeStorage() in service-worker.js
- [x] Add new settings to storage schema
- [x] Update getSettings() to include new fields
- [x] Update updateSettings() to handle new fields

### Phase 3: Folder Validation
- [x] Create validateFolderAccess() function
- [x] Check if folder exists
- [x] Check if user has write permissions
- [x] Handle shared drive folders
- [x] Return folder name for display
- [x] Handle errors gracefully

### Phase 4: Upload Integration
- [x] Modify initializeDriveFolder() to check custom setting
- [x] Skip folder creation when custom ID is set
- [x] Use custom ID directly in uploadToDrive()
- [x] Add fallback logic if custom folder becomes invalid

### Phase 5: Error Handling
- [x] Handle "folder not found" error
- [x] Handle "access denied" error
- [x] Handle "quota exceeded" error
- [x] Show user-friendly error messages
- [x] Add retry with default folder option

### Phase 6: Testing
- [x] Unit tests for validateFolderAccess()
- [x] Unit tests for modified initializeDriveFolder()
- [x] Integration test: upload to own folder
- [x] Integration test: upload to shared folder
- [x] Test error scenarios

### Phase 7: Documentation
- [x] Update README with new feature
- [x] Update CHANGELOG (Unreleased section)
- [x] Add help text to options page
- [x] Document how to find folder ID

---

## 📁 Files to Modify

| File | Changes |
|------|---------|
| `src/options/options.html` | Add custom folder UI section |
| `src/options/options.css` | Style new elements |
| `src/options/options.js` | Add folder validation logic |
| `src/background/service-worker.js` | Modify folder initialization |
| `tests/unit/service-worker.test.js` | Add new tests |
| `README.md` | Document feature |
| `CHANGELOG.md` | Add to Unreleased |

---

## 🔐 Permissions

### Current Permissions (No Change Needed)
- `https://www.googleapis.com/*` - Already covers Drive API
- `drive.file` scope - Works for files the app creates

### Considerations
- The `drive.file` scope only allows access to files the app creates
- For shared folders, the app needs to **create files inside** the folder
- This should work as long as user has Editor access to the shared folder
- No additional scopes needed

---

## 🎨 UI Design

### Options Page - New Section

```
┌─────────────────────────────────────────────────────┐
│  📁 Custom Drive Folder                             │
├─────────────────────────────────────────────────────┤
│                                                      │
│  □ Use custom Drive folder                           │
│                                                      │
│  When enabled, videos will be saved to the          │
│  specified folder instead of "Instagram Downloads"  │
│                                                      │
│  ─────────────────────────────────────────────────  │
│                                                      │
│  Folder ID                                           │
│  ┌───────────────────────────────────────────────┐  │
│  │ 1ABC2DEF3GHI4JKL5MNO6PQR                       │  │
│  └───────────────────────────────────────────────┘  │
│  How to find your folder ID                          │
│                                                      │
│  Display Name (optional)                             │
│  ┌───────────────────────────────────────────────┐  │
│  │ Team Downloads                                 │  │
│  └───────────────────────────────────────────────┘  │
│                                                      │
│  [ Test Folder Access ]                              │
│                                                      │
│  Status: ✅ Valid - You have write access           │
│                                                      │
└─────────────────────────────────────────────────────┘
```

### Help Text: How to Find Folder ID

```
To get a folder's ID:
1. Open Google Drive in your browser
2. Navigate to the folder you want to use
3. Look at the URL: drive.google.com/drive/folders/XXXXX
4. Copy the XXXXX part - that's your folder ID

For shared folders:
• Make sure you have "Editor" access to the folder
• The folder owner can share it from Drive's share menu
```

---

## ⚠️ Edge Cases

| Scenario | Handling |
|----------|----------|
| Invalid folder ID format | Show validation error immediately |
| Folder doesn't exist | Show error after API check |
| No write access | Show "Access Denied" error |
| Folder deleted after setup | Detect on upload, prompt to reconfigure |
| User loses access | Detect on upload, fall back to default |
| Shared drive folder | Should work, needs testing |
| Offline | Skip validation, attempt upload |

---

## 🧪 Test Plan

### Manual Testing Scenarios

1. **Happy Path - Own Folder**
   - Create a folder in own Drive
   - Copy folder ID
   - Enter in settings
   - Test access → should succeed
   - Download video → should appear in folder

2. **Happy Path - Shared Folder**
   - Get folder ID from shared folder (Editor access)
   - Enter in settings
   - Test access → should succeed
   - Download video → should appear in shared folder

3. **Error - Invalid ID**
   - Enter random string as folder ID
   - Test access → should show error

4. **Error - No Access**
   - Get folder ID from folder with View-only access
   - Enter in settings
   - Test access → should show "Access Denied"

5. **Toggle Behavior**
   - Enable custom folder → uploads go to custom
   - Disable custom folder → uploads go to default
   - Re-enable → should remember previous ID

---

## 📊 Success Metrics

- [ ] Feature works with user's own folders
- [ ] Feature works with shared folders (Editor access)
- [ ] Clear error messages for invalid configurations
- [ ] No regression in default folder behavior
- [ ] All existing tests pass

---

## 🗓️ Timeline Estimate

| Phase | Estimated Time |
|-------|---------------|
| Phase 1: Settings UI | 1-2 hours |
| Phase 2: Storage & State | 30 minutes |
| Phase 3: Folder Validation | 1 hour |
| Phase 4: Upload Integration | 30 minutes |
| Phase 5: Error Handling | 1 hour |
| Phase 6: Testing | 1-2 hours |
| Phase 7: Documentation | 30 minutes |
| **Total** | **5-8 hours** |

---

## 📝 Notes

- Keep default behavior unchanged when custom folder is disabled
- Store custom folder name locally for UI display (don't fetch each time)
- Consider caching validation result with expiry
- May need to refresh folder access on each download attempt for robustness

---

*Last updated: December 24, 2024*

---

# Feature: Custom Spreadsheet Support

**Status:** ✅ Implemented (same branch)

---

## 📋 Overview

Allow users to specify a custom Google Spreadsheet ID to log downloads. This enables logging to shared team spreadsheets or any spreadsheet the user has write access to.

---

## 🎯 User Stories

1. **As a team member**, I want to log downloads to a shared team spreadsheet so everyone can see activity.
2. **As a user**, I want to use an existing spreadsheet instead of creating a new one.

---

## ✅ Implementation Summary

- Added "Custom Spreadsheet" section to options page
- Toggle: "Use custom spreadsheet ID"
- Input: Spreadsheet ID text field  
- "Test Spreadsheet Access" button with status indicator
- Help modal explaining how to find spreadsheet ID
- Auto-creates "Instagram Download Log" sheet tab if missing
- Validates write access before saving settings

### Finding Spreadsheet ID

1. Open Google Sheets in browser
2. Open target spreadsheet
3. URL: `docs.google.com/spreadsheets/d/XXXXX/edit`
4. Copy the `XXXXX` part

### Requirements

- User must have Editor access to the spreadsheet
- Extension will auto-create "TikTok Download Log" sheet tab
