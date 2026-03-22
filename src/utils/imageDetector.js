// Image detection module for identifying product images
// Uses heuristic-based approach with multiple signals

export function detectProductImages(document) {
  const candidates = [];

  // Strategy 1: Large images in common product gallery containers
  const gallerySelectors = [
    '.gallery', '.slider', '.carousel', '.product-images',
    '[class*="gallery"]', '[class*="carousel"]', '[class*="slider"]',
    '[role="presentation"]', '.product-detail'
  ];

  gallerySelectors.forEach(selector => {
    try {
      const containers = document.querySelectorAll(selector);
      containers.forEach(container => {
        const imgs = container.querySelectorAll('img');
        imgs.forEach(img => {
          const score = scoreImage(img, 'gallery', container);
          if (score > 0.3) {
            candidates.push({ img, score, source: 'gallery' });
          }
        });
      });
    } catch (e) {
      // Selector might be invalid
    }
  });

  // Strategy 2: Large images with descriptive alt text
  const allImages = document.querySelectorAll('img');
  allImages.forEach(img => {
    if (!candidates.find(c => c.img === img)) {
      const score = scoreImage(img, 'alt-text', null);
      if (score > 0.5) {
        candidates.push({ img, score, source: 'alt-text' });
      }
    }
  });

  // Deduplicate and sort by score
  const uniqueImages = deduplicateImages(candidates);
  return uniqueImages.sort((a, b) => b.score - a.score);
}

function scoreImage(img, source, container) {
  let score = 0;

  // Size score
  const width = img.naturalWidth || img.width || 0;
  const height = img.naturalHeight || img.height || 0;
  const area = width * height;

  if (area > 50000) score += 0.3;
  else if (area > 10000) score += 0.15;

  // Alt text score
  const alt = (img.alt || '').toLowerCase();
  const title = (img.title || '').toLowerCase();
  const productKeywords = ['product', 'image', 'photo', 'picture', 'image', 'color', 'size'];
  const uiKeywords = ['logo', 'icon', 'button', 'flag', 'avatar', 'star', 'badge'];

  let hasProductKeyword = productKeywords.some(kw => alt.includes(kw) || title.includes(kw));
  let hasUIKeyword = uiKeywords.some(kw => alt.includes(kw) || title.includes(kw));

  if (hasProductKeyword) score += 0.3;
  if (hasUIKeyword) score -= 0.4;

  // Aspect ratio (product images are often square or portrait)
  if (width > 0 && height > 0) {
    const ratio = Math.min(width, height) / Math.max(width, height);
    if (ratio > 0.7) score += 0.2;
  }

  // Class name score
  const className = img.className.toLowerCase();
  if (className.includes('product') || className.includes('gallery')) {
    score += 0.2;
  }

  // Source from gallery container
  if (source === 'gallery') {
    score += 0.1;
  }

  return Math.min(score, 1.0);
}

function deduplicateImages(candidates) {
  const seen = new Set();
  const deduplicated = [];

  candidates.forEach(candidate => {
    const src = normalizeImageUrl(candidate.img.src);
    if (!seen.has(src)) {
      seen.add(src);
      deduplicated.push(candidate);
    }
  });

  return deduplicated;
}

function normalizeImageUrl(url) {
  try {
    const urlObj = new URL(url);
    urlObj.search = '';
    urlObj.hash = '';
    return urlObj.toString();
  } catch {
    return url;
  }
}

export default { detectProductImages };
