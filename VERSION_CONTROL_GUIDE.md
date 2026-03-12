# Version Control Guide - Tracking Changes

## Current Setup

✅ **Git is already initialized** in your project
- Branch: `Main`
- Remote: `origin/Main`
- Status: You have many modified files ready to commit

## Basic Version Control Commands

### 1. See What Changed (Current vs Last Commit)

**View all modified files:**
```bash
git status
```

**See detailed changes in a specific file:**
```bash
git diff src/renderer/components/Login.css
```

**See all changes (summary):**
```bash
git diff --stat
```

**See all changes (detailed):**
```bash
git diff
```

### 2. Create a Version (Commit Changes)

**Stage all changes:**
```bash
git add .
```

**Or stage specific files:**
```bash
git add src/renderer/components/Login.css
```

**Commit with a message:**
```bash
git commit -m "Updated login page: improved logo visibility and added rotating background"
```

**Push to remote:**
```bash
git push origin Main
```

### 3. Create Version Tags (Recommended)

Tags help you mark specific versions (like v1.0.0, v1.1.0, etc.)

**Create a tag:**
```bash
git tag -a v1.2.0 -m "Login page improvements - logo visibility and animations"
```

**Push tags to remote:**
```bash
git push origin v1.2.0
```

**List all tags:**
```bash
git tag -l
```

### 4. Compare Versions

**Compare current changes vs last commit:**
```bash
git diff HEAD
```

**Compare two commits:**
```bash
git diff <commit-hash-1> <commit-hash-2>
```

**Compare two tags:**
```bash
git diff v1.1.0 v1.2.0
```

**See what changed between two commits (summary):**
```bash
git diff --stat v1.1.0 v1.2.0
```

**See commit history:**
```bash
git log --oneline
```

**See detailed commit history:**
```bash
git log --graph --oneline --all
```

### 5. See Changes in a Specific Version

**View changes in a specific commit:**
```bash
git show <commit-hash>
```

**View changes in a tag:**
```bash
git show v1.2.0
```

**List all files changed in a commit:**
```bash
git show --name-only <commit-hash>
```

**List all files changed between two versions:**
```bash
git diff --name-only v1.1.0 v1.2.0
```

## Recommended Workflow

### For Each Release/Update:

1. **Make your changes** (like the login page updates)

2. **Review what changed:**
   ```bash
   git status
   git diff --stat
   ```

3. **Stage and commit:**
   ```bash
   git add .
   git commit -m "Description of changes"
   ```

4. **Create a version tag:**
   ```bash
   git tag -a v1.2.0 -m "Version 1.2.0: Login page improvements"
   ```

5. **Push everything:**
   ```bash
   git push origin Main
   git push origin v1.2.0
   ```

## Quick Reference: See What Changed

### Current Changes (Not Committed Yet)
```bash
# Summary of changes
git status

# Detailed changes
git diff

# Changes in specific file
git diff src/renderer/components/Login.css
```

### Between Two Versions
```bash
# List files changed
git diff --name-only v1.1.0 v1.2.0

# Summary of changes
git diff --stat v1.1.0 v1.2.0

# Full detailed diff
git diff v1.1.0 v1.2.0
```

### Between Two Commits
```bash
# Get commit hashes
git log --oneline

# Compare
git diff <old-commit> <new-commit>
```

## Example: Tracking Login Page Changes

**1. See what changed in Login.css:**
```bash
git diff src/renderer/components/Login.css
```

**2. Commit the changes:**
```bash
git add src/renderer/components/Login.css
git commit -m "Login page: Enhanced logo visibility with white background and rotating animations"
```

**3. Tag this version:**
```bash
git tag -a v1.2.1 -m "Login page UI improvements"
git push origin v1.2.1
```

**4. Later, compare with previous version:**
```bash
git diff v1.2.0 v1.2.1
```

## Best Practices

1. **Commit frequently** - Don't wait too long between commits
2. **Use descriptive commit messages** - Explain what and why
3. **Tag releases** - Use version numbers (v1.0.0, v1.1.0, etc.)
4. **Review before committing** - Use `git diff` to see what you're committing
5. **Push regularly** - Keep remote repository up to date

## Version Numbering Convention

- **Major version (v2.0.0)**: Major changes, breaking changes
- **Minor version (v1.1.0)**: New features, non-breaking changes
- **Patch version (v1.0.1)**: Bug fixes, small improvements

Example:
- v1.0.0 - Initial release
- v1.1.0 - Added new features
- v1.1.1 - Fixed bugs
- v1.2.0 - More new features
- v2.0.0 - Major overhaul

## Useful Git Aliases (Optional)

Add these to your `~/.gitconfig` for shortcuts:

```bash
git config --global alias.st status
git config --global alias.co checkout
git config --global alias.br branch
git config --global alias.lg "log --oneline --graph --all"
```

Then you can use:
- `git st` instead of `git status`
- `git lg` for a nice log view
