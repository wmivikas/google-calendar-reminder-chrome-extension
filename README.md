# Calendra Pulse

Calendra Pulse is an open-source Chrome extension for Google Calendar reminders.

It helps you stay focused and still catch important meetings with clean alerts, quick event visibility, and configurable reminder timing.

## Features

- Connect Google Calendar from the extension popup
- See upcoming events directly in Chrome
- Get strong reminder notifications before meetings
- Click any event to open it in Google Calendar
- Configure reminder lead time, look-ahead window, and check interval
- Quiet hours mode for deep-focus blocks
- Test alert button for quick notification checks

## Quick Start

1. Download this repository (or release zip).
2. Open Chrome and go to chrome://extensions.
3. Enable Developer mode.
4. Click Load unpacked and select this folder.
5. Add your OAuth client ID in `manifest.json`.
6. Reload the extension.
7. Open the popup and click Connect Calendar (Web).

Detailed setup is in [INSTALL_FROM_GITHUB.md](INSTALL_FROM_GITHUB.md).

## OAuth Setup

1. Open Google Cloud Console.
2. Enable Google Calendar API.
3. Configure OAuth consent screen.
4. Create OAuth Client ID with type Web application.
5. Add redirect URI: https://<your-extension-id>.chromiumapp.org/
6. Put your client ID into `manifest.json`.

If consent screen mode is Testing, only listed Test users can sign in.

## Public Repo Safety

- This repository uses a placeholder OAuth client ID.
- Do not commit your personal production OAuth client ID to public GitHub.
- Keep private credentials only in local/private copies.

## Repository Docs

- Install guide: [INSTALL_FROM_GITHUB.md](INSTALL_FROM_GITHUB.md)
- Publish guide: [PUBLISH_ON_GITHUB.md](PUBLISH_ON_GITHUB.md)
- Release notes template: [GITHUB_RELEASE_TEMPLATE.md](GITHUB_RELEASE_TEMPLATE.md)
- Privacy policy: [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## OAuth Scopes

- https://www.googleapis.com/auth/calendar.readonly
- https://www.googleapis.com/auth/userinfo.email

## License

Use your preferred open-source license before public distribution.
