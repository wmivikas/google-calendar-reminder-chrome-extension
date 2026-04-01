const ALARM_NAME = "focus-calendar-check";
const STATE_KEY = "extensionState";
const NOTIFIED_KEY = "notifiedEvents";
const LINK_KEY = "notificationLinks";
const AUTH_SESSION_KEY = "authSession";

const DEFAULT_SETTINGS = {
  checkIntervalMinutes: 1,
  lookAheadMinutes: 180,
  reminderLeadMinutes: 10,
  desktopNotifications: true,
  badgeEnabled: true,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00"
};

chrome.runtime.onInstalled.addListener(async () => {
  await initializeSettings();
  await syncCalendar({ interactive: false });
});

chrome.runtime.onStartup.addListener(() => {
  syncCalendar({ interactive: false });
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    syncCalendar({ interactive: false });
  }
});

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && Object.keys(changes).length > 0) {
    syncCalendar({ interactive: false });
  }
});

chrome.notifications.onClicked.addListener((notificationId) => {
  openNotificationLink(notificationId);
});

chrome.notifications.onButtonClicked.addListener((notificationId, buttonIndex) => {
  if (buttonIndex === 0) {
    openNotificationLink(notificationId);
  }
});

chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  handleMessage(message)
    .then((result) => sendResponse(result))
    .catch((error) => {
      sendResponse({
        ok: false,
        error: error?.message || "Unexpected extension error"
      });
    });
  return true;
});

async function handleMessage(message) {
  switch (message?.type) {
    case "SIGN_IN":
      return syncCalendar({ interactive: true });
    case "SWITCH_ACCOUNT":
      await signOut();
      return syncCalendar({ interactive: true });
    case "REFRESH":
      return syncCalendar({ interactive: false });
    case "TEST_NOTIFICATION":
      await createPreviewNotification();
      return { ok: true };
    case "SIGN_OUT":
      await signOut();
      return { ok: true };
    case "GET_STATE": {
      const settings = await getSettings();
      const state = await getState();
      return { ok: true, settings, state };
    }
    case "GET_WEB_AUTH_INFO":
      return { ok: true, ...getWebAuthInfo() };
    case "OPEN_EVENT": {
      const targetUrl = String(message?.url || "");
      if (!targetUrl.startsWith("https://")) {
        return { ok: false, error: "Invalid event link" };
      }
      await chrome.tabs.create({ url: targetUrl });
      return { ok: true };
    }
    case "OPEN_CALENDAR":
      await chrome.tabs.create({ url: "https://calendar.google.com/calendar/u/0/r" });
      return { ok: true };
    default:
      return { ok: false, error: "Unknown message type" };
  }
}

async function initializeSettings() {
  const current = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  const merged = { ...DEFAULT_SETTINGS, ...current };
  await chrome.storage.sync.set(merged);
  await setupAlarm(merged.checkIntervalMinutes);
}

async function getSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS, ...settings };
}

async function setupAlarm(periodInMinutes) {
  const interval = Math.max(1, Number(periodInMinutes) || 1);
  const existing = await chrome.alarms.get(ALARM_NAME);

  if (!existing || existing.periodInMinutes !== interval) {
    await chrome.alarms.clear(ALARM_NAME);
    await chrome.alarms.create(ALARM_NAME, {
      delayInMinutes: 0.1,
      periodInMinutes: interval
    });
  }
}

async function syncCalendar({ interactive }) {
  const settings = await getSettings();
  await setupAlarm(settings.checkIntervalMinutes);

  const oauthClient = chrome.runtime.getManifest()?.oauth2?.client_id || "";
  if (oauthClient.startsWith("REPLACE_WITH_")) {
    const state = {
      connected: false,
      lastSyncAt: new Date().toISOString(),
      events: [],
      error: "Add your Google OAuth client ID in manifest.json before signing in."
    };
    await setState(state);
    await updateBadge([], settings);
    return { ok: false, reason: "MISSING_OAUTH_CLIENT" };
  }

  const authSession = await getAuthSession(interactive);
  if (!authSession?.accessToken) {
    const state = {
      connected: false,
      accountEmail: authSession?.accountEmail || "",
      lastSyncAt: new Date().toISOString(),
      events: [],
      error: interactive ? buildWebAuthError(authSession) : ""
    };
    await setState(state);
    await updateBadge([], settings);
    return { ok: false, reason: "NOT_SIGNED_IN" };
  }

  const token = authSession.accessToken;
  const accountEmail = authSession.accountEmail || "";

  try {
    const events = await fetchEvents(token, settings.lookAheadMinutes);
    const now = Date.now();
    const quietHours = isWithinQuietHours(settings, new Date(now));

    let notifiedEvents = await getNotifiedEvents();
    notifiedEvents = pruneOldNotifications(notifiedEvents);

    if (!quietHours && settings.desktopNotifications) {
      for (const event of events) {
        const eventKey = `${event.id}|${event.startMs}|${settings.reminderLeadMinutes}`;
        if (!notifiedEvents[eventKey] && shouldNotify(event, now, settings.reminderLeadMinutes)) {
          await createEventNotification(event, now);
          notifiedEvents[eventKey] = now;
        }
      }
    }

    await saveNotifiedEvents(notifiedEvents);

    const state = {
      connected: true,
      accountEmail,
      quietHours,
      lastSyncAt: new Date().toISOString(),
      events: events.slice(0, 8),
      error: ""
    };
    await setState(state);
    await updateBadge(events, settings);
    return { ok: true, events };
  } catch (error) {
    const state = {
      connected: true,
      accountEmail,
      lastSyncAt: new Date().toISOString(),
      events: [],
      error: error?.message || "Failed to sync calendar."
    };
    await setState(state);
    await updateBadge([], settings);
    return { ok: false, reason: "SYNC_FAILED", error: state.error };
  }
}

async function getAuthSession(interactive) {
  const stored = await getStoredAuthSession();
  const now = Date.now();

  if (stored?.accessToken && Number(stored.expiresAt) > now + 60 * 1000) {
    return stored;
  }

  return requestAuthSessionViaWebFlow(interactive);
}

async function requestAuthSessionViaWebFlow(interactive) {
  const manifest = chrome.runtime.getManifest();
  const clientId = manifest?.oauth2?.client_id || "";
  const scopes = Array.isArray(manifest?.oauth2?.scopes) ? manifest.oauth2.scopes : [];
  const webAuthInfo = getWebAuthInfo();

  if (!clientId || !scopes.length) {
    return {
      errorCode: "missing_client",
      redirectUri: webAuthInfo.redirectUri
    };
  }

  const state = createAuthState();
  const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");

  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "token");
  authUrl.searchParams.set("redirect_uri", webAuthInfo.redirectUri);
  authUrl.searchParams.set("scope", scopes.join(" "));
  authUrl.searchParams.set("include_granted_scopes", "true");
  authUrl.searchParams.set("prompt", interactive ? "select_account consent" : "none");
  authUrl.searchParams.set("state", state);

  let redirectUrl;
  try {
    redirectUrl = await chrome.identity.launchWebAuthFlow({
      url: authUrl.toString(),
      interactive
    });
  } catch (error) {
    const message = String(error?.message || "");
    return {
      errorCode: extractAuthErrorCode(message),
      errorDescription: message,
      redirectUri: webAuthInfo.redirectUri
    };
  }

  if (!redirectUrl) {
    return {
      errorCode: "no_redirect",
      redirectUri: webAuthInfo.redirectUri
    };
  }

  const redirectObject = new URL(redirectUrl);
  const hashIndex = redirectUrl.indexOf("#");

  if (hashIndex < 0) {
    const queryError = redirectObject.searchParams.get("error");
    if (queryError) {
      return {
        errorCode: queryError,
        errorDescription: redirectObject.searchParams.get("error_description") || "",
        redirectUri: webAuthInfo.redirectUri
      };
    }

    return {
      errorCode: "missing_token_fragment",
      redirectUri: webAuthInfo.redirectUri
    };
  }

  const fragmentParams = new URLSearchParams(redirectUrl.slice(hashIndex + 1));
  if (fragmentParams.get("state") !== state) {
    return {
      errorCode: "state_mismatch",
      redirectUri: webAuthInfo.redirectUri
    };
  }

  const oauthError = fragmentParams.get("error");
  if (oauthError) {
    return {
      errorCode: oauthError,
      errorDescription: fragmentParams.get("error_description") || "",
      redirectUri: webAuthInfo.redirectUri
    };
  }

  const accessToken = fragmentParams.get("access_token");
  if (!accessToken) {
    return {
      errorCode: "missing_access_token",
      redirectUri: webAuthInfo.redirectUri
    };
  }

  const expiresInSeconds = Math.max(60, Number(fragmentParams.get("expires_in") || 3600));
  const accountEmail = await fetchAccountEmail(accessToken);

  const session = {
    accessToken,
    accountEmail,
    expiresAt: Date.now() + expiresInSeconds * 1000
  };

  await saveAuthSession(session);
  return session;
}

function buildWebAuthError(authSession) {
  const code = String(authSession?.errorCode || "");
  const redirectUri = authSession?.redirectUri || getWebAuthInfo().redirectUri;

  if (code === "redirect_uri_mismatch") {
    return `Google OAuth redirect mismatch. Add this redirect URI in Google Cloud: ${redirectUri}`;
  }

  if (code === "access_denied") {
    return "Google denied access. Add this account as a Test user (OAuth consent screen) or publish app to production.";
  }

  if (code === "missing_client") {
    return "OAuth client ID or scopes missing in manifest.json.";
  }

  if (code === "web_auth_failed") {
    return "Google sign-in failed to launch. Check OAuth setup and try again.";
  }

  return "Sign-in failed. Check OAuth client setup and try again.";
}

function extractAuthErrorCode(message) {
  if (message.includes("redirect_uri_mismatch")) {
    return "redirect_uri_mismatch";
  }
  if (message.includes("access_denied")) {
    return "access_denied";
  }
  return "web_auth_failed";
}

function createAuthState() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (value) => value.toString(16).padStart(2, "0")).join("");
}

async function fetchAccountEmail(accessToken) {
  try {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (!response.ok) {
      return "";
    }

    const profile = await response.json();
    return profile?.email || "";
  } catch {
    return "";
  }
}

async function signOut() {
  try {
    await chrome.identity.clearAllCachedAuthTokens();
  } catch {
    // Ignore cache clear errors.
  }

  await chrome.storage.local.remove([STATE_KEY, NOTIFIED_KEY, LINK_KEY, AUTH_SESSION_KEY]);
  await chrome.action.setBadgeText({ text: "" });
}

async function getStoredAuthSession() {
  const data = await chrome.storage.local.get(AUTH_SESSION_KEY);
  return data[AUTH_SESSION_KEY] || null;
}

async function saveAuthSession(session) {
  await chrome.storage.local.set({ [AUTH_SESSION_KEY]: session });
}

async function clearAuthSession() {
  await chrome.storage.local.remove(AUTH_SESSION_KEY);
}

function getWebAuthInfo() {
  return {
    extensionId: chrome.runtime.id,
    redirectUri: chrome.identity.getRedirectURL(),
    clientId: chrome.runtime.getManifest()?.oauth2?.client_id || ""
  };
}

async function fetchEvents(token, lookAheadMinutes) {
  const now = new Date();
  const end = new Date(now.getTime() + lookAheadMinutes * 60 * 1000);

  const params = new URLSearchParams({
    singleEvents: "true",
    orderBy: "startTime",
    maxResults: "25",
    timeMin: now.toISOString(),
    timeMax: end.toISOString()
  });

  const response = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/primary/events?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${token}`
      }
    }
  );

  if (response.status === 401) {
    await clearAuthSession();
    try {
      await chrome.identity.removeCachedAuthToken({ token });
    } catch {
      // Ignore token cache removal errors.
    }
    throw new Error("Google authorization expired. Try reconnecting.");
  }

  if (!response.ok) {
    throw new Error(`Google Calendar API error (${response.status}).`);
  }

  const payload = await response.json();
  const items = Array.isArray(payload?.items) ? payload.items : [];

  return items
    .map((event) => normalizeEvent(event))
    .filter((event) => Boolean(event))
    .sort((a, b) => a.startMs - b.startMs);
}

function normalizeEvent(event) {
  const startRaw = event?.start?.dateTime || event?.start?.date;
  if (!startRaw) {
    return null;
  }

  const startDate = event?.start?.dateTime
    ? new Date(startRaw)
    : new Date(`${startRaw}T09:00:00`);

  if (Number.isNaN(startDate.getTime())) {
    return null;
  }

  return {
    id: event.id || `${event.summary || "event"}-${startRaw}`,
    title: event.summary || "Untitled event",
    location: event.location || "",
    htmlLink: event.htmlLink || "https://calendar.google.com/calendar/u/0/r",
    startMs: startDate.getTime()
  };
}

function shouldNotify(event, nowMs, leadMinutes) {
  const minutesUntilStart = Math.round((event.startMs - nowMs) / 60000);
  return minutesUntilStart <= leadMinutes && minutesUntilStart >= -2;
}

function buildNotificationMessage(event, nowMs) {
  const minutesUntilStart = Math.round((event.startMs - nowMs) / 60000);
  const timeLabel = new Date(event.startMs).toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  let base = "";
  if (minutesUntilStart <= 0) {
    base = `Starts now (${timeLabel})`;
  } else if (minutesUntilStart === 1) {
    base = `Starts in 1 minute (${timeLabel})`;
  } else {
    base = `Starts in ${minutesUntilStart} minutes (${timeLabel})`;
  }

  if (event.location) {
    return `${base} - ${event.location}`;
  }

  return base;
}

async function createEventNotification(event, nowMs) {
  const notificationId = `event-${event.id}-${event.startMs}`;

  await chrome.notifications.create(notificationId, {
    type: "basic",
    iconUrl: "assets/icons/icon128.png",
    title: `Upcoming: ${event.title}`,
    message: buildNotificationMessage(event, nowMs),
    priority: 2,
    requireInteraction: true,
    buttons: [{ title: "Open in Google Calendar" }]
  });

  const data = await chrome.storage.local.get(LINK_KEY);
  const links = data[LINK_KEY] || {};
  links[notificationId] = event.htmlLink;
  await chrome.storage.local.set({ [LINK_KEY]: links });
}

async function createPreviewNotification() {
  const startMs = Date.now() + 5 * 60 * 1000;
  await createEventNotification(
    {
      id: `preview-${Date.now()}`,
      title: "Calendra Pulse Test Reminder",
      location: "Preview alert",
      htmlLink: "https://calendar.google.com/calendar/u/0/r",
      startMs
    },
    Date.now()
  );
}

async function openNotificationLink(notificationId) {
  const data = await chrome.storage.local.get(LINK_KEY);
  const links = data[LINK_KEY] || {};
  const link = links[notificationId] || "https://calendar.google.com/calendar/u/0/r";

  await chrome.tabs.create({ url: link });
  await chrome.notifications.clear(notificationId);

  if (links[notificationId]) {
    delete links[notificationId];
    await chrome.storage.local.set({ [LINK_KEY]: links });
  }
}

async function updateBadge(events, settings) {
  if (!settings.badgeEnabled) {
    await chrome.action.setBadgeText({ text: "" });
    return;
  }

  const now = Date.now();
  const urgentWindow = now + settings.reminderLeadMinutes * 60 * 1000;
  const urgentCount = events.filter(
    (event) => event.startMs >= now - 2 * 60 * 1000 && event.startMs <= urgentWindow
  ).length;

  if (urgentCount > 0) {
    await chrome.action.setBadgeBackgroundColor({ color: "#D7263D" });
    await chrome.action.setBadgeText({ text: String(Math.min(urgentCount, 99)) });
    return;
  }

  await chrome.action.setBadgeBackgroundColor({ color: "#2F80ED" });
  await chrome.action.setBadgeText({ text: "" });
}

function toMinuteValue(timeValue) {
  const parts = String(timeValue || "").split(":").map((value) => Number(value));
  if (parts.length !== 2 || Number.isNaN(parts[0]) || Number.isNaN(parts[1])) {
    return null;
  }
  return parts[0] * 60 + parts[1];
}

function isWithinQuietHours(settings, now) {
  if (!settings.quietHoursEnabled) {
    return false;
  }

  const start = toMinuteValue(settings.quietStart);
  const end = toMinuteValue(settings.quietEnd);
  if (start === null || end === null) {
    return false;
  }

  const current = now.getHours() * 60 + now.getMinutes();

  if (start === end) {
    return true;
  }

  if (start < end) {
    return current >= start && current < end;
  }

  return current >= start || current < end;
}

function pruneOldNotifications(notifiedEvents) {
  const output = { ...notifiedEvents };
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1000;

  Object.entries(output).forEach(([key, value]) => {
    if (typeof value !== "number" || value < cutoff) {
      delete output[key];
    }
  });

  return output;
}

async function getNotifiedEvents() {
  const data = await chrome.storage.local.get(NOTIFIED_KEY);
  return data[NOTIFIED_KEY] || {};
}

async function saveNotifiedEvents(notifiedEvents) {
  await chrome.storage.local.set({ [NOTIFIED_KEY]: notifiedEvents });
}

async function setState(state) {
  await chrome.storage.local.set({ [STATE_KEY]: state });
}

async function getState() {
  const data = await chrome.storage.local.get(STATE_KEY);
  return (
    data[STATE_KEY] || {
      connected: false,
      accountEmail: "",
      quietHours: false,
      lastSyncAt: null,
      events: [],
      error: ""
    }
  );
}
