# Documentation Guide for AI Agents

> **Purpose:** Guide for AI agents on how to create and maintain proper project documentation  
> **Scope:** All documentation tasks within this workspace  
> **Protocol:** TaskSync V5 Compatible

---

## Quick Reference

### When to Update Documentation
- After adding new features or utilities
- After changing file structure
- After adding/modifying tests
- After fixing significant bugs
- After any API changes

### Documentation Files to Maintain

| File | Purpose | Update Frequency |
|------|---------|------------------|
| `README.md` | Quick start for developers | Major changes |
| `SETUP-GUIDE.md` | Detailed installation guide | Setup changes |
| `CURRENT-ASSESSMENT.md` | Project status and ratings | After improvements |
| `CHANGELOG.md` | Version history and changes | Every release |
| `manifest.json` | Extension version | Every release |
| `package.json` | Package version | Every release |
| Inline code comments | Code understanding | With code changes |

---

## Documentation Standards

### 1. README.md Structure

A good README should include:

```markdown
# Project Name

Brief description (1-2 sentences)

## Features
- Feature 1
- Feature 2

## Quick Start
1. Clone
2. Install
3. Build
4. Run

## Usage
Basic usage examples

## Contributing
How to contribute

## License
License information
```

### 2. Code Comments

#### When to Comment
- Complex algorithms
- Non-obvious business logic
- API integration points
- Security-sensitive code
- Workarounds or hacks

#### JSDoc Format
```javascript
/**
 * Brief description of the function
 * 
 * @param {Type} paramName - Parameter description
 * @returns {Type} Return value description
 * @throws {ErrorType} When this error occurs
 * 
 * @example
 * functionName('example');
 */
```

#### Inline Comments
```javascript
// GOOD: Explains WHY
// Rate limit to prevent API throttling (max 10 req/sec)
await rateLimiter.waitForToken();

// BAD: Explains WHAT (obvious from code)
// Add one to counter
counter++;
```

### 3. SETUP-GUIDE.md Structure

```markdown
# Setup Guide

## Prerequisites
- Required software with versions
- Required accounts/credentials

## Installation Steps
1. Step with commands
2. Step with screenshots (if needed)
3. Verification step

## Configuration
- Environment variables
- Config file locations
- Required modifications

## Troubleshooting
- Common issues and solutions

## Next Steps
- Links to other docs
```

### 4. Assessment Documents

#### CURRENT-ASSESSMENT.md Should Include
- Executive summary
- Rating breakdown by category
- Current metrics (tests, coverage, lint)
- Completed improvements
- Remaining gaps with priorities
- Recommendations

#### Rating Scale
| Rating | Meaning |
|--------|---------|
| 5.0/5 | Production-ready, best practices |
| 4.5/5 | Excellent, minor improvements possible |
| 4.0/5 | Very good, some gaps |
| 3.5/5 | Good, notable gaps |
| 3.0/5 | Acceptable, needs work |
| < 3.0 | Needs significant improvement |

---

## Markdown Best Practices

### Formatting Rules

1. **Headers**: Use hierarchy (# > ## > ### > ####)
2. **Code blocks**: Always specify language
3. **Tables**: Align columns, use headers
4. **Lists**: Be consistent (all bullets or all numbers)
5. **Links**: Use relative paths for internal links

### Emoji Usage

Use sparingly for visual scanning:
- ✅ Completed/success
- ❌ Failed/error
- ⚠️ Warning/caution
- 🚀 New feature
- 🔧 Fix/improvement
- 📝 Documentation

### File Naming

- Use UPPERCASE for doc files: `README.md`, `SETUP-GUIDE.md`
- Use kebab-case for multi-word: `CURRENT-ASSESSMENT.md`
- Always use `.md` extension

---

## Update Procedures

### Adding a New Feature

1. Update relevant code comments
2. Add entry to CURRENT-ASSESSMENT.md if significant
3. Update README.md features list if user-facing
4. **Add changelog entry to CHANGELOG.md**
5. **Bump version in manifest.json and package.json if releasing**

### Version Bumping

#### When to Bump Version
- **PATCH (1.0.x)**: Bug fixes, minor improvements, documentation
- **MINOR (1.x.0)**: New features, non-breaking changes
- **MAJOR (x.0.0)**: Breaking changes, major rewrites

#### Version Bump Procedure
1. Update `manifest.json`:
   ```json
   "version": "1.0.1"
   ```
2. Update `package.json`:
   ```json
   "version": "1.0.1"
   ```
3. Add entry to `CHANGELOG.md`
4. Commit with message: `chore: bump version to 1.0.1`

### Changelog Format

Use [Keep a Changelog](https://keepachangelog.com/) format:

```markdown
## [1.0.1] - 2025-12-23

### Added
- New feature description

### Fixed
- Bug fix description

### Changed
- Change description

### Removed
- Removed feature description
```

### Adding Tests

1. Update test count in CURRENT-ASSESSMENT.md
2. Note coverage changes
3. Update test documentation section

### Fixing Bugs

1. Add inline comment explaining the fix if non-obvious
2. Update changelog if significant

### Changing File Structure

1. Update file tree in CURRENT-ASSESSMENT.md
2. Update any path references in documentation
3. Verify all relative links still work

---

## Verification Checklist

Before completing documentation tasks:

- [ ] All code changes have appropriate comments
- [ ] README is accurate and up-to-date
- [ ] CURRENT-ASSESSMENT reflects true state
- [ ] No broken links in documentation
- [ ] Consistent formatting throughout
- [ ] No outdated information
- [ ] Examples are working and tested

---

## This Project's Documentation Map

```
tiktok-video-downloader/
├── README.md                  # Quick start (developers)
├── SETUP-GUIDE.md             # Detailed setup (first-time users)
├── CURRENT-ASSESSMENT.md      # Project status (assessment)
├── CHANGELOG.md               # Version history (releases)
├── DOCUMENTATION-GUIDE.md     # This file (AI guidance)
├── manifest.json              # Extension version
├── package.json               # Package version
└── src/                       # Inline code comments
```

### Key Documents Summary

| Document | Audience | Content |
|----------|----------|---------|
| README.md | New developers | Quick overview, install, basic usage |
| SETUP-GUIDE.md | First-time users | Complete setup with OAuth config |
| CURRENT-ASSESSMENT.md | Project maintainers | Quality metrics, improvements, gaps |
| CHANGELOG.md | Users & developers | Version history, what changed |
| This file | AI agents | How to document properly |

---

## Examples from This Project

### Good Code Comment Example

```javascript
// src/utils/ratelimit.js
/**
 * Token bucket rate limiter for API calls
 * 
 * Uses leaky bucket algorithm to prevent API throttling.
 * Tokens refill at tokensPerSecond rate up to maxTokens.
 * 
 * @param {Object} options - Configuration options
 * @param {number} options.maxTokens - Maximum bucket capacity
 * @param {number} options.tokensPerSecond - Refill rate
 */
```

### Good Assessment Update Example

```markdown
### Phase N: Feature Name ✅
- [x] Task completed
- [x] Another task completed
- [ ] Pending task

Test count: 95 → 187 tests
Coverage: 57% → 65%
```

---

## Anti-Patterns to Avoid

### ❌ Don't Do This

1. **Outdated docs**: Documentation that doesn't match current code
2. **Obvious comments**: `// increment counter` on `counter++`
3. **No context**: Comments that don't explain WHY
4. **Broken examples**: Code samples that don't work
5. **Missing updates**: Adding features without updating docs

### ✅ Do This Instead

1. Update docs with every significant change
2. Comment complex logic and business rules
3. Explain the reasoning behind decisions
4. Test all code examples
5. Treat docs as part of the code change

---

*This guide ensures consistent, high-quality documentation across all AI-assisted development tasks.*
