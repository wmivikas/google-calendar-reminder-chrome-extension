# Publish On GitHub: Complete Maintainer Steps

This guide explains the clean GitHub-first release flow.

## 1. Prepare The Version

1. Update extension code and docs.
2. Set new version in manifest.json.
3. Keep manifest.json oauth2.client_id as placeholder in public commits.
4. Test locally from chrome://extensions using Load unpacked.
5. Verify Connect Calendar and test notifications.

## 2. Commit And Push

1. Commit all changes to main branch.
2. Push to GitHub.

## 3. Create Tag Release

1. Create a version tag such as v1.0.1.
2. Push the tag to GitHub.

The release workflow in .github/workflows/release.yml will package the extension zip automatically.

## 4. Publish GitHub Release

1. Open GitHub repository Releases.
2. Open draft release generated from the tag.
3. Add notes from GITHUB_RELEASE_TEMPLATE.md.
4. Publish release.

## 5. Share With Users

1. Share your GitHub Releases link.
2. Tell users to follow INSTALL_FROM_GITHUB.md.

## 6. OAuth Checklist Before Public Sharing

1. Confirm Google Calendar API is enabled.
2. Confirm OAuth consent screen is valid.
3. Create OAuth client ID with type Web application.
4. Set redirect URI exactly to:
	- https://<your-extension-id>.chromiumapp.org/
5. Use that client ID in manifest.json oauth2.client_id.
6. Keep scopes aligned with manifest:
	- https://www.googleapis.com/auth/calendar.readonly
	- https://www.googleapis.com/auth/userinfo.email
7. If Connect Calendar fails for users, fix OAuth setup first before announcing release.

Privacy note:

- Do not push your personal production OAuth client ID to public GitHub.
- Use placeholder in public branch and configure local/private deployment separately.

Important:

- If OAuth consent screen is in Testing mode, only listed Test users can sign in.
- access_denied usually means account is not approved in OAuth Test users.
- redirect_uri_mismatch usually means OAuth redirect URI extension ID does not match installed extension ID.
- For GitHub unpacked installs, users can get different extension IDs unless you lock a fixed ID strategy.

## 7. Every New Update

1. Increase version in manifest.json.
2. Push changes.
3. Create new tag.
4. Publish release.
