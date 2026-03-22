// Background service worker for Chrome extension

console.log('[Background] Service worker started');

// Handle extension icon click - open side panel
chrome.action.onClicked.addListener((tab) => {
  console.log('[Background] Icon clicked, tab ID:', tab.id, 'URL:', tab.url);
  
  try {
    if (chrome.sidePanel) {
      chrome.sidePanel.open({ tabId: tab.id }).catch(error => {
        console.error('[Background] Failed to open side panel:', error);
      });
      console.log('[Background] Side panel open command sent');
    } else {
      console.error('[Background] sidePanel API not available');
    }
  } catch (error) {
    console.error('[Background] Error opening side panel:', error);
  }
});

// Listen for messages from sidebar
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateProgress') {
    // Could send progress to other parts of extension
    sendResponse({ success: true });
  }
});

// Handle service worker installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Image Grabber] Extension installed');
  
  // Create periodic cleanup task
  try {
    if (chrome.alarms) {
      chrome.alarms.create('cleanup', { periodInMinutes: 60 });
    }
  } catch (error) {
    console.error('Failed to create alarm:', error);
  }
});

// Listen for alarm events
if (chrome.alarms) {
  chrome.alarms.onAlarm.addListener((alarm) => {
    if (alarm.name === 'cleanup') {
      // Clear any cached data if needed
      console.log('[Image Grabber] Cleanup triggered');
    }
  });
}
