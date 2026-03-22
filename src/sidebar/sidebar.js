let allImages = [];
let selectedImages = new Set();
let currentTab = null;

// Initialize sidebar
document.addEventListener('DOMContentLoaded', async () => {
  console.log('[Sidebar] Initializing...');
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  currentTab = tabs[0];
  
  console.log('[Sidebar] Current tab:', currentTab?.url);

  setupEventListeners();
  requestImagesFromContentScript();
});

// Setup event listeners
function setupEventListeners() {
  const selectAllBtn = document.getElementById('selectAllBtn');
  const selectNoneBtn = document.getElementById('selectNoneBtn');
  const downloadBtn = document.getElementById('downloadBtn');
  const grabAllToggle = document.getElementById('grabAllToggle');
  const rescanBtn = document.getElementById('rescanBtn');
  
  if (selectAllBtn) selectAllBtn.addEventListener('click', selectAll);
  if (selectNoneBtn) selectNoneBtn.addEventListener('click', selectNone);
  if (downloadBtn) downloadBtn.addEventListener('click', startDownload);
  if (grabAllToggle) grabAllToggle.addEventListener('change', handleGrabAllToggle);
  if (rescanBtn) rescanBtn.addEventListener('click', handleRescan);

  // Format selector
  document.querySelectorAll('input[name="downloadFormat"]').forEach(radio => {
    radio.addEventListener('change', updateDownloadUI);
  });
}

// Request images from content script with retry
function requestImagesFromContentScript() {
  // First, ping to verify content script is alive
  function pingContentScript(callback) {
    console.log('[Sidebar] Attempting to ping content script...');
    chrome.tabs.sendMessage(currentTab.id, { action: 'ping' }, (response) => {
      if (chrome.runtime.lastError) {
        console.warn('[Sidebar] Ping failed:', chrome.runtime.lastError.message);
        callback(false);
      } else if (response?.status === 'alive') {
        console.log('[Sidebar] Content script is alive!');
        callback(true);
      } else {
        console.warn('[Sidebar] Unexpected ping response:', response);
        callback(false);
      }
    });
  }
  
  // Try to get images with retries
  const maxRetries = 5;
  const retryDelay = 300; // ms
  
  function attempt(retryCount = 0) {
    console.log(`[Sidebar] Attempting to get images (attempt ${retryCount + 1}/${maxRetries + 1})...`);
    console.log(`[Sidebar] Tab ID: ${currentTab.id}, URL: ${currentTab.url}`);
    
    chrome.tabs.sendMessage(currentTab.id, { action: 'getImages' }, (response) => {
      // Check for Chrome errors
      if (chrome.runtime.lastError) {
        const errorMsg = chrome.runtime.lastError.message;
        console.warn(`[Sidebar] Attempt ${retryCount + 1}/${maxRetries + 1}: ${errorMsg}`);
        
        if (retryCount < maxRetries) {
          // Retry after delay
          setTimeout(() => attempt(retryCount + 1), retryDelay);
        } else {
          // All retries failed
          console.error('[Sidebar] Failed to get images after all retries:', chrome.runtime.lastError);
          
          // Try to give detailed guidance
          const container = document.getElementById('imageContainer');
          if (container) {
            container.innerHTML = `
              <div class="empty">
                <p>⚠️ Content script not responding</p>
                <p style="font-size: 12px; color: #999; margin-top: 8px;">
                  The extension may not have been injected on this page. Try:
                  <br/>• Refreshing the page (F5)
                  <br/>• Reloading the extension (go to chrome://extensions, toggle off then on)
                  <br/>• Checking browser console (F12) for errors
                </p>
                <button id="retryBtn" class="btn btn-primary" style="margin-top: 12px;">Retry Again</button>
              </div>
            `;
            
            const retryBtn = document.getElementById('retryBtn');
            if (retryBtn) {
              retryBtn.addEventListener('click', handleRescan);
            }
          }
        }
        return;
      }
      
      // Check if response has success flag
      if (response && !response.success) {
        console.warn('[Sidebar] Response indicates failure:', response.error);
        const container = document.getElementById('imageContainer');
        if (container) {
          container.innerHTML = `
            <div class="empty">
              <p>❌ Scan error: ${response.error || 'Unknown error'}</p>
              <p style="font-size: 12px; color: #999; margin-top: 8px;">Check browser console for details</p>
              <button id="retryBtn" class="btn btn-primary" style="margin-top: 12px;">Retry</button>
            </div>
          `;
          
          const retryBtn = document.getElementById('retryBtn');
          if (retryBtn) {
            retryBtn.addEventListener('click', handleRescan);
          }
        }
        return;
      }
      
      // Success
      console.log('[Sidebar] Received images:', response?.images?.length || 0);
      allImages = response?.images || [];
      renderImages();
    });
  }
  
  attempt();
}

// Show retry button when initial scan fails
// Render images in grid
function renderImages() {
  const container = document.getElementById('imageContainer');
  if (!container) {
    console.error('Image container not found');
    return;
  }
  
  container.innerHTML = '';

  if (allImages.length === 0) {
    container.innerHTML = '<div class="empty">No product images found on this page</div>';
    const downloadBtn = document.getElementById('downloadBtn');
    if (downloadBtn) downloadBtn.disabled = true;
    return;
  }

  allImages.forEach((img, index) => {
    const item = document.createElement('div');
    item.className = 'image-item';
    item.innerHTML = `
      <input type="checkbox" class="image-checkbox" data-index="${index}" />
      <div class="image-wrapper">
        <img src="${img.src}" alt="Product image ${index + 1}" loading="lazy" />
      </div>
    `;

    const checkbox = item.querySelector('.image-checkbox');
    if (checkbox) {
      checkbox.addEventListener('change', (e) => {
        if (e.target.checked) {
          selectedImages.add(index);
          item.classList.add('selected');
        } else {
          selectedImages.delete(index);
          item.classList.remove('selected');
        }
        updateSelectCountDisplay();
      });
    }

    container.appendChild(item);
  });

  // Auto-select all if grab all is enabled
  const grabAllToggle = document.getElementById('grabAllToggle');
  if (grabAllToggle && grabAllToggle.checked) {
    selectAll();
  }

  updateSelectCountDisplay();
}

// Select all images
function selectAll() {
  selectedImages.clear();
  document.querySelectorAll('.image-checkbox').forEach((checkbox, idx) => {
    checkbox.checked = true;
    selectedImages.add(idx);
    checkbox.closest('.image-item').classList.add('selected');
  });
  updateSelectCountDisplay();
}

// Clear all selections
function selectNone() {
  selectedImages.clear();
  document.querySelectorAll('.image-checkbox').forEach(checkbox => {
    checkbox.checked = false;
    checkbox.closest('.image-item').classList.remove('selected');
  });
  updateSelectCountDisplay();
}

// Handle grab all toggle
function handleGrabAllToggle(e) {
  if (e.target.checked) {
    selectAll();
  }
}

// Handle rescan button
function handleRescan() {
  console.log('[Sidebar] Rescan button clicked');
  const container = document.getElementById('imageContainer');
  if (container) {
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>Rescanning for product images...</p></div>';
  }
  
  // Clear previous selection
  selectedImages.clear();
  allImages = [];
  
  // Refresh the current tab reference in case user navigated to a new URL
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      currentTab = tabs[0];
      console.log('[Sidebar] Updated tab reference, current URL:', currentTab.url);
      
      // Request fresh images
      requestImagesFromContentScript();
    }
  });
}

// Update selection count display
function updateSelectCountDisplay() {
  const count = selectedImages.size;
  const selectedCount = document.getElementById('selectedCount');
  if (selectedCount) {
    selectedCount.textContent = `${count} selected`;
  }
  
  const downloadBtn = document.getElementById('downloadBtn');
  if (downloadBtn) {
    downloadBtn.disabled = count === 0;
  }
}

// Update download UI based on format
function updateDownloadUI() {
  const formatInput = document.querySelector('input[name="downloadFormat"]:checked');
  const downloadBtn = document.getElementById('downloadBtn');
  
  if (formatInput && downloadBtn) {
    const format = formatInput.value;
    if (format === 'zip') {
      downloadBtn.textContent = `Download as ZIP (${selectedImages.size} files)`;
    } else {
      downloadBtn.textContent = `Download ${selectedImages.size} Files`;
    }
  }
}

// Start download
async function startDownload() {
  const formatInput = document.querySelector('input[name="downloadFormat"]:checked');
  const format = formatInput?.value || 'individual';
  const imagesToDownload = Array.from(selectedImages).map(idx => allImages[idx]).filter(Boolean);

  if (imagesToDownload.length === 0) {
    showError('Please select at least one image');
    return;
  }

  showProgress();

  try {
    if (format === 'zip') {
      await downloadAsZip(imagesToDownload);
    } else {
      await downloadIndividual(imagesToDownload);
    }
    showSuccess(`Successfully downloaded ${imagesToDownload.length} images`);
  } catch (error) {
    console.error('Download error:', error);
    showError(`Download failed: ${error.message}`);
  }

  hideProgress();
}

// Download as individual files
async function downloadIndividual(images) {
  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const filename = generateFilename(img, i);
    
    try {
      const blob = await fetchImageAsBlob(img.src);
      const url = URL.createObjectURL(blob);
      
      await chrome.downloads.download({
        url,
        filename,
        saveAs: false
      });

      // Clean up after download
      setTimeout(() => URL.revokeObjectURL(url), 100);
    } catch (error) {
      console.error(`Failed to download image ${i}:`, error);
    }

    updateDownloadProgress(i + 1, images.length);
  }
}

// Download as ZIP
async function downloadAsZip(images) {
  // Dynamically load jszip
  await loadScript('https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js');
  const JSZip = window.JSZip;

  if (!JSZip) {
    throw new Error('Failed to load ZIP library');
  }

  const zip = new JSZip();

  for (let i = 0; i < images.length; i++) {
    const img = images[i];
    const filename = generateFilename(img, i);

    try {
      const blob = await fetchImageAsBlob(img.src);
      zip.file(filename, blob);
    } catch (error) {
      console.error(`Failed to add image ${i} to ZIP:`, error);
    }

    updateDownloadProgress(i + 1, images.length);
  }

  const zipBlob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(zipBlob);

  const timestamp = new Date().toISOString().slice(0, 10);
  await chrome.downloads.download({
    url,
    filename: `product-images-${timestamp}.zip`,
    saveAs: true
  });

  setTimeout(() => URL.revokeObjectURL(url), 100);
}

// Fetch image as blob
async function fetchImageAsBlob(url) {
  try {
    const response = await fetch(url, { mode: 'cors' });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.blob();
  } catch (error) {
    // Try without CORS mode as fallback
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    return await response.blob();
  }
}

// Load external script
function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

// Generate filename for image
function generateFilename(img, index) {
  const ext = new URL(img.src).pathname.split('.').pop().toLowerCase() || 'jpg';
  const validExt = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext) ? ext : 'jpg';
  
  // Use alt text or title if available
  let basename = img.alt || img.title || `image-${index + 1}`;
  basename = basename.slice(0, 30).replace(/[^a-z0-9]/gi, '-').replace(/-+/g, '-');

  return `${basename}.${validExt}`;
}

// Progress UI
function showProgress() {
  const progressBar = document.getElementById('progressBar');
  const downloadBtn = document.getElementById('downloadBtn');
  if (progressBar) progressBar.style.display = 'block';
  if (downloadBtn) downloadBtn.disabled = true;
}

function hideProgress() {
  const progressBar = document.getElementById('progressBar');
  const downloadBtn = document.getElementById('downloadBtn');
  if (progressBar) progressBar.style.display = 'none';
  if (downloadBtn) downloadBtn.disabled = selectedImages.size === 0;
}

function updateDownloadProgress(current, total) {
  const progressFill = document.querySelector('.progress-fill');
  const progressText = document.querySelector('.progress-text');
  
  if (progressFill && progressText) {
    const percent = Math.round((current / total) * 100);
    progressFill.style.width = percent + '%';
    progressText.textContent = percent + '%';
  }
}

// Status messages
function showError(message) {
  const statusText = document.getElementById('statusText');
  if (statusText) {
    statusText.textContent = message;
    statusText.className = 'status-text error';
    setTimeout(() => clearStatus(), 5000);
  } else {
    console.error('Status element not found, error:', message);
  }
}

function showSuccess(message) {
  const statusText = document.getElementById('statusText');
  if (statusText) {
    statusText.textContent = message;
    statusText.className = 'status-text success';
    setTimeout(() => clearStatus(), 3000);
  } else {
    console.log('Success:', message);
  }
}

function clearStatus() {
  const statusText = document.getElementById('statusText');
  if (statusText) {
    statusText.textContent = '';
    statusText.className = 'status-text';
  }
}

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateImages') {
    allImages = request.images;
    renderImages();
    sendResponse({ success: true });
  }
});
