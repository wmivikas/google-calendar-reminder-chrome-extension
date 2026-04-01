# calendar Pulse ⏰

### Google Calendar Reminder Chrome Extension for focused work and on-time meetings

<p align="center">
	<a href="https://github.com/wmivikas/google-calendar-reminder-chrome-extension/stargazers">
		<img alt="GitHub Stars" src="https://img.shields.io/github/stars/wmivikas/google-calendar-reminder-chrome-extension?style=for-the-badge&logo=github&color=ffcf40" />
	</a>
	<a href="https://github.com/wmivikas/google-calendar-reminder-chrome-extension/watchers">
		<img alt="GitHub Watchers" src="https://img.shields.io/github/watchers/wmivikas/google-calendar-reminder-chrome-extension?style=for-the-badge&logo=github&color=4fb3ff" />
	</a>
	<a href="https://github.com/wmivikas/google-calendar-reminder-chrome-extension/network/members">
		<img alt="GitHub Forks" src="https://img.shields.io/github/forks/wmivikas/google-calendar-reminder-chrome-extension?style=for-the-badge&logo=github&color=7bd88f" />
	</a>
</p>

calendar Pulse helps you stay in deep focus and still catch important meetings.

It connects to Google Calendar, shows upcoming events in your browser, and sends reminder alerts before events start.

## Why People Like It ✨

- Fast Google Calendar connect from popup
- Clean and readable upcoming events list
- One-click open event in Google Calendar
- Strong reminder notifications that are easy to notice
- Quiet hours support for night or deep-work sessions
- Test alert button to verify setup instantly

## Install in Minutes 🚀

1. Download this repository (or latest release zip).
2. Open Chrome and go to chrome://extensions.
3. Turn on Developer mode.
4. Click Load unpacked and select this project folder.
5. Add your OAuth client ID in `manifest.json`.
6. Reload extension.
7. Open popup and click Connect Calendar (Web).

Full guide: [INSTALL_FROM_GITHUB.md](INSTALL_FROM_GITHUB.md)

## Google OAuth Setup 🔐

1. Open Google Cloud Console.
2. Enable Google Calendar API.
3. Configure OAuth consent screen.
4. Create OAuth Client ID with type Web application.
5. Add redirect URI exactly:
	 https://<your-extension-id>.chromiumapp.org/
6. Put your client ID into `manifest.json`.

If consent screen is in Testing mode, only listed Test users can sign in.

## Give This Repo a Star ⭐

If this project helps you, please support it:

1. Click ⭐ Star on GitHub
2. Click 👀 Watch to follow updates
3. Share the repo with friends or teammates

Small support helps this project grow a lot.

## Public Repo Safety 🛡️

- This repository intentionally uses a placeholder OAuth client ID.
- Do not commit personal production OAuth credentials to public GitHub.
- Keep private credentials in local/private copies only.

## Docs 📚

- [INSTALL_FROM_GITHUB.md](INSTALL_FROM_GITHUB.md)
- [PUBLISH_ON_GITHUB.md](PUBLISH_ON_GITHUB.md)
- [GITHUB_RELEASE_TEMPLATE.md](GITHUB_RELEASE_TEMPLATE.md)
- [PRIVACY_POLICY.md](PRIVACY_POLICY.md)

## Scopes Used 🔎

- https://www.googleapis.com/auth/calendar.readonly
- https://www.googleapis.com/auth/userinfo.email

## License 📄

Choose and add your preferred open-source license before broad public distribution.
