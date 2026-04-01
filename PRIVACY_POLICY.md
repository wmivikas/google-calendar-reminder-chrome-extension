# Privacy Policy for Calendra Pulse

Last updated: April 1, 2026

Calendra Pulse is a Chrome extension that reads your Google Calendar events and sends reminder notifications inside Chrome.

## Data We Access

The extension requests these Google scopes:

- https://www.googleapis.com/auth/calendar.readonly
- https://www.googleapis.com/auth/userinfo.email

This allows the extension to read upcoming events and display which account is connected.

## Data We Store

The extension stores data locally in your browser using Chrome storage:

- Settings: reminder lead time, check interval, look-ahead range, quiet hours, badge toggle
- Temporary sync state: last sync time, upcoming event snapshot
- Notification bookkeeping: recently notified event IDs to prevent duplicates

## Data We Do Not Collect

- We do not collect or sell personal data.
- We do not run our own backend server for your calendar data.
- We do not transfer your calendar event data to third-party servers controlled by us.

## How Data Is Used

Data is used only to:

- Fetch upcoming Google Calendar events
- Show connected account email in popup
- Show upcoming events in the popup
- Trigger reminder notifications before events
- Respect your local notification preferences

## Data Retention

- Extension settings remain in Chrome storage until you change or remove them.
- Temporary sync/notification state can be cleared by signing out or uninstalling the extension.

## Security

- OAuth token handling uses Chrome Identity API.
- Calendar access is read-only.

## Your Choices

You can at any time:

- Sign out from the extension popup
- Disable notifications in extension settings
- Uninstall the extension from Chrome

## Contact

If you publish this extension, replace this section with your support email or website.
