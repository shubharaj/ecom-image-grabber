// Download manager for handling single and batch downloads
// Includes ZIP creation using jszip

export class DownloadManager {
  constructor() {
    this.downloadProgress = 0;
    this.totalDownloads = 0;
  }

  /**
   * Download a single image file
   */
  async downloadImage(imageUrl, filename) {
    try {
      const blob = await this.fetchImageAsBlob(imageUrl);
      return await this.saveBlob(blob, filename);
    } catch (error) {
      throw new Error(`Failed to download image: ${error.message}`);
    }
  }

  /**
   * Download multiple images as individual files
   */
  async downloadImages(images) {
    this.totalDownloads = images.length;
    this.downloadProgress = 0;

    const results = [];
    for (const img of images) {
      try {
        const filename = this.generateFilename(img);
        const result = await this.downloadImage(img.src, filename);
        results.push({ success: true, filename });
      } catch (error) {
        results.push({ success: false, error: error.message });
      }
      this.downloadProgress++;
    }

    return results;
  }

  /**
   * Download multiple images as a ZIP archive
   */
  async downloadAsZip(images, zipName = null) {
    try {
      const JSZip = await this.loadJSZip();
      const zip = new JSZip();

      this.totalDownloads = images.length;
      this.downloadProgress = 0;

      for (const img of images) {
        try {
          const blob = await this.fetchImageAsBlob(img.src);
          const filename = this.generateFilename(img);
          zip.file(filename, blob);
        } catch (error) {
          console.error(`Failed to add image to ZIP: ${error.message}`);
        }
        this.downloadProgress++;
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const timestamp = new Date().toISOString().slice(0, 10);
      const finalZipName = zipName || `product-images-${timestamp}.zip`;

      return await this.saveBlob(zipBlob, finalZipName);
    } catch (error) {
      throw new Error(`Failed to create ZIP: ${error.message}`);
    }
  }

  /**
   * Fetch image as blob
   */
  async fetchImageAsBlob(url) {
    try {
      const response = await fetch(url, {
        mode: 'cors',
        credentials: 'omit',
        headers: {
          'User-Agent': 'Mozilla/5.0'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return await response.blob();
    } catch (error) {
      // Fallback: try without CORS mode
      try {
        const response = await fetch(url, {
          credentials: 'omit'
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        return await response.blob();
      } catch {
        throw new Error(`Failed to fetch ${url}: ${error.message}`);
      }
    }
  }

  /**
   * Save blob using Chrome downloads API
   */
  async saveBlob(blob, filename) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async () => {
        try {
          const url = reader.result;
          await chrome.downloads.download({
            url,
            filename,
            saveAs: false
          });
          resolve({ success: true, filename });
        } catch (error) {
          reject(error);
        }
      };
      reader.onerror = () => {
        reject(new Error('Failed to read blob'));
      };
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Generate filename from image metadata
   */
  generateFilename(img) {
    // Determine extension
    let ext = 'jpg';
    try {
      const url = new URL(img.src);
      const path = url.pathname.toLowerCase();
      const match = path.match(/\.(jpg|jpeg|png|gif|webp)(?:\?|$)/i);
      if (match) {
        ext = match[1].replace('jpeg', 'jpg');
      }
    } catch {
      // Use default jpg
    }

    // Create base filename from alt/title
    let basename = img.alt || img.title || 'image';
    basename = basename
      .slice(0, 40)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');

    if (!basename) {
      basename = `image-${Date.now()}`;
    }

    return `${basename}.${ext}`;
  }

  /**
   * Load JSZip library from CDN
   */
  async loadJSZip() {
    if (window.JSZip) {
      return window.JSZip;
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
      script.onload = () => {
        if (window.JSZip) {
          resolve(window.JSZip);
        } else {
          reject(new Error('JSZip failed to load'));
        }
      };
      script.onerror = () => {
        reject(new Error('Failed to load JSZip library'));
      };
      document.head.appendChild(script);
    });
  }

  /**
   * Get download progress
   */
  getProgress() {
    return {
      current: this.downloadProgress,
      total: this.totalDownloads,
      percent: this.totalDownloads > 0
        ? Math.round((this.downloadProgress / this.totalDownloads) * 100)
        : 0
    };
  }
}

export default DownloadManager;
