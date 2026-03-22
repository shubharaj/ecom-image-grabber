# Image Grabber - Chrome Extension

A powerful Chrome extension for grabbing and downloading images from **any website** with smart detection and filtering.

## Features

✨ **Universal Support**
- Works on any website - e-commerce, blogs, galleries, news sites, and more
- Intelligent image detection using heuristic analysis

🎯 **Smart Image Detection**
- Automatically identifies images using multiple detection strategies
- Filters out logos, buttons, icons, and UI elements
- Skips tracking pixels and advertisement images
- Minimum size filtering for quality images (80x80px+)

📸 **Flexible Selection**
- **Grab All Mode**: Automatically select all detected images
- **Manual Selection**: Click individual images to select
- **Multi-select Controls**: Select All / Clear All buttons

💾 **Multiple Download Formats**
- Download individual image files
- Download all selected images as a ZIP archive
- Smart filename generation

🖼️ **Sidebar Panel UI**
- Beautiful, responsive image grid with previews
- Real-time image count and selection status
- Progress bar for downloads
- Status messages and intelligent error handling

## Installation

### For Development/Testing

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd image-grabber
   ```

2. **Load the extension in Chrome:**
   - Open Chrome and go to `chrome://extensions`
   - Enable **Developer mode** (top right toggle)
   - Click **Load unpacked**
   - Select the `image-grabber` folder
   - The extension will appear in your extensions list

## Usage

### Basic Workflow

1. **Navigate to any website** with images you want to grab
2. **Click the extension icon** in the toolbar → The sidebar panel opens showing detected images
3. **Select images:**
   - Enable **"Grab All"** toggle to auto-select all images, OR
   - Manually click checkboxes on images you want
4. **Choose download format:**
   - Select **"Download Individual Files"** to save each image separately
   - Select **"Download as ZIP"** to bundle all selected images
5. **Click "Download Selected"** button
6. Images will be saved to your Downloads folder

### Selection Controls

- **Select All** button: Quickly select all detected images
- **Clear** button: Deselect all images
- **Grab All toggle**: Automatically selects all images when enabled
- **Count display**: Shows how many images are currently selected

### Download Options

- **Individual Files**: Each image is downloaded separately with smart filenames
- **ZIP Archive**: All selected images are bundled into a single ZIP file with timestamp

## Project Structure

```
image-grabber/
├── manifest.json                    # Chrome extension configuration (v3)
├── package.json                     # Dependencies and scripts
├── README.md                        # This file
├── LICENSE                          # MIT License
├── DEBUGGING_GUIDE.md               # Troubleshooting guide
├── src/
│   ├── content.js                   # Content script (runs on all pages)
│   ├── background.js                # Background service worker
│   ├── sidebar/
│   │   ├── index.html              # Sidebar panel UI
│   │   ├── sidebar.js              # Sidebar logic and event handling
│   │   └── styles.css              # Sidebar styling
│   └── utils/
│       ├── imageDetector.js        # Universal image detection
│       └── downloadManager.js      # Download orchestration and ZIP creation
└── assets/                          # Extension icons
```

## How It Works

### Architecture Overview

```
Any Website (HTML)
         ↓
   Content Script (content.js)
    - Scans for all images
    - Applies intelligent filtering
         ↓
   Message to Sidebar
    - Sends detected image list
         ↓
    Sidebar Panel (sidebar.js)
    - Displays image grid with thumbnails
    - Handles user selection
    - Manages download format choice
         ↓
   Background Service Worker (background.js)
    - Orchestrates downloads
    - Handles ZIP creation (jszip library)
         ↓
    Chrome Downloads API
    - Saves files to user's Downloads folder
```

### Image Detection Strategy

The extension uses a **universal heuristic-based approach** to identify quality images:

1. **Size filtering**: Images must be at least 80×80 px (filters out icons/logos)
2. **Container detection**: Looks for common gallery/carousel markup patterns
3. **Alt text analysis**: Scores images based on relevant keywords in alt text
4. **Aspect ratio**: Images with certain aspect ratios score higher
5. **Class name analysis**: Recognizes common image/gallery CSS class patterns
6. **Deduplication**: Normalizes URLs and removes duplicate images
7. **UI element filtering**: Excludes logos, icons, buttons, and tracking pixels

## Configuration & Customization

### Works Everywhere!

The extension works on **any website** - no configuration needed:
- E-commerce sites (Amazon, eBay, Shopify stores, etc.)
- News and magazine sites
- Photo galleries and portfolios
- Social media photo sections
- Travel and real estate listing sites
- And much more!

The universal image detection algorithm adapts to most page structures without needing site-specific logic.

## Development

### NPM Scripts

```bash
# Run extension in watch mode (requires web-ext)
npm run dev

# Build extension for Chrome Web Store submission
npm run build

# Lint code (if eslint is configured)
npm run lint
```

### Debugging

1. **Console logs**: Open extension in `chrome://extensions` → Details → Service Worker (bottom) to see `background.js` logs
2. **Content script logs**: Open DevTools (F12) on the product page to see `content.js` logs
3. **Sidebar logs**: Right-click the sidebar → Inspect to debug sidebar UI

### Testing Checklist

- [ ] Test on various websites (news, gallery, shopping) → verify images detected
- [ ] Test manual selection → click 2-3 images, verify checkboxes
- [ ] Test "Grab All" toggle → verify all images auto-selected
- [ ] Test "Select All" / "Clear" buttons
- [ ] Download as individual files → verify files appear in Downloads folder
- [ ] Download as ZIP → verify archive contains all selected images
- [ ] Test with page that has 50+ images → verify performance
- [ ] Test rescan button on same page with different URL
- [ ] Test error handling → try page with no images

## Known Limitations

1. **CORS restrictions**: Some sites may block direct image downloads from extension context. Workaround: Content script fetches images directly from page context
2. **Dynamic content**: Images loaded after page load may not be detected. Workaround: Extension watches for DOM changes and re-scans
3. **Protected images**: Watermarked or DRM-protected images will be downloaded as-is
4. **Browser storage**: Extension doesn't persist download history (can be added later)

## Future Enhancements

- [ ] Implement image filtering (size, aspect ratio, color, etc.)
- [ ] Add image preview filters before download
- [ ] Create image organization system
- [ ] Add cloud backup capabilities
- [ ] Implement ML-based image quality scoring
- [ ] Create batch operations across multiple pages

## Permissions Explained

The extension requires these permissions:

- **`scripting`** - Inject content scripts into webpages
- **`downloads`** - Save downloaded images to user's Downloads folder
- **`activeTab`** - Know which tab is currently active
- **`sidePanel`** - Display sidebar panel
- **`<all_urls>`** - Works on any website

All site accesses are limited to the e-commerce platforms explicitly listed.

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Support & Issues

If you encounter any issues:

1. Check the [Known Limitations](#known-limitations) section
2. Try testing on a different supported site to isolate the problem
3. Check Chrome extension logs in DevTools
4. Open an issue on GitHub with:
   - Site name where issue occurs
   - Screenshot or error message
   - Steps to reproduce

## Troubleshooting

**Q: Images not detected on a site**
A: The site may have a different HTML structure or use lazy loading. Try:
   - Refreshing the page (F5)
   - Scrolling to load more images
   - Checking the browser console for errors
   - Reloading the extension from `chrome://extensions`

**Q: Download fails with CORS error**
A: This is a browser security limitation. The extension tries to work around it, but some sites may block downloads.

**Q: ZIP file creation is slow**
A: Large image sets (100+ images) take time to download and compress. The progress bar shows current status.

**Q: Extension doesn't appear in Chrome menu**
A: Make sure it's installed and enabled at `chrome://extensions`

**Q: Rescan button doesn't work**
A: Check the [DEBUGGING_GUIDE.md](DEBUGGING_GUIDE.md) for detailed troubleshooting steps.

## Privacy & Security

- No data is sent to external servers (except to fetch images from websites)
- No personal information is collected or stored
- All processing happens locally in your browser
- Downloaded images are saved only to your computer
