const statusText = document.getElementById("statusText");
const accountText = document.getElementById("accountText");
const connectButton = document.getElementById("connectButton");
const refreshButton = document.getElementById("refreshButton");
const openButton = document.getElementById("openButton");
const optionsButton = document.getElementById("optionsButton");
const switchAccountButton = document.getElementById("switchAccountButton");
const signOutButton = document.getElementById("signOutButton");
const eventsList = document.getElementById("eventsList");
const emptyState = document.getElementById("emptyState");
const lastSync = document.getElementById("lastSync");
const errorBanner = document.getElementById("errorBanner");
const onboardingCard = document.getElementById("onboardingCard");
const oauthHint = document.getElementById("oauthHint");

initializePopup();

function initializePopup() {
  bindEvents();
  loadWebAuthHint();
  refreshState();
}

async function loadWebAuthHint() {
  const response = await sendMessage({ type: "GET_WEB_AUTH_INFO" });
  if (!response?.ok || !oauthHint) {
    return;
  }

  oauthHint.textContent = `Web OAuth redirect URI: ${response.redirectUri}`;
}

function bindEvents() {
  connectButton.addEventListener("click", async () => {
    setBusy(true);
    await sendMessage({ type: "SIGN_IN" });
    await refreshState();
    setBusy(false);
  });

  refreshButton.addEventListener("click", async () => {
    setBusy(true);
    await sendMessage({ type: "REFRESH" });
    await refreshState();
    setBusy(false);
  });

  openButton.addEventListener("click", () => {
    sendMessage({ type: "OPEN_CALENDAR" });
  });

  optionsButton.addEventListener("click", () => {
    chrome.runtime.openOptionsPage();
  });

  signOutButton.addEventListener("click", async () => {
    setBusy(true);
    await sendMessage({ type: "SIGN_OUT" });
    await refreshState();
    setBusy(false);
  });

  switchAccountButton.addEventListener("click", async () => {
    setBusy(true);
    await sendMessage({ type: "SWITCH_ACCOUNT" });
    await refreshState();
    setBusy(false);
  });
}

async function refreshState() {
  const response = await sendMessage({ type: "GET_STATE" });
  if (!response?.ok) {
    renderError("Could not read extension state.");
    return;
  }

  renderState(response.state || {});
}

function renderState(state) {
  const connected = Boolean(state.connected);
  statusText.textContent = connected
    ? state.quietHours
      ? "Connected (quiet hours active)"
      : "Connected"
    : "Not connected";

  statusText.classList.toggle("connected", connected);
  statusText.classList.toggle("disconnected", !connected);
  connectButton.textContent = connected ? "Reconnect Calendar (Web)" : "Connect Calendar (Web)";
  onboardingCard.classList.toggle("hidden", connected);
  switchAccountButton.classList.toggle("hidden", !connected);
  emptyState.textContent = connected
    ? "No upcoming events in your look-ahead window."
    : "Connect Calendar to load upcoming events.";

  if (connected && state.accountEmail) {
    accountText.textContent = `Calendar account: ${state.accountEmail}`;
  } else {
    accountText.textContent = "Calendar account: not connected";
  }

  renderEvents(Array.isArray(state.events) ? state.events : []);

  if (state.lastSyncAt) {
    lastSync.textContent = `Synced ${formatRelativeTime(state.lastSyncAt)}`;
  } else {
    lastSync.textContent = "Never synced";
  }

  if (state.error) {
    renderError(state.error);
  } else {
    clearError();
  }
}

function renderEvents(events) {
  eventsList.innerHTML = "";

  if (!events.length) {
    emptyState.classList.remove("hidden");
    return;
  }

  emptyState.classList.add("hidden");

  for (const event of events) {
    const item = document.createElement("li");
    item.classList.add("clickable");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.setAttribute("aria-label", `Open ${event.title || "event"} in Google Calendar`);

    const title = document.createElement("p");
    title.className = "event-title";
    title.textContent = event.title || "Untitled event";

    const time = document.createElement("p");
    time.className = "event-time";
    time.textContent = formatEventTime(event.startMs, event.location || "");

    const openEvent = () => {
      if (event.htmlLink) {
        sendMessage({ type: "OPEN_EVENT", url: event.htmlLink });
      }
    };

    item.addEventListener("click", openEvent);
    item.addEventListener("keydown", (keyboardEvent) => {
      if (keyboardEvent.key === "Enter" || keyboardEvent.key === " ") {
        keyboardEvent.preventDefault();
        openEvent();
      }
    });

    item.appendChild(title);
    item.appendChild(time);
    eventsList.appendChild(item);
  }
}

function formatEventTime(startMs, location) {
  const date = new Date(startMs);
  const dateLabel = date.toLocaleDateString([], {
    month: "short",
    day: "numeric"
  });
  const timeLabel = date.toLocaleTimeString([], {
    hour: "numeric",
    minute: "2-digit"
  });

  if (location) {
    return `${dateLabel}, ${timeLabel} - ${location}`;
  }

  return `${dateLabel}, ${timeLabel}`;
}

function formatRelativeTime(isoDate) {
  const now = Date.now();
  const then = new Date(isoDate).getTime();

  if (Number.isNaN(then)) {
    return "just now";
  }

  const seconds = Math.round((now - then) / 1000);
  if (seconds < 5) {
    return "just now";
  }

  if (seconds < 60) {
    return `${seconds}s ago`;
  }

  const minutes = Math.round(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.round(minutes / 60);
  return `${hours}h ago`;
}

function setBusy(busy) {
  connectButton.disabled = busy;
  refreshButton.disabled = busy;
  signOutButton.disabled = busy;
  switchAccountButton.disabled = busy;
}

function renderError(message) {
  errorBanner.textContent = message;
  errorBanner.classList.remove("hidden");
}

function clearError() {
  errorBanner.textContent = "";
  errorBanner.classList.add("hidden");
}

function sendMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { ok: false, error: "No response" });
    });
  });
}
