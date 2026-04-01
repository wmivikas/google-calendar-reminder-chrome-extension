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

const settingsForm = document.getElementById("settingsForm");
const statusMessage = document.getElementById("statusMessage");
const quietHoursEnabledInput = document.getElementById("quietHoursEnabled");
const quietStartInput = document.getElementById("quietStart");
const quietEndInput = document.getElementById("quietEnd");
const testNotificationButton = document.getElementById("testNotificationButton");
const resetDefaultsButton = document.getElementById("resetDefaultsButton");

initialize();

function initialize() {
  settingsForm.addEventListener("submit", saveSettings);
  quietHoursEnabledInput.addEventListener("change", () => {
    toggleQuietHoursInputs(quietHoursEnabledInput.checked);
  });
  testNotificationButton.addEventListener("click", sendTestNotification);
  resetDefaultsButton.addEventListener("click", resetDefaults);
  loadSettings();
}

async function loadSettings() {
  const settings = await chrome.storage.sync.get(DEFAULT_SETTINGS);

  document.getElementById("reminderLeadMinutes").value = settings.reminderLeadMinutes;
  document.getElementById("lookAheadMinutes").value = settings.lookAheadMinutes;
  document.getElementById("checkIntervalMinutes").value = settings.checkIntervalMinutes;
  document.getElementById("desktopNotifications").checked = settings.desktopNotifications;
  document.getElementById("badgeEnabled").checked = settings.badgeEnabled;
  quietHoursEnabledInput.checked = settings.quietHoursEnabled;
  quietStartInput.value = settings.quietStart;
  quietEndInput.value = settings.quietEnd;

  toggleQuietHoursInputs(settings.quietHoursEnabled);
}

async function saveSettings(event) {
  event.preventDefault();

  const newSettings = {
    reminderLeadMinutes: clamp(
      Number(document.getElementById("reminderLeadMinutes").value),
      1,
      120,
      DEFAULT_SETTINGS.reminderLeadMinutes
    ),
    lookAheadMinutes: clamp(
      Number(document.getElementById("lookAheadMinutes").value),
      15,
      1440,
      DEFAULT_SETTINGS.lookAheadMinutes
    ),
    checkIntervalMinutes: clamp(
      Number(document.getElementById("checkIntervalMinutes").value),
      1,
      60,
      DEFAULT_SETTINGS.checkIntervalMinutes
    ),
    desktopNotifications: document.getElementById("desktopNotifications").checked,
    badgeEnabled: document.getElementById("badgeEnabled").checked,
    quietHoursEnabled: quietHoursEnabledInput.checked,
    quietStart: normalizeTime(quietStartInput.value, DEFAULT_SETTINGS.quietStart),
    quietEnd: normalizeTime(quietEndInput.value, DEFAULT_SETTINGS.quietEnd)
  };

  await chrome.storage.sync.set(newSettings);
  await sendRuntimeMessage({ type: "REFRESH" });

  showStatus("Saved. New settings are active.");
}

async function sendTestNotification() {
  testNotificationButton.disabled = true;
  const response = await sendRuntimeMessage({ type: "TEST_NOTIFICATION" });
  testNotificationButton.disabled = false;

  if (!response?.ok) {
    showStatus("Could not send test alert. Try again.", true);
    return;
  }

  showStatus("Test alert sent. Check Chrome notifications.");
}

async function resetDefaults() {
  resetDefaultsButton.disabled = true;
  await chrome.storage.sync.set(DEFAULT_SETTINGS);
  await loadSettings();
  await sendRuntimeMessage({ type: "REFRESH" });
  resetDefaultsButton.disabled = false;
  showStatus("Defaults restored.");
}

function clamp(value, min, max, fallback) {
  if (!Number.isFinite(value)) {
    return fallback;
  }
  return Math.min(max, Math.max(min, Math.round(value)));
}

function normalizeTime(value, fallback) {
  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }
  return fallback;
}

function toggleQuietHoursInputs(enabled) {
  quietStartInput.disabled = !enabled;
  quietEndInput.disabled = !enabled;
}

function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.classList.toggle("error", isError);
  window.clearTimeout(showStatus.timeoutId);
  showStatus.timeoutId = window.setTimeout(() => {
    statusMessage.textContent = "";
    statusMessage.classList.remove("error");
  }, 2200);
}

function sendRuntimeMessage(message) {
  return new Promise((resolve) => {
    chrome.runtime.sendMessage(message, (response) => {
      if (chrome.runtime.lastError) {
        resolve({ ok: false, error: chrome.runtime.lastError.message });
        return;
      }
      resolve(response || { ok: false });
    });
  });
}
