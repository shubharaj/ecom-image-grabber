// Content script that runs on product pages
// Detects images and communicates with sidebar

console.log('[Image Grabber] Content script STARTED loading at:', new Date().toISOString());

let detectedImages = [];
let messageListenerActive = false;

// Early message listener setup - before anything else
// Using a wrapper function to ensure it always responds
function setupMessageListener() {
  try {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      try {
        console.log('[Image Grabber] Message received:', request?.action);
        
        if (request?.action === 'ping') {
          // Simple ping to verify content script is alive
          console.log('[Image Grabber] Ping received, responding with pong');
          sendResponse({ status: 'alive', success: true });
        } else if (request?.action === 'getImages') {
          try {
            detectedImages = scanForProductImages();
            console.log('[Image Grabber] Scanned, found:', detectedImages.length, 'images');
            sendResponse({ images: detectedImages, success: true });
          } catch (scanError) {
            console.error('[Image Grabber] Error during scan:', scanError);
            sendResponse({ images: [], error: 'Scan failed', success: false });
          }
          return true; // Keep the message channel open
        } else {
          console.warn('[Image Grabber] Unknown action:', request?.action);
          sendResponse({ error: 'Unknown action', success: false });
        }
      } catch (handlerError) {
        console.error('[Image Grabber] Error in message handler:', handlerError);
        try {
          sendResponse({ error: 'Handler error', success: false });
        } catch (err) {
          console.error('[Image Grabber] Failed to send response:', err);
        }
      }
    });
    
    messageListenerActive = true;
    console.log('[Image Grabber] Message listener registered successfully');
  } catch (error) {
    console.error('[Image Grabber] Failed to register message listener:', error);
  }
}

// Call listener setup immediately
setupMessageListener();

// Initialize on page load
function init() {
  console.log('[Image Grabber] Init called at:', new Date().toISOString());
  scanForProductImages();
  setupDynamicContentObserver();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// Setup observer for dynamic content changes
function setupDynamicContentObserver() {
  const observer = new MutationObserver(() => {
    setTimeout(() => {
      detectedImages = scanForProductImages();
      console.log('[Image Grabber] Updated image count:', detectedImages.length);
    }, 500);
  });

  observer.observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['src', 'data-src']
  });
  
  console.log('[Image Grabber] Dynamic content observer started');
}

// Scan page for product images
function scanForProductImages() {
  try {
    const images = new Set();
    const imageData = new Map();

    // Get all img elements safely
    try {
      const imgElements = document.querySelectorAll('img');
      
      imgElements.forEach(img => {
        try {
          const src = img.src || img.getAttribute('data-src');
          
          if (!src || !isValidImageUrl(src)) {
            return;
          }

          // Skip UI elements (logos, icons, buttons)
          if (isUIElement(img)) {
            return;
          }

          // Get image dimensions
          const width = img.naturalWidth || img.width || 0;
          const height = img.naturalHeight || img.height || 0;

          // Filter by size (product images are typically larger)
          if (width < 80 || height < 80) {
            return;
          }

          // Avoid duplicates
          const key = normalizeUrl(src);
          if (imageData.has(key)) {
            return;
          }

          const metadata = {
            src: src,
            alt: img.alt || '',
            title: img.title || '',
            width: width,
            height: height
          };

          imageData.set(key, metadata);
          images.add(JSON.stringify(metadata));
        } catch (imgError) {
          console.warn('[Image Grabber] Error processing image element:', imgError);
        }
      });
    } catch (imgSelectError) {
      console.error('[Image Grabber] Error selecting img elements:', imgSelectError);
    }

    // Also check for picture elements
    try {
      document.querySelectorAll('picture').forEach(picture => {
        try {
          const img = picture.querySelector('img');
          const sources = picture.querySelectorAll('source');

          sources.forEach(source => {
            const src = source.srcset || source.src;
            if (src && isValidImageUrl(src)) {
              const key = normalizeUrl(src);
              if (!imageData.has(key)) {
                const width = img?.naturalWidth || img?.width || 0;
                const height = img?.naturalHeight || img?.height || 0;

                if (width >= 80 && height >= 80) {
                  const metadata = {
                    src: src.split(',')[0].trim().split(' ')[0],
                    alt: img?.alt || '',
                    title: img?.title || '',
                    width: width,
                    height: height
                  };
                  imageData.set(key, metadata);
                  images.add(JSON.stringify(metadata));
                }
              }
            }
          });
        } catch (pictureError) {
          console.warn('[Image Grabber] Error processing picture element:', pictureError);
        }
      });
    } catch (pictureSelectError) {
      console.error('[Image Grabber] Error selecting picture elements:', pictureSelectError);
    }

    const result = Array.from(images).map(item => {
      try {
        return JSON.parse(item);
      } catch (parseError) {
        console.warn('[Image Grabber] Error parsing image metadata:', parseError);
        return null;
      }
    }).filter(Boolean); // Remove any null entries
    
    console.log('[Image Grabber] Scan completed, found:', result.length, 'images');
    return result;
  } catch (outerError) {
    console.error('[Image Grabber] Critical error in scanForProductImages:', outerError);
    return [];
  }
}

// Check if URL is a valid image
function isValidImageUrl(url) {
  if (!url) return false;
  
  // Skip data URLs that are too small (likely icons)
  if (url.startsWith('data:')) {
    return false;
  }

  // Skip common tracking/UI URLs
  const skipPatterns = [
    /pixel|beacon|tracking|ads|analytics|doubleclick|facebook|google|cdn\.jsdelivr/i
  ];

  if (skipPatterns.some(pattern => pattern.test(url))) {
    return false;
  }

  return true;
}

// Check if element is UI element (logo, icon, button)
function isUIElement(img) {
  // Check class names
  const className = img.className?.toLowerCase() || '';
  const uiClasses = ['logo', 'icon', 'button', 'avatar', 'badge', 'flag', 'star', 'close'];
  if (uiClasses.some(cls => className.includes(cls))) {
    return true;
  }

  // Check parent element
  let parent = img.parentElement;
  for (let i = 0; i < 3; i++) {
    if (!parent) break;
    const parentClass = parent.className?.toLowerCase() || '';
    if (uiClasses.some(cls => parentClass.includes(cls))) {
      return true;
    }
    parent = parent.parentElement;
  }

  // Check dimensions (very small = likely icon)
  const width = img.naturalWidth || img.width || 0;
  const height = img.naturalHeight || img.height || 0;
  if (width > 0 && height > 0 && width < 80 && height < 80) {
    return true;
  }

  return false;
}

// Normalize URL for deduplication
function normalizeUrl(url) {
  try {
    const urlObj = new URL(url, window.location.origin);
    // Remove query params that might differ but point to same image
    urlObj.search = '';
    return urlObj.toString();
  } catch {
    return url;
  }
}

// Log for debugging
console.log('[Image Grabber] Content script loaded');
