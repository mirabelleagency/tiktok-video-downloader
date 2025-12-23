# TikTok Website vs Extension Gap Analysis

> **Analysis Date:** December 2025  
> **Extension Version:** 1.0.0  
> **Status:** Assessment Complete

---

## Executive Summary

This document analyzes potential gaps between the TikTok website's current implementation and our extension's video detection/download capabilities. Based on code review and known TikTok patterns.

---

## Current Extension Capabilities

### URL Detection Patterns ✅
The extension currently handles:

| Pattern | Regex | Status |
|---------|-------|--------|
| Standard video | `/tiktok\.com\/@([^/]+)\/video\/(\d+)/` | ✅ Working |
| Short URL | `/vm\.tiktok\.com\/([A-Za-z0-9]+)/` | ✅ Working |
| Mobile URL | `/m\.tiktok\.com\/v\/(\d+)/` | ✅ Working |
| For You Page | `/tiktok\.com\/foryou/` | ✅ Working |
| Following | `/tiktok\.com\/following/` | ✅ Working |
| Profile | `/tiktok\.com\/@([^/?]+)$/` | ✅ Working |

### Video URL Sources (Priority Order)
1. **Intercepted XHR/Fetch** - Most reliable
2. **Stored seenVideoUrls** - Good for scrolled content
3. **Wait for intercept** - Fallback for loading content
4. **Page data extraction** - JSON embedded in HTML
5. **Video element src** - Last resort (often blob:)

### Data Extraction Methods
- `__UNIVERSAL_DATA_FOR_REHYDRATION__` - Current TikTok
- `SIGI_STATE` - Older TikTok versions
- `__NEXT_DATA__` - Some pages use Next.js
- Direct API endpoint interception

---

## Identified Gaps

### High Priority Gaps 🔴

#### 1. Photo/Slideshow Posts Not Supported
**Issue:** TikTok now supports photo slideshows (carousel posts)
**Current Behavior:** Extension only detects videos, ignores photo posts
**Impact:** Users cannot download photo content
**Recommendation:** Add photo detection and download support

```javascript
// Missing pattern
const PHOTO_PATTERN = /imagePost/;
const SLIDESHOW_PATTERN = /imageMode.*slideshow/;
```

#### 2. TikTok Live Videos
**Issue:** Live streams have different URL structure
**Current Behavior:** Extension doesn't handle live content
**Impact:** Cannot capture live video URLs
**Recommendation:** Add live detection (though may be intentional limitation)

#### 3. New API Endpoint Changes
**Issue:** TikTok frequently changes API endpoints
**Current Endpoints Monitored:**
```javascript
'/api/item/detail',
'/api/recommend/item_list',
'/api/post/item_list',
'/aweme/v1/feed',
// etc.
```
**Recommendation:** Add logging for unhandled API calls to detect new patterns

### Medium Priority Gaps 🟡

#### 4. Regional CDN Variations
**Issue:** Different CDNs may not be in whitelist
**Current CDN Whitelist:**
```javascript
'tiktokcdn.com',
'tiktokcdn-us.com',
'tiktokcdn-eu.com',
'tiktokcdn-in.com',
'muscdn.com',
'byteoversea.com',
'bytecdn.cn',
'tiktok.com',
'ibyteimg.com'
```
**Potential Missing:** New regional CDNs (Asia-Pacific, Latin America)
**Recommendation:** Monitor for 403 errors and add new domains

#### 5. Watermark vs Non-Watermark Detection
**Issue:** TikTok may change URL patterns for watermarked videos
**Current Priority:** `downloadAddr` → `bitrateInfo` → `playAddr`
**Risk:** `downloadAddr` may become restricted
**Recommendation:** Add fallback quality selection UI

#### 6. Private Account Videos
**Issue:** Videos from private accounts require authentication context
**Current Behavior:** Extension relies on user's logged-in session
**Impact:** May fail if session cookies not passed correctly
**Recommendation:** Verify credential passing in fetch requests

### Low Priority Gaps 🟢

#### 7. Duet/Stitch Video Handling
**Issue:** Duet videos have composite structure
**Current Behavior:** May only capture one component
**Recommendation:** Add detection for duet metadata

#### 8. Collection/Playlist Support
**Issue:** TikTok has playlist feature
**Current Behavior:** Single video download only
**Recommendation:** Consider batch download feature

#### 9. Sound/Music Extraction
**Issue:** Users may want audio only
**Current Behavior:** Full video download only
**Recommendation:** Add audio extraction option (FFmpeg?)

---

## TikTok Anti-Bot Measures

### Current Countermeasures in Extension
- ✅ Uses page context injection (bypasses CORS)
- ✅ Intercepts actual network requests
- ✅ Waits for page hydration
- ✅ Uses `credentials: 'include'` for authenticated requests

### Potential Issues
1. **Rate limiting** - No client-side rate limiting currently
2. **Signature validation** - TikTok may require signed URLs
3. **Browser fingerprinting** - Extension may trigger detection
4. **Captcha challenges** - No handling for verification

---

## Recommended Improvements

### Immediate (This Sprint)

| Item | Priority | Effort | Status |
|------|----------|--------|--------|
| Add rate limiting integration | High | 2h | 🔧 Ready (utilities exist) |
| Add CDN domain monitoring | Medium | 1h | 📋 Todo |
| Add photo post detection stub | Medium | 4h | 📋 Todo |

### Short-Term (Next 2 Sprints)

| Item | Priority | Effort | Status |
|------|----------|--------|--------|
| Photo slideshow download | High | 8h | 📋 Todo |
| API endpoint change detection | Medium | 4h | 📋 Todo |
| Quality selection UI | Low | 6h | 📋 Todo |

### Long-Term (Backlog)

| Item | Priority | Effort | Status |
|------|----------|--------|--------|
| Batch/playlist download | Low | 16h | 📋 Todo |
| Audio-only extraction | Low | 8h | 📋 Todo |
| Duet handling | Low | 4h | 📋 Todo |

---

## Testing Recommendations

### Manual Test Cases Needed

1. **Photo Posts**
   - Navigate to a photo slideshow post
   - Verify extension behavior (should gracefully indicate unsupported)

2. **Regional Access**
   - Test with VPN to different regions
   - Verify CDN domains are handled

3. **Feed Navigation**
   - Scroll through FYP extensively
   - Verify videos remain downloadable after scrolling

4. **Private Accounts**
   - Follow a private account
   - Test download of their videos

5. **New URL Formats**
   - Test `/t/` short URLs if they exist
   - Test any new URL patterns

---

## Code Areas Requiring Updates

### For Photo Support
```
src/content/tiktok.js
- Add PHOTO_PATTERN to TIKTOK_PATTERNS
- Add detectPhotoPost() function
- Update detectVideo() to check for photos
```

### For CDN Monitoring
```
src/utils/validation.js
- Add dynamic CDN list with fallback
- Log unknown but valid-looking CDN URLs
```

### For Rate Limiting Integration
```
src/background/service-worker.js
- Import rateLimiters from utils/ratelimit.js
- Wrap Google API calls with withRateLimit()
- Wrap TikTok fetch with videoFetch limiter
```

---

## Monitoring & Alerts

### Suggested Metrics to Track
- Download success rate
- Video detection success rate
- CDN domain distribution
- Error types and frequency

### Implementation
Consider adding telemetry (opt-in) to track:
- Failed video detections (anonymized)
- New CDN domains encountered
- API endpoint changes

---

*Analysis based on code review. Live testing against tiktok.com recommended to verify current state.*
