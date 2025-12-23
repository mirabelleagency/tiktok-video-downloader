# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.0.1] - 2025-12-23

### Added
- For You Page (FYP) video detection support
- Video ID extraction from xgwrapper elements
- TikTok internal store searching for video URLs
- Description column in Google Sheets (between Username and Status)
- Chrome Web Store submission assets and documentation
- Privacy policy and terms of service pages
- Production manifest for Chrome Web Store

### Fixed
- URL pattern now matches root URL (tiktok.com/) as FYP
- FYP videos now detected correctly via xgwrapper element IDs

### Changed
- Google Sheets columns: Timestamp | TikTok URL | Drive Link | File Name | Username | Description | Status

## [1.0.0] - 2025-12-22

### Added
- Initial release
- One-click TikTok video download
- Google Drive integration
- Google Sheets automatic logging
- Input validation utilities
- Structured error handling with recovery hints
- Retry mechanism with exponential backoff
- Network connectivity detection
- Rate limiting utilities
- Content Security Policy
- 188 comprehensive tests
- ARIA labels for accessibility
- Copyright-free icon design

### Security
- HTTPS-only video URL validation
- Domain whitelist for TikTok CDN sources
- HTML escaping for user content
- OAuth 2.0 for Google authentication
