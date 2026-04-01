# Install From GitHub

This guide is for normal users who want to use the extension from your GitHub repository.

## Fast Install Steps

1. Open the project GitHub page.
2. Open Releases.
3. Download the latest release zip file.
4. Extract the zip to any folder.
5. Open chrome://extensions in Chrome.
6. Turn on Developer mode.
7. Click Load unpacked.
8. Select the extracted extension folder.
9. Pin Calendra Pulse from the Chrome toolbar.
10. Open popup and click Connect Calendar.

Before connecting:

1. Add your own OAuth client ID in manifest.json.
2. Do not push personal OAuth credentials to public repositories.

## First-Time Setup

1. Click Connect Calendar.
2. Choose your Google account in the Google web sign-in window.
3. Approve calendar and email permission.
4. Confirm popup shows "Calendar account: your-email".
5. Open Settings and click Send Test Alert.
6. If alert appears, setup is done.

## Which Google Account Is Used

When you click Connect Calendar, the extension uses web-based Google OAuth sign-in.

- The account you pick there is the account used for reminders.
- The popup shows "Calendar account: <email>" so you can verify.

To use a different account:

1. Open extension popup.
2. Click Switch account.
3. Reconnect with the account you want.

## Troubleshooting

### Connect Calendar fails

Possible causes:

- OAuth client is not configured for this extension identity.
- Google OAuth consent setup is incomplete.
- Redirect URI is not configured correctly for web OAuth.
- OAuth app is in Testing mode and this Google account is not listed as a Test user.

What to do:

1. Ask the maintainer to verify OAuth configuration in Google Cloud Console.
2. Make sure you installed from the official release zip, not random modified source.
3. Maintainer should use OAuth client type Web application.
4. Add redirect URI exactly: https://<extension-id>.chromiumapp.org/
5. Verify <extension-id> matches chrome://extensions ID exactly.
6. If only one Google account works, maintainer must add other accounts in OAuth consent Test users (or publish app to production).

## Share These Values For Setup Check

If you want me to verify your setup, send these values:

1. Extension ID from chrome://extensions
2. oauth2.client_id from manifest.json
3. OAuth client type in Google Cloud (must be Web application)
4. Authorized redirect URIs list from Google Cloud
5. OAuth consent mode (Testing or Production)
6. Test users list (emails)

### No notifications appear

1. Enable notifications in Windows settings.
2. Allow notifications for Chrome.
3. In extension Settings, make sure desktop notifications are enabled.
4. Use Send Test Alert again.

## Update To New Version

1. Download latest release zip.
2. Extract and replace previous local extension folder.
3. Open chrome://extensions.
4. Click Reload on Calendra Pulse.
