# Debugging Guide: Rescan Button Issue

## Problem
The extension works perfectly when you first open it, but clicking the "Rescan for Images" button after navigating to a different URL results in:
```
Could not establish connection. Receiving end does not exist.
```

## Root Cause Analysis
This error means the sidebar's message is not reaching the content script. Possible causes:
1. **Content script was uninjected** when the page navigated
2. **Message listener was deactivated** or crashed
3. **Tab context is stale** (though code handles this)
4. **Manifest patterns don't match** the URLs you're testing

## Debug Steps (Follow in Order)

### Step 1: Verify Manifest Support
Check which URLs you're testing:
- **1688.com variants**: detail.1688.com, search.1688.com, trade.1688.com
- **Others**: Similar subdomain variations

✅ **Required pattern support**: The manifest should match these patterns:
```
*://1688.com/*
*://*.1688.com/*
*://alibaba.com/*
*://*.alibaba.com/*
*://aliexpress.com/*
*://*.aliexpress.com/*
*://dhgate.com/*
*://*.dhgate.com/*
```

### Step 2: Check Extension Installation
1. Go to `chrome://extensions`
2. Find "Product Image Grabber" extension
3. Make sure it's **enabled** (blue toggle on right)
4. Look for any warnings or "Errors" button - click it if present
5. Note the extension **ID** (you'll need it for next steps)

### Step 3: Verify Content Script Injection
1. Open a product page: `https://detail.1688.com/product/1234567890`
2. Open Developer Tools: Press **F12**
3. Click on **Console** tab
4. Look for messages starting with `[Image Grabber]`:
   - ✅ **Good**: See `[Image Grabber] Content script STARTED loading`
   - ✅ **Good**: See `[Image Grabber] Message listener registered successfully`
   - ❌ **Bad**: See nothing starting with `[Image Grabber]`

If you see these messages, the content script is injected. Skip to Step 5.

### Step 4: Check Service Worker (if no console messages)
1. Go to `chrome://extensions`
2. For the extension, click **"Service Worker"** link or click **"Details"** then **"Inspect views"** → **"service_worker.js"**
3. Look for console errors
4. Check if there are any permission issues
5. **Try this fix**: 
   - Click the toggle to disable the extension (wait 2 seconds)
   - Click the toggle to enable the extension again
   - Reload the product page (F5)
   - Go back to Step 3

### Step 5: Test Initial Load
1. Make sure the page is fully loaded
2. Click the extension icon (puzzle piece in toolbar)
3. A sidebar should open on the right side
4. You should see "Scanning for product images..." then images
5. Open the **Console** in the sidebar DevTools (right-click on sidebar → Inspect)
6. Check console for:
   - ✅ `[Sidebar] Initializing...`
   - ✅ `[Sidebar] Received images: X` (where X is a number)

If images appear: **Initial load works ✓**
If not: The extension is not properly set up on this site.

### Step 6: Test Rescan on Same URL
1. In the same sidebar, scroll down and click **🔄 Rescan for Images**
2. Should show "Rescanning..." then images again
3. Check console for:
   - ✅ `[Sidebar] Rescan button clicked`
   - ✅ `[Sidebar] Message received: getImages`

If this works: **Same-URL rescan works ✓**

### Step 7: Test Rescan After Navigation (The Bug)
1. With images still displayed in sidebar, navigate to a DIFFERENT product on the same site
   - Example: Go to `https://search.1688.com/...` (different subdomain)
   - Or change the product ID in the URL
2. The sidebar should still be open
3. Click **🔄 Rescan for Images**
4. Check what happens:

**Case A: Works** - Images appear
- Your extension is functioning correctly! ✓
- The issue might be temporary or already fixed

**Case B: Fails with "Content script not responding"**
- Check the page console (F12):
  - ❌ **Problem**: NO `[Image Grabber]` messages
  - This means content script was uninjected
  - See **Solution A** below

**Case C: Fails with specific error message**
- Check the page console for `[Image Grabber]` errors
- See **Solution C** below

## Solutions

### Solution A: Content Script Uninjection (Most Likely)
This happens when navigating between different subdomains or when a page doesn't fully reload.

**Fix Option 1 - Reload Extension:**
1. Go to `chrome://extensions`
2. Click the toggle to disable extension
3. Wait 2 seconds, toggle back on
4. Reload all open product pages (F5)
5. Try again

**Fix Option 2 - Use Different URLs on Same Subdomain:**
- Instead of navigating between search.1688.com and detail.1688.com
- Try: detail.1688.com/product/111 → detail.1688.com/product/222
- Same subdomain might prevent uninjection

**Fix Option 3 - Check Manifest Patterns:**
If you're testing with a URL pattern not listed in Step 1, it won't work because the manifest doesn't match.

### Solution B: Message Listener Crashed
If you see `[Image Grabber]` messages but then errors:

Check the specific error in the page console and:
1. Look for `[Image Grabber] Error` messages
2. Report these errors - they indicate bugs in image scanning logic
3. Try refreshing the page (F5)

### Solution C: Chrome Version Issue
Some older Chrome versions have bugs with content script persistence:
- Open `chrome://version`
- Look for "Chrome" version number
- If version < 120, consider updating Chrome

## Advanced Debugging

### Check Message Flow
Enable detailed logging (add to sidebar.js right at the top of `requestImagesFromContentScript()`):
```javascript
console.log('[Sidebar DEBUG] Current tab:', currentTab);
console.log('[Sidebar DEBUG] Sending message to tab:', currentTab.id);
```

### Verify Tab Identity
In console when sidebar opens:
```javascript
// Copy-paste into sidebar console
chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  console.log('Active tab:', tabs[0]);
});
```

### Check Manifest Validity
1. Go to `chrome://extensions`
2. Find extension, click **Details**
3. Look for **"Errors"** button
4. If present, click it to see manifest/permission errors

## Success Checklist

✅ Initial load works and images display
✅ Rescan on same URL works  
✅ Rescan after navigating to different URL works
✅ No "Could not establish connection" errors
✅ No console errors starting with `[Image Grabber]`

## Still Having Issues?

1. **Collect Information:**
   - Chrome version: chrome://version
   - Extension version: 1.0.0
   - Exact URL you're testing
   - Screenshots of console errors
   - Manifest content from chrome://extensions Details

2. **Test on Different Site:**
   - Try with another supported site (Alibaba, AliExpress, DHgate)
   - Determines if it's site-specific

3. **Check Recent Chrome Updates:**
   - Sometimes Chrome updates affect extensions
   - Try disabling other extensions temporarily to test
