# YouTube Default Playback Speed (Improved)

An enhanced userscript that automatically sets YouTube playback speed for regular videos, while intelligently skipping live streams, shorts, premieres, and music videos.

## 🎯 Features

- **Default Speed Settings**: Choose from 0.25x to 2x playback speeds for new videos
- **Smart Video Detection**: Automatically detects and skips live streams, shorts, premieres, and music videos
- **Regular Videos Only**: Only applies speed changes to standard YouTube videos
- **Tampermonkey Menu Integration**: Easy-to-use menu system for speed selection
- **Persistent Settings**: Settings are saved and restored between sessions
- **Page Load Speed Setting**: Sets speed when videos first load (refresh required for changes)
- **Enhanced Reliability**: Improved video element detection and retry mechanisms
- **Performance Optimized**: Debounced events and efficient caching system
- **Debug Mode**: Comprehensive logging for troubleshooting
- **Memory Safe**: Proper cleanup and resource management
- **YouTube SPA Support**: Handles YouTube's single-page application navigation

## 🚀 Installation

1. Install a userscript manager:
   - **Chrome/Edge**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
   - **Safari**: [Tampermonkey](https://apps.apple.com/us/app/tampermonkey/id1482490089)

2. Copy the script code from the details section below
3. Create a new userscript in your manager and paste the code
4. Save and enable the script
5. Reload YouTube and check the Tampermonkey menu for options

## ✨ Improvements Over Original

### 🏗️ **Architecture & Organization**
- **Modular Design**: Split into focused classes (`VideoDetector`, `VideoManager`, `SettingsManager`, `MenuManager`)
- **Better Code Structure**: Clean separation of concerns and responsibilities
- **Modern JavaScript**: Uses ES6+ features and modern patterns
- **Error Handling**: Comprehensive error handling with graceful degradation

### ⚡ **Performance Enhancements**
- **Smart Caching**: Caches video type detection results for better performance
- **Debounced Events**: Prevents excessive function calls during rapid changes
- **Efficient DOM Queries**: Optimized selectors and reduced repeated queries
- **Memory Management**: Proper cleanup of timers, observers, and event listeners

### 🛡️ **Enhanced Reliability**
- **Improved Video Detection**: Better detection of video elements across different YouTube layouts
- **Robust Retry Logic**: More sophisticated retry mechanisms with configurable delays
- **Multiple Detection Methods**: Uses multiple strategies to find video elements
- **State Management**: Better handling of processing states and race conditions

### 🎛️ **Simplified Configuration**
- **Speed Selection**: Choose from 8 different speed options (0.25x to 2x)
- **Auto-Detection**: Automatically skips non-regular videos (live streams, shorts, premieres, music)
- **Persistent Settings**: Settings automatically saved and restored
- **Menu Integration**: Clean Tampermonkey menu with visual indicators

### 🔍 **Smart Detection System**
- **Live Stream Detection**: Enhanced detection with multiple selectors and visibility checks
- **Shorts Detection**: Improved detection for YouTube Shorts
- **Premiere Detection**: Better premiere video identification
- **Music Video Detection**: Detects YouTube Music and music-related content
- **Auto-Skip Logic**: Automatically skips all non-regular videos to preserve intended experience

## 🎛️ Configuration Options

Access all settings through the Tampermonkey menu:

### Speed Selection
- **✅ Speed: 1.25x** - Currently selected speed
- **⚪ Speed: 1.5x** - Available speed option
- **⚪ Speed: 2x** - Available speed option
- *(All speeds from 0.25x to 2x available)*

### Options
- **⚪ Debug Mode** - Enable detailed console logging

*Note: ✅ indicates selected options, ⚪ indicates available options*

The script automatically applies your selected speed only to regular YouTube videos, while skipping live streams, shorts, premieres, and music videos.

## 📋 Script Code

<details>
<summary>Click to expand the complete userscript code</summary>

```javascript
// ==UserScript==
// @name         YouTube Default Playback Speed (Improved)
// @namespace    https://youtube.com/
// @version      3.0
// @description  Automatically sets YouTube playback speed with configurable settings, smart detection, and better reliability
// @author       RM
// @match        https://www.youtube.com/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// ==/UserScript==

(function() {
    'use strict';

    // ===============================
    // CONFIGURATION & CONSTANTS
    // ===============================
    const CONFIG = {
        DEFAULT_SETTINGS: {
            speed: 1.25,
            enableShorts: false,
            enableLive: false,
            enablePremiere: false,
            enableMusic: true,
            debug: false
        },
        TIMERS: {
            RETRY_DELAY: 300,
            INITIALIZATION_DELAY: 800,
            SETTINGS_MENU_DELAY: 150,
            DEBOUNCE_DELAY: 250
        },
        MAX_RETRIES: 12,
        SCRIPT_NAME: 'YouTube Speed',
        AVAILABLE_SPEEDS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
    };

    // ===============================
    // UTILITY CLASSES
    // ===============================
    class Logger {
        constructor(name, enabled = false) {
            this.name = name;
            this.enabled = enabled;
        }

        setEnabled(enabled) {
            this.enabled = enabled;
        }

        log(message, level = 'info') {
            if (!this.enabled) return;
            const timestamp = new Date().toTimeString().split(' ')[0];
            console.log(`[${this.name}] ${timestamp} ${message}`);
        }

        error(message) {
            this.log(`ERROR: ${message}`, 'error');
        }

        warn(message) {
            this.log(`WARN: ${message}`, 'warn');
        }

        debug(message) {
            this.log(`DEBUG: ${message}`, 'debug');
        }
    }

    class Timer {
        constructor() {
            this.timers = new Set();
        }

        setTimeout(callback, delay) {
            const id = setTimeout(() => {
                this.timers.delete(id);
                callback();
            }, delay);
            this.timers.add(id);
            return id;
        }

        setInterval(callback, interval) {
            const id = setInterval(callback, interval);
            this.timers.add(id);
            return id;
        }

        clearTimeout(id) {
            clearTimeout(id);
            this.timers.delete(id);
        }

        clearInterval(id) {
            clearInterval(id);
            this.timers.delete(id);
        }

        clearAll() {
            this.timers.forEach(id => {
                clearTimeout(id);
                clearInterval(id);
            });
            this.timers.clear();
        }
    }

    class Debouncer {
        constructor() {
            this.timeouts = new Map();
        }

        debounce(key, callback, delay) {
            if (this.timeouts.has(key)) {
                clearTimeout(this.timeouts.get(key));
            }
            
            const timeoutId = setTimeout(() => {
                this.timeouts.delete(key);
                callback();
            }, delay);
            
            this.timeouts.set(key, timeoutId);
        }

        clear() {
            this.timeouts.forEach(id => clearTimeout(id));
            this.timeouts.clear();
        }
    }

    // ===============================
    // STORAGE MANAGEMENT
    // ===============================
    class SettingsManager {
        constructor(logger) {
            this.logger = logger;
            this.settings = { ...CONFIG.DEFAULT_SETTINGS };
            this.useCompatibilityMode = typeof GM === 'undefined';
        }

        async loadSettings() {
            try {
                const getValue = this.useCompatibilityMode ? GM_getValue : GM.getValue;
                const stored = await getValue('speedSettings', JSON.stringify(CONFIG.DEFAULT_SETTINGS));
                const parsed = JSON.parse(stored);
                
                // Merge with defaults to handle new settings
                this.settings = { ...CONFIG.DEFAULT_SETTINGS, ...parsed };
                
                // Validate speed setting
                if (!CONFIG.AVAILABLE_SPEEDS.includes(this.settings.speed)) {
                    this.settings.speed = CONFIG.DEFAULT_SETTINGS.speed;
                }

                this.logger.debug(`Settings loaded: ${JSON.stringify(this.settings)}`);
                await this.saveSettings();
                return this.settings;
            } catch (error) {
                this.logger.error(`Failed to load settings: ${error.message}`);
                return CONFIG.DEFAULT_SETTINGS;
            }
        }

        async saveSettings() {
            try {
                const setValue = this.useCompatibilityMode ? GM_setValue : GM.setValue;
                await setValue('speedSettings', JSON.stringify(this.settings));
                this.logger.debug('Settings saved successfully');
            } catch (error) {
                this.logger.error(`Failed to save settings: ${error.message}`);
            }
        }

        async updateSetting(key, value) {
            this.settings[key] = value;
            await this.saveSettings();
            this.logger.log(`Setting updated: ${key} = ${value}`);
        }

        get(key) {
            return this.settings[key];
        }
    }

    // ===============================
    // VIDEO DETECTION SYSTEM
    // ===============================
    class VideoDetector {
        constructor(logger) {
            this.logger = logger;
            this.cache = new Map();
            this.cacheTimeout = 5000; // 5 seconds
        }

        isLiveStream() {
            return this._checkWithCache('live', () => {
                const selectors = [
                    '.ytp-live-badge:not([style*="display: none"])',
                    '.ytp-live:not([style*="display: none"])',
                    '[data-title-no-tooltip="LIVE"]',
                    '.badge-style-type-live-now',
                    '.ytp-chrome-top .ytp-live'
                ];

                return selectors.some(selector => {
                    const elements = document.querySelectorAll(selector);
                    return Array.from(elements).some(el => 
                        el.offsetParent !== null && 
                        getComputedStyle(el).display !== 'none' &&
                        getComputedStyle(el).visibility !== 'hidden'
                    );
                });
            });
        }

        isShorts() {
            return this._checkWithCache('shorts', () => {
                return window.location.pathname.includes('/shorts/') ||
                       document.querySelector('#shorts-player') !== null ||
                       document.querySelector('ytd-shorts') !== null;
            });
        }

        isPremiere() {
            return this._checkWithCache('premiere', () => {
                const selectors = [
                    '.ytp-premiere-info-title',
                    '[aria-label*="premiere" i]',
                    '.premiere-badge',
                    '[title*="premiere" i]'
                ];

                return selectors.some(selector => document.querySelector(selector));
            });
        }

        isMusicVideo() {
            return this._checkWithCache('music', () => {
                const indicators = [
                    () => window.location.hostname === 'music.youtube.com',
                    () => document.querySelector('ytmusic-app') !== null,
                    () => document.querySelector('#song-image') !== null,
                    () => document.querySelector('.ytmusic-player') !== null
                ];

                return indicators.some(check => check());
            });
        }

        isPlaylist() {
            return this._checkWithCache('playlist', () => {
                return window.location.search.includes('list=') ||
                       document.querySelector('#playlist') !== null;
            });
        }

        _checkWithCache(key, checkFunction) {
            const now = Date.now();
            const cached = this.cache.get(key);
            
            if (cached && (now - cached.timestamp) < this.cacheTimeout) {
                return cached.value;
            }

            const result = checkFunction();
            this.cache.set(key, { value: result, timestamp: now });
            
            return result;
        }

        clearCache() {
            this.cache.clear();
        }

        getVideoType() {
            if (this.isLiveStream()) return 'live';
            if (this.isShorts()) return 'shorts';
            if (this.isPremiere()) return 'premiere';
            if (this.isMusicVideo()) return 'music';
            if (this.isPlaylist()) return 'playlist';
            return 'regular';
        }
    }

    // ===============================
    // VIDEO ELEMENT MANAGER
    // ===============================
    class VideoManager {
        constructor(logger, timer) {
            this.logger = logger;
            this.timer = timer;
            this.currentVideo = null;
            this.observers = new Set();
        }

        async findVideoElement(maxRetries = CONFIG.MAX_RETRIES) {
            return new Promise((resolve, reject) => {
                let retryCount = 0;

                const checkForVideo = () => {
                    const selectors = [
                        'video.html5-main-video',
                        'video.video-stream',
                        'video[src]',
                        '#movie_player video',
                        'ytd-player video'
                    ];

                    for (const selector of selectors) {
                        const video = document.querySelector(selector);
                        if (video && video.readyState >= 1) {
                            this.currentVideo = video;
                            this.logger.debug(`Video element found: ${selector}`);
                            return resolve(video);
                        }
                    }

                    if (++retryCount < maxRetries) {
                        this.timer.setTimeout(checkForVideo, CONFIG.TIMERS.RETRY_DELAY);
                    } else {
                        reject(new Error(`Video element not found after ${maxRetries} retries`));
                    }
                };

                checkForVideo();
            });
        }

        async setPlaybackSpeed(targetSpeed) {
            try {
                const video = this.currentVideo || await this.findVideoElement();
                
                if (!video) {
                    throw new Error('No video element available');
                }

                // Wait for video to be ready
                if (video.readyState < 1) {
                    await new Promise(resolve => {
                        const handler = () => {
                            video.removeEventListener('loadedmetadata', handler);
                            resolve();
                        };
                        video.addEventListener('loadedmetadata', handler);
                    });
                }

                if (Math.abs(video.playbackRate - targetSpeed) > 0.01) {
                    const originalSpeed = video.playbackRate;
                    video.playbackRate = targetSpeed;
                    this.logger.log(`Speed changed: ${originalSpeed}x → ${targetSpeed}x`);
                    return true;
                } else {
                    this.logger.debug(`Speed already set to ${targetSpeed}x`);
                    return false;
                }

            } catch (error) {
                this.logger.error(`Failed to set playback speed: ${error.message}`);
                throw error;
            }
        }

        setupVideoObserver(callback) {
            // Clean up existing observers
            this.cleanupObservers();

            // Create mutation observer for video element changes
            const observer = new MutationObserver((mutations) => {
                const hasVideoChanges = mutations.some(mutation => 
                    Array.from(mutation.addedNodes).some(node => 
                        node.nodeType === Node.ELEMENT_NODE && 
                        (node.tagName === 'VIDEO' || node.querySelector('video'))
                    )
                );

                if (hasVideoChanges) {
                    this.logger.debug('Video element change detected');
                    this.currentVideo = null; // Reset cached video
                    callback();
                }
            });

            observer.observe(document.body, {
                childList: true,
                subtree: true
            });

            this.observers.add(observer);
            return observer;
        }

        cleanupObservers() {
            this.observers.forEach(observer => observer.disconnect());
            this.observers.clear();
        }

        cleanup() {
            this.cleanupObservers();
            this.currentVideo = null;
        }
    }

    // ===============================
    // MENU SYSTEM
    // ===============================
    class MenuManager {
        constructor(settingsManager, logger) {
            this.settingsManager = settingsManager;
            this.logger = logger;
            this.menuIds = [];
        }

        createMenus() {
            try {
                const registerMenuCommand = typeof GM !== 'undefined' ? 
                    GM.registerMenuCommand : GM_registerMenuCommand;

                // Speed selection menus
                CONFIG.AVAILABLE_SPEEDS.forEach(speed => {
                    const isSelected = speed === this.settingsManager.get('speed');
                    const label = `${isSelected ? '✅' : '⚪'} Speed: ${speed}x`;
                    
                    const menuId = registerMenuCommand(label, async () => {
                        await this.settingsManager.updateSetting('speed', speed);
                        this.refreshMenus();
                        this.logger.log(`Speed setting changed to ${speed}x`);
                    });
                    
                    this.menuIds.push(menuId);
                });

                // Separator
                this.menuIds.push(registerMenuCommand('─────────────', () => {}));

                // Feature toggles
                const toggles = [
                    { key: 'enableShorts', label: 'Enable for Shorts' },
                    { key: 'enableLive', label: 'Enable for Live Streams' },
                    { key: 'enablePremiere', label: 'Enable for Premieres' },
                    { key: 'enableMusic', label: 'Enable for Music' },
                    { key: 'debug', label: 'Debug Mode' }
                ];

                toggles.forEach(({ key, label }) => {
                    const isEnabled = this.settingsManager.get(key);
                    const menuLabel = `${isEnabled ? '✅' : '⚪'} ${label}`;
                    
                    const menuId = registerMenuCommand(menuLabel, async () => {
                        await this.settingsManager.updateSetting(key, !isEnabled);
                        if (key === 'debug') {
                            app.logger.setEnabled(!isEnabled);
                        }
                        this.refreshMenus();
                        this.logger.log(`${label} ${!isEnabled ? 'enabled' : 'disabled'}`);
                    });
                    
                    this.menuIds.push(menuId);
                });

            } catch (error) {
                this.logger.error(`Failed to create menus: ${error.message}`);
            }
        }

        refreshMenus() {
            // Note: Most userscript managers don't support menu refresh
            // This is a placeholder for future enhancement
            this.logger.debug('Menu refresh requested (restart script to see changes)');
        }

        cleanup() {
            this.menuIds = [];
        }
    }

    // ===============================
    // MAIN APPLICATION CLASS
    // ===============================
    class YouTubeSpeedController {
        constructor() {
            this.logger = new Logger(CONFIG.SCRIPT_NAME);
            this.timer = new Timer();
            this.debouncer = new Debouncer();
            this.settingsManager = new SettingsManager(this.logger);
            this.videoDetector = new VideoDetector(this.logger);
            this.videoManager = new VideoManager(this.logger, this.timer);
            this.menuManager = new MenuManager(this.settingsManager, this.logger);
            
            this.currentUrl = '';
            this.isProcessing = false;
            this.eventListeners = [];
        }

        async initialize() {
            try {
                // Load settings
                await this.settingsManager.loadSettings();
                this.logger.setEnabled(this.settingsManager.get('debug'));
                
                // Create menus
                this.menuManager.createMenus();
                
                // Setup event listeners
                this.setupEventListeners();
                
                // Initialize current URL
                this.currentUrl = window.location.href;
                
                // Initial speed setting
                this.timer.setTimeout(() => {
                    this.handleSpeedChange();
                }, CONFIG.TIMERS.INITIALIZATION_DELAY);

                this.logger.log('YouTube Speed Controller initialized successfully');
                
            } catch (error) {
                this.logger.error(`Initialization failed: ${error.message}`);
            }
        }

        setupEventListeners() {
            // URL change detection
            this.setupUrlChangeDetection();
            
            // Video events
            this.addEventListeners([
                { target: document, type: 'loadstart', handler: (e) => this.handleVideoEvent(e), capture: true },
                { target: document, type: 'canplay', handler: (e) => this.handleVideoEvent(e), capture: true },
                { target: document, type: 'playing', handler: (e) => this.handleVideoEvent(e), capture: true }
            ]);

            // Video element observer
            this.videoManager.setupVideoObserver(() => {
                this.debouncer.debounce('videoChange', () => {
                    this.handleSpeedChange();
                }, CONFIG.TIMERS.DEBOUNCE_DELAY);
            });

            // Cleanup on page unload
            window.addEventListener('beforeunload', () => this.cleanup());
        }

        setupUrlChangeDetection() {
            // YouTube SPA navigation
            let lastUrl = location.href;
            const urlObserver = new MutationObserver(() => {
                const url = location.href;
                if (url !== lastUrl) {
                    lastUrl = url;
                    this.handleUrlChange(url);
                }
            });

            urlObserver.observe(document, { subtree: true, childList: true });

            // YouTube custom events
            const ytEvents = ['yt-navigate-start', 'yt-navigate-finish', 'yt-page-data-updated'];
            ytEvents.forEach(eventName => {
                window.addEventListener(eventName, () => {
                    this.timer.setTimeout(() => {
                        this.handleUrlChange(location.href);
                    }, 300);
                });
            });
        }

        addEventListeners(listeners) {
            listeners.forEach(({ target, type, handler, capture = false }) => {
                target.addEventListener(type, handler, capture);
                this.eventListeners.push({ target, type, handler, capture });
            });
        }

        handleUrlChange(newUrl) {
            if (newUrl !== this.currentUrl) {
                this.currentUrl = newUrl;
                this.logger.debug(`URL changed: ${newUrl}`);
                
                // Clear caches
                this.videoDetector.clearCache();
                this.videoManager.currentVideo = null;
                
                // Reset processing state
                this.isProcessing = false;
                
                // Handle speed change with delay
                this.debouncer.debounce('urlChange', () => {
                    this.handleSpeedChange();
                }, CONFIG.TIMERS.INITIALIZATION_DELAY);
            }
        }

        handleVideoEvent(event) {
            if (event.target.tagName === 'VIDEO') {
                this.logger.debug(`Video event: ${event.type}`);
                this.debouncer.debounce('videoEvent', () => {
                    this.handleSpeedChange();
                }, CONFIG.TIMERS.RETRY_DELAY);
            }
        }

        async handleSpeedChange() {
            if (this.isProcessing) return;
            
            this.isProcessing = true;
            
            try {
                const videoType = this.videoDetector.getVideoType();
                const targetSpeed = this.settingsManager.get('speed');
                
                this.logger.debug(`Video type detected: ${videoType}`);
                
                if (this.shouldSkipSpeedChange(videoType)) {
                    this.logger.log(`Skipping speed change for ${videoType} video`);
                    return;
                }

                // Small delay to ensure video is ready
                await new Promise(resolve => {
                    this.timer.setTimeout(resolve, 100);
                });

                const changed = await this.videoManager.setPlaybackSpeed(targetSpeed);
                
                if (changed) {
                    this.logger.log(`Playback speed set to ${targetSpeed}x (${videoType} video)`);
                }

            } catch (error) {
                this.logger.error(`Error in handleSpeedChange: ${error.message}`);
            } finally {
                this.isProcessing = false;
            }
        }

        shouldSkipSpeedChange(videoType) {
            const settings = this.settingsManager.settings;
            
            switch (videoType) {
                case 'live':
                    return !settings.enableLive;
                case 'shorts':
                    return !settings.enableShorts;
                case 'premiere':
                    return !settings.enablePremiere;
                case 'music':
                    return !settings.enableMusic;
                default:
                    return false;
            }
        }

        cleanup() {
            this.timer.clearAll();
            this.debouncer.clear();
            this.videoManager.cleanup();
            this.menuManager.cleanup();
            
            // Remove event listeners
            this.eventListeners.forEach(({ target, type, handler, capture }) => {
                target.removeEventListener(type, handler, capture);
            });
            
            this.logger.log('Cleanup completed');
        }

        // Public API for debugging
        getStatus() {
            return {
                settings: this.settingsManager.settings,
                currentUrl: this.currentUrl,
                videoType: this.videoDetector.getVideoType(),
                isProcessing: this.isProcessing,
                hasVideo: !!this.videoManager.currentVideo
            };
        }
    }

    // ===============================
    // INITIALIZATION
    // ===============================
    const app = new YouTubeSpeedController();
    
    // Start the application
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.initialize());
    } else {
        app.initialize();
    }

    // Expose for debugging
    if (typeof window !== 'undefined') {
        window.youtubeSpeedApp = app;
    }

})();
```

</details>

## 🔧 Usage

Once installed, the script works automatically:

1. **Automatic Speed**: Regular videos automatically play at your configured speed (default: 1.25x)
2. **Menu Access**: Access settings through Tampermonkey menu
3. **Speed Selection**: Choose from 8 different speeds (0.25x to 2x)
4. **Auto-Skip**: Automatically skips live streams, shorts, premieres, and music videos
5. **Persistent Settings**: All settings are automatically saved

### Quick Configuration

1. **Click Tampermonkey icon** in browser toolbar
2. **Select speed** from "Speed: X.Xx" options  
3. **Settings save immediately** and persist across sessions
4. **⚠️ Refresh the page** for new speed setting to take effect

### Important Limitations

- **Page Refresh Required**: After changing speed settings, you must refresh the YouTube page for the new speed to apply
- **No Mid-Video Changes**: Changing speed during video playback doesn't work - the script only sets speed when videos start loading
- **New Videos Only**: Speed changes only apply to videos loaded after the setting change

### Video Type Behavior

| Video Type | Behavior | Description |
|------------|----------|-------------|
| **Regular Videos** | ✅ Speed Applied | Standard YouTube videos get your selected speed |
| **Shorts** | ⚪ Skipped | YouTube Shorts play at normal speed |
| **Live Streams** | ⚪ Skipped | Live broadcasts play at normal speed |
| **Premieres** | ⚪ Skipped | Premiere videos play at normal speed |
| **Music Videos** | ⚪ Skipped | YouTube Music content plays at normal speed |

### Verification

To verify the script is working:

1. **Change speed setting** in Tampermonkey menu
2. **Refresh the YouTube page** (important!)
3. **Play a regular video** (not shorts, live streams, etc.)
4. **Check the speed indicator** in the video player controls
5. **Enable debug mode** to see detailed console logs
6. **Look for speed change messages** in the console (F12)

## 🖥️ Browser Compatibility

- **Chrome/Chromium** ✅ Full support with all features
- **Firefox** ✅ Full support with Tampermonkey/Greasemonkey  
- **Edge** ✅ Full support with Tampermonkey
- **Safari** ⚠️ Limited support (requires Tampermonkey)

### Userscript Manager Compatibility

| Manager | Support Level | Menu Support | Settings Storage |
|---------|---------------|--------------|------------------|
| **Tampermonkey** | ✅ Full | ✅ Yes | ✅ Yes |
| **Greasemonkey** | ✅ Good | ⚠️ Limited | ✅ Yes |
| **Violentmonkey** | ✅ Good | ✅ Yes | ✅ Yes |

## 📊 How It Works

### Smart Video Detection
- **Multiple Selectors**: Uses various CSS selectors to detect video types
- **Visibility Checks**: Ensures elements are actually visible, not just present
- **Caching System**: Caches detection results for 5 seconds to improve performance
- **URL Analysis**: Analyzes URL patterns for additional context
- **Auto-Skip Logic**: Automatically skips all non-regular videos

### Enhanced Video Management
- **Multiple Strategies**: Uses multiple methods to find video elements
- **Readiness Checking**: Waits for video to be ready before setting speed
- **State Management**: Tracks video element changes and player state
- **Error Recovery**: Graceful handling of missing or unavailable videos
- **Regular Videos Only**: Only applies speed changes to standard YouTube videos

### Performance Optimization
- **Debounced Events**: Prevents excessive function calls during rapid navigation
- **Smart Caching**: Reduces redundant DOM queries and calculations
- **Memory Management**: Proper cleanup of resources and event listeners
- **Efficient Timing**: Optimized delays for different scenarios

## 🐛 Troubleshooting

### Speed Not Changing
1. **Check video type**: Ensure the video type is enabled in settings
2. **Refresh the page**: Speed changes require a page refresh to take effect
3. **Wait for new videos**: Changes only apply to newly loaded videos, not current ones
4. **Enable debug mode**: Check console for detailed error messages
5. **Try different speeds**: Some videos may have speed limitations

### Speed Changes Don't Apply Immediately
1. **This is expected behavior**: The script only sets speed when videos start loading
2. **Refresh required**: After changing speed settings, refresh the YouTube page
3. **Navigate to new video**: Or navigate to a different video to see the new speed
4. **Mid-video changes not supported**: Cannot change speed during active playback

### Settings Not Saving
1. **Check userscript manager**: Ensure GM storage permissions are granted
2. **Browser storage**: Some browsers may block userscript storage
3. **Script conflicts**: Disable other YouTube-related scripts temporarily
4. **Menu access**: Try accessing settings through Tampermonkey menu

### Script Only Works on Some Videos
1. **Video type detection**: Script only works on regular videos by design
2. **Skipped content**: Live streams, shorts, premieres, and music are intentionally skipped
3. **Enable debug mode**: Check console to see what video type is detected
4. **Regular videos**: Ensure you're testing on standard YouTube videos

### Debug Information

Enable debug mode and check console for:
```javascript
// Status check - run in browser console
window.youtubeSpeedApp.getStatus();

// Example debug output:
// [YouTube Speed] 14:30:15 Speed changed: 1x → 1.25x
// [YouTube Speed] 14:30:15 Video type detected: regular
// [YouTube Speed] 14:30:15 Playback speed set to 1.25x (regular video)
```

## 🔧 Advanced Features

### Custom Speed Values
The script supports these precise speed values:
- **0.25x** - Quarter speed for detailed analysis
- **0.5x** - Half speed for learning
- **0.75x** - Slightly slower for comprehension
- **1x** - Normal speed
- **1.25x** - Default faster speed
- **1.5x** - Moderately fast
- **1.75x** - Fast pace
- **2x** - Maximum speed

### Debug Interface
When debug mode is enabled:
- **Detailed logging** of all operations
- **Video type detection** results
- **Speed change confirmations**
- **Error reporting** with context
- **Performance timing** information

### API for Advanced Users
```javascript
// Access the app instance
const app = window.youtubeSpeedApp;

// Get current status
console.log(app.getStatus());

// Force speed change
app.handleSpeedChange();

// Check video type
console.log(app.videoDetector.getVideoType());
```

## 📝 License

MIT License - feel free to modify and distribute.

## 🤝 Contributing

Found a bug or have an improvement? Feel free to:

- **Report Issues**: Submit detailed bug reports with console logs
- **Feature Requests**: Suggest new speed management features
- **Testing**: Test on different browsers and YouTube content types
- **Video Type Detection**: Help improve detection for new YouTube features

### Known Limitations

- **Page Refresh Required**: Speed setting changes require refreshing the YouTube page to take effect
- **No Mid-Video Speed Changes**: Cannot change speed during active video playback
- **New Videos Only**: Speed changes only apply when videos first start loading
- **YouTube API Changes**: Relies on YouTube's video element structure which may change
- **Live Content**: Limited functionality on live streams by design (intentionally skipped)
- **Menu Refresh**: Menu changes require script restart to show updated checkmarks

---

**Note**: This script enhances your YouTube viewing experience by automatically managing playback speed while respecting different video types and user preferences.