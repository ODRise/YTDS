// ==UserScript==
// @name         YouTube Default Playback Speed (Improved)
// @version      3.1.1
// @description  Automatically sets YouTube playback speed with configurable settings, smart detection, and better reliability. Includes update checker.
// @author       RM
// @match        *://*.youtube.com/*
// @exclude      *://music.youtube.com/*
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.registerMenuCommand
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_registerMenuCommand
// @grant        GM_xmlhttpRequest
// @grant        GM_notification
// @grant        GM_info
// @downloadURL  https://raw.githubusercontent.com/ODRise/YTDS/main/yt-playback-speed.user.js
// @updateURL    https://raw.githubusercontent.com/ODRise/YTDS/main/yt-playback-speed.user.js
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
            enableMusic: false, // Default to false: Skip music videos on www.youtube.com by default
            debug: false
        },
        TIMERS: {
            RETRY_DELAY: 300,
            INITIALIZATION_DELAY: 800,
            SETTINGS_MENU_DELAY: 150, // Used by original menu, less relevant now
            DEBOUNCE_DELAY: 250
        },
        MAX_RETRIES: 12,
        SCRIPT_NAME: 'YouTube Speed', // GM_info.script.name will be preferred for notifications
        AVAILABLE_SPEEDS: [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2]
    };

    // ===============================
    // UTILITY FUNCTIONS
    // ===============================
    /**
     * Compares two semantic version strings.
     * @param {string} v1 First version string (e.g., "1.2.3")
     * @param {string} v2 Second version string
     * @returns {number} 1 if v1 > v2, -1 if v1 < v2, 0 if v1 === v2
     */
    function compareVersions(v1, v2) {
        const parts1 = String(v1).split('.').map(Number);
        const parts2 = String(v2).split('.').map(Number);
        const len = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < len; i++) {
            const p1 = parts1[i] || 0;
            const p2 = parts2[i] || 0;
            if (p1 > p2) return 1;
            if (p1 < p2) return -1;
        }
        return 0;
    }

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

        _formatMessage(message) {
             const scriptName = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script.name : this.name;
            const timestamp = new Date().toTimeString().split(' ')[0];
            return `[${scriptName}] ${timestamp} ${message}`;
        }

        log(message) { // General purpose log
            if (!this.enabled && !CONFIG.DEFAULT_SETTINGS.debug) return;
            console.log(this._formatMessage(message));
        }

        error(message) { // Errors should always be logged
            console.error(this._formatMessage(`ERROR: ${message}`));
        }

        warn(message) {
            if (!this.enabled && !CONFIG.DEFAULT_SETTINGS.debug) return;
            console.warn(this._formatMessage(`WARN: ${message}`));
        }

        debug(message) { // Specific debug messages
            if (!this.enabled) return;
            console.debug(this._formatMessage(`DEBUG: ${message}`));
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
        clearInterval(id) { // Though not used, good to have
            clearInterval(id);
            this.timers.delete(id);
        }
        clearAll() {
            this.timers.forEach(id => {
                clearTimeout(id); // clearTimeout works for setInterval IDs too
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
            this.useCompatibilityMode = typeof GM === 'undefined' || typeof GM.getValue === 'undefined';
        }

        async loadSettings() {
            try {
                const getValue = this.useCompatibilityMode ? GM_getValue : GM.getValue;
                const storedSettings = await getValue('speedSettings', JSON.stringify(CONFIG.DEFAULT_SETTINGS));
                const parsed = JSON.parse(storedSettings);

                this.settings = { ...CONFIG.DEFAULT_SETTINGS, ...parsed };

                if (!CONFIG.AVAILABLE_SPEEDS.includes(this.settings.speed)) {
                    this.logger.warn(`Invalid speed ${this.settings.speed} in settings, reverting to default ${CONFIG.DEFAULT_SETTINGS.speed}.`);
                    this.settings.speed = CONFIG.DEFAULT_SETTINGS.speed;
                }
                // Ensure boolean values for toggles
                ['enableShorts', 'enableLive', 'enablePremiere', 'enableMusic', 'debug'].forEach(key => {
                    if (typeof this.settings[key] !== 'boolean') {
                        this.logger.warn(`Invalid type for setting ${key}, reverting to default.`);
                        this.settings[key] = CONFIG.DEFAULT_SETTINGS[key];
                    }
                });

                this.logger.debug(`Settings loaded: ${JSON.stringify(this.settings)}`);
                // It's good practice to save after load if validation/migration might change settings
                await this.saveSettings();
                return this.settings;
            } catch (error) {
                this.logger.error(`Failed to load settings: ${error.message}. Using default settings.`);
                this.settings = { ...CONFIG.DEFAULT_SETTINGS };
                return this.settings;
            }
        }

        async saveSettings() {
            try {
                const setValue = this.useCompatibilityMode ? GM_setValue : GM.setValue;
                await setValue('speedSettings', JSON.stringify(this.settings));
                this.logger.debug('Settings saved successfully.');
            } catch (error) {
                this.logger.error(`Failed to save settings: ${error.message}`);
            }
        }

        async updateSetting(key, value) {
            if (this.settings.hasOwnProperty(key)) {
                this.settings[key] = value;
                await this.saveSettings();
                this.logger.log(`Setting updated: ${key} = ${value}`);
            } else {
                this.logger.warn(`Attempted to update non-existent setting: ${key}`);
            }
        }

        get(key) {
            return this.settings.hasOwnProperty(key) ? this.settings[key] : undefined;
        }
    }

    // ===============================
    // VIDEO DETECTION SYSTEM
    // ===============================
    class VideoDetector {
        constructor(logger) {
            this.logger = logger;
            this.cache = new Map();
            this.cacheTimeout = 3000; // Cache for 3 seconds
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
            this.logger.debug("VideoDetector cache cleared.");
        }

        isLiveStream() {
            return this._checkWithCache('live', () => {
                const selectors = [
                    '.ytp-live-badge[aria-hidden="false"]', // Visible live badge
                    'ytd-badge-supported-renderer.ytd-video-primary-info-renderer[is-live]', // Another live indicator
                    '.ytp-time-display.ytp-live-status-indicator', // Live status in time display
                    'span.ytp-live-label' // "LIVE" label text
                ];
                return selectors.some(s => {
                    const el = document.querySelector(s);
                    return el && el.offsetParent !== null;
                });
            });
        }

        isShorts() {
            return this._checkWithCache('shorts', () => window.location.pathname.includes('/shorts/'));
        }

        isPremiere() {
            // Premieres might show as "live" shortly before or during.
            return this._checkWithCache('premiere', () => {
                const selectors = [
                    '.ytp-premiere-badge', // "PREMIERE" badge
                    'ytd-badge-supported-renderer[aria-label*="Premiere"]',
                    '.ytp-time-display.ytp-is-premiere' // Premiere timer
                ];
                if (selectors.some(s => {
                    const el = document.querySelector(s);
                    return el && el.offsetParent !== null;
                })) return true;

                // Check for "Waiting for..." or "Premieres in..." text if it's an upcoming premiere
                const premiereTextElement = document.querySelector('#info-strings > yt-formatted-string');
                if (premiereTextElement) {
                    const premiereText = premiereTextElement.textContent.toLowerCase();
                    if (premiereText.includes('premiere') || premiereText.includes('waiting for')) {
                        this.logger.debug("Premiere detected by info text.");
                        return true;
                    }
                }
                return false;
            });
        }

        isMusicVideo() {
            // This check is for www.youtube.com, as music.youtube.com is excluded by @exclude.
            // It's heuristic and may not be perfect.
            return this._checkWithCache('music', () => {
                // Check for "Topic" channels which are often auto-generated music channels
                const channelNameElement = document.querySelector('ytd-video-owner-renderer #channel-name .ytd-channel-name');
                if (channelNameElement && channelNameElement.textContent.trim().endsWith(" - Topic")) {
                    this.logger.debug("Music video detected: 'Topic' channel.");
                    return true;
                }
                // Check for "Provided to YouTube by" in description (common for auto-uploads by distributors)
                const descriptionElement = document.querySelector('#description-inline-expander .content.ytd-video-secondary-info-renderer, #description .content, #description-text');
                if (descriptionElement && descriptionElement.textContent.includes("Provided to YouTube by")) {
                    this.logger.debug("Music video detected: 'Provided to YouTube by' in description.");
                    return true;
                }
                // Check if "Music" category is prominent
                const categoryLink = document.querySelector('#info #text-container yt-formatted-string a[href*="/channel/UC-9-kyTW8ZkZNDHQJ6b7Mrg"]'); // Official "Music" category link
                if (categoryLink) {
                     this.logger.debug("Music video detected: Official 'Music' category link found.");
                    return true;
                }
                // Check for music-related keywords in video title if other indicators fail
                const videoTitleElement = document.querySelector('h1.ytd-video-primary-info-renderer yt-formatted-string.ytd-video-primary-info-renderer, #title h1 yt-formatted-string');
                if(videoTitleElement) {
                    const titleText = videoTitleElement.textContent.toLowerCase();
                    const musicKeywords = ['official video', 'music video', 'lyric video', '(audio)', '(lyrics)', 'song', 'album', 'ft.', 'feat.'];
                    if (musicKeywords.some(keyword => titleText.includes(keyword))) {
                        this.logger.debug(`Music video detected: keyword '${musicKeywords.find(k => titleText.includes(k))}' in title.`);
                        return true;
                    }
                }
                return false;
            });
        }

        getVideoType() {
            if (this.isLiveStream()) return 'live';
            if (this.isPremiere()) return 'premiere'; // Check before shorts as UI might overlap
            if (this.isShorts()) return 'shorts';
            if (this.isMusicVideo()) return 'music';
            return 'regular';
        }
    }

    // ===============================
    // VIDEO ELEMENT MANAGER
    // ===============================
    class VideoManager {
        constructor(logger, timer, debouncer) { // Added debouncer
            this.logger = logger;
            this.timer = timer;
            this.debouncer = debouncer; // Store debouncer
            this.currentVideo = null;
            this.mutationObs = null;
            this.lastVideoSrc = null;
        }

        async findVideoElement(maxRetries = CONFIG.MAX_RETRIES) {
            return new Promise((resolve, reject) => {
                let attempts = 0;
                const tryFind = () => {
                    const video = document.querySelector('video.html5-main-video');
                    if (video && video.src && video.readyState >= 1 && video.duration > 0 && video.offsetParent !== null) { // Check for src, readyState, duration and visibility
                        if (this.currentVideo !== video || (video.src && this.lastVideoSrc !== video.src)) {
                            this.logger.debug(`Found active video element (src: ${video.src.substring(0,50)}...).`);
                            this.currentVideo = video;
                            this.lastVideoSrc = video.src;
                        }
                        resolve(video);
                        return;
                    }
                    attempts++;
                    if (attempts < maxRetries) {
                        this.timer.setTimeout(tryFind, CONFIG.TIMERS.RETRY_DELAY + (attempts * 100)); // slight backoff
                    } else {
                        this.logger.warn('Video element not found or not ready after multiple retries.');
                        this.currentVideo = null; // Ensure it's null if not found
                        this.lastVideoSrc = null;
                        reject(new Error('Video element not found.'));
                    }
                };
                tryFind();
            });
        }

        async setPlaybackSpeed(targetSpeed) {
            try {
                const video = await this.findVideoElement();
                if (!video) {
                    this.logger.warn('No video element available to set speed.');
                    return false;
                }

                if (Math.abs(video.playbackRate - targetSpeed) > 0.01) {
                    const oldSpeed = video.playbackRate;
                    video.playbackRate = targetSpeed;
                    // Verify change due to potential YouTube overrides
                    this.timer.setTimeout(() => {
                        if (video && Math.abs(video.playbackRate - targetSpeed) > 0.01) {
                            this.logger.warn(`Speed reverted or failed to set. Current: ${video.playbackRate}, Target: ${targetSpeed}. Retrying once.`);
                            video.playbackRate = targetSpeed; // Retry
                        }
                    }, 100);
                    this.logger.log(`Playback speed changed from ${oldSpeed.toFixed(2)}x to ${targetSpeed.toFixed(2)}x.`);
                    return true;
                } else {
                    this.logger.debug(`Playback speed already at target ${targetSpeed.toFixed(2)}x.`);
                    return false;
                }
            } catch (error) {
                this.logger.error(`Failed to set playback speed: ${error.message}`);
                return false;
            }
        }

        setupVideoObserver(onVideoChangeCallback) {
            this.cleanupObserver();

            const debouncedCallback = this.debouncer.debounce('videoObserverChange', onVideoChangeCallback, CONFIG.TIMERS.DEBOUNCE_DELAY + 100);

            this.mutationObs = new MutationObserver((mutations) => {
                let videoChanged = false;
                for (const mutation of mutations) {
                    if (mutation.type === 'attributes' && mutation.attributeName === 'src' && mutation.target.tagName === 'VIDEO') {
                        const videoElement = mutation.target;
                        if (videoElement.src && this.lastVideoSrc !== videoElement.src) {
                            this.logger.debug(`Video 'src' attribute changed. Old: ${this.lastVideoSrc ? this.lastVideoSrc.substring(0,50) : 'null'}, New: ${videoElement.src.substring(0,50)}`);
                            this.currentVideo = videoElement;
                            this.lastVideoSrc = videoElement.src;
                            videoChanged = true;
                            break;
                        }
                    }
                    if (mutation.type === 'childList') {
                        for (const node of mutation.addedNodes) {
                            if (node.tagName === 'VIDEO' && node.classList.contains('html5-main-video')) {
                                this.logger.debug('New main video element added to DOM.');
                                this.currentVideo = node;
                                this.lastVideoSrc = node.src;
                                videoChanged = true;
                                break;
                            }
                        }
                        if (videoChanged) break;
                    }
                }
                if (videoChanged) {
                    debouncedCallback();
                }
            });

            const videoContainer = document.getElementById('movie_player') || document.body; // Fallback to body
            this.mutationObs.observe(videoContainer, {
                childList: true,
                subtree: true,
                attributes: true,
                attributeFilter: ['src'], // Primarily watch 'src' on VIDEO tags
                attributeOldValue: true // Useful for debugging src changes
            });
            this.logger.debug('Video observer attached.');
        }


        cleanupObserver() {
            if (this.mutationObs) {
                this.mutationObs.disconnect();
                this.mutationObs = null;
                this.logger.debug('Video observer disconnected.');
            }
        }

        cleanup() {
            this.cleanupObserver();
            this.currentVideo = null;
            this.lastVideoSrc = null;
        }
    }
    // ===============================
    // MENU SYSTEM
    // ===============================
    class MenuManager {
        constructor(settingsManager, logger, mainApp) {
            this.settingsManager = settingsManager;
            this.logger = logger;
            this.mainApp = mainApp;
            this.menuIds = [];
            this.registerMenuCommand = (typeof GM !== 'undefined' && GM.registerMenuCommand) ?
                                     GM.registerMenuCommand : (typeof GM_registerMenuCommand !== 'undefined' ? GM_registerMenuCommand : null);
        }

        createMenus() {
            if (!this.registerMenuCommand) {
                this.logger.warn("GM_registerMenuCommand or GM.registerMenuCommand not available. Menus not created.");
                return;
            }

            // Clear old menu items if possible (difficult with GM_registerMenuCommand)
            // This simple implementation will add new items on each script run if not reloaded.
            // For true refresh, script managers usually handle this on script update/reinstall.

            CONFIG.AVAILABLE_SPEEDS.forEach(speed => {
                const menuId = this.registerMenuCommand(
                    `${this.settingsManager.get('speed') === speed ? '✅' : '⚪'} Speed: ${speed}x`,
                    async () => {
                        await this.settingsManager.updateSetting('speed', speed);
                        this.logger.log(`Speed set to ${speed}x via menu.`);
                        this.mainApp.triggerSpeedApplication();
                        this.refreshMenuLabels();
                    }
                );
                this.menuIds.push(menuId);
            });

            this.menuIds.push(this.registerMenuCommand('─ Behavior Toggles ─', () => {}));

            const toggles = [
                { key: 'enableShorts', label: 'Apply to Shorts' },
                { key: 'enableLive', label: 'Apply to Live Streams' },
                { key: 'enablePremiere', label: 'Apply to Premieres' },
                { key: 'enableMusic', label: 'Apply to Music (on www.youtube.com)' },
                { key: 'debug', label: 'Debug Mode' }
            ];

            toggles.forEach(({ key, label }) => {
                const menuId = this.registerMenuCommand(
                    `${this.settingsManager.get(key) ? '✅' : '⚪'} ${label}`,
                    async () => {
                        const newValue = !this.settingsManager.get(key);
                        await this.settingsManager.updateSetting(key, newValue);
                        if (key === 'debug') {
                            this.mainApp.logger.setEnabled(newValue);
                        }
                        this.logger.log(`${label} ${newValue ? 'enabled' : 'disabled'}.`);
                        this.mainApp.triggerSpeedApplication();
                        this.refreshMenuLabels();
                    }
                );
                this.menuIds.push(menuId);
            });

            this.menuIds.push(this.registerMenuCommand('─ Script Updates ─', () => {}));
            this.menuIds.push(this.registerMenuCommand('Check for Updates', () => this.mainApp.checkForUpdates()));

            this.logger.debug("Menus created/updated.");
        }

        refreshMenuLabels() {
            // Standard GM_registerMenuCommand doesn't allow dynamic updating of labels.
            // For a visual update of checkmarks, the script usually needs to be reloaded (e.g., page refresh).
            this.logger.debug("Menu label refresh requested. Actual update of checkmarks requires script/page reload.");
            // Consider a small notification to the user if this is confusing.
            // alert("Menu settings changed. Checkmarks will update after a page refresh or script reload.");
        }

        cleanup() {
            // GM_unregisterMenuCommand is not standard. Menus persist until script is disabled/updated.
            this.menuIds = []; // Clear internal tracking
        }
    }

    // ===============================
    // MAIN APPLICATION CLASS
    // ===============================
    class YouTubeSpeedController {
        constructor() {
            this.logger = new Logger(CONFIG.SCRIPT_NAME, CONFIG.DEFAULT_SETTINGS.debug);
            this.timer = new Timer();
            this.debouncer = new Debouncer();
            this.settingsManager = new SettingsManager(this.logger);
            this.videoDetector = new VideoDetector(this.logger);
            this.videoManager = new VideoManager(this.logger, this.timer, this.debouncer); // Pass debouncer
            this.menuManager = new MenuManager(this.settingsManager, this.logger, this);

            this.currentUrl = window.location.href;
            this.isProcessingSpeedChange = false;
            this.eventListeners = [];
        }

        async initialize() {
            try {
                await this.settingsManager.loadSettings();
                this.logger.setEnabled(this.settingsManager.get('debug'));
                this.menuManager.createMenus(); // Create menus after settings are loaded
                this.setupEventListeners();

                this.logger.log(`Initialized. Preferred speed: ${this.settingsManager.get('speed')}x. URL: ${this.currentUrl.substring(0,100)}`);
                this.debouncer.debounce('initialSpeedApply', () => this.triggerSpeedApplication(), CONFIG.TIMERS.INITIALIZATION_DELAY);

                // Expose for debugging
                if (typeof window.youtubeSpeedApp === 'object' && window.youtubeSpeedApp.controller) {
                    // Already initialized by another instance (e.g. script manager bug)
                    this.logger.warn("Another instance of youtubeSpeedApp.controller detected. This might cause issues.");
                } else {
                     window.youtubeSpeedApp = { // Keep this structure for existing README examples
                        controller: this,
                        getStatus: () => this.getStatus(),
                        checkForUpdates: () => this.checkForUpdates(),
                        toggleDebug: async () => {
                            const newDebugState = !this.settingsManager.get('debug');
                            await this.settingsManager.updateSetting('debug', newDebugState);
                            this.logger.setEnabled(newDebugState);
                            this.logger.log(`Debug mode toggled to ${newDebugState} via console.`);
                            this.menuManager.refreshMenuLabels();
                        }
                    };
                }

            } catch (error) {
                this.logger.error(`Initialization error: ${error.message}`);
            }
        }

        setupEventListeners() {
            const ytNavigateEvents = ['yt-navigate-start', 'yt-navigate-finish', 'yt-page-data-updated', 'spfdone', 'yt-player-updated'];
            ytNavigateEvents.forEach(eventName => {
                const handler = (e) => {
                    this.logger.debug(`Event: ${eventName} detected. New URL: ${window.location.href.substring(0,100)}`);
                    this.handleUrlChange(window.location.href);
                };
                document.addEventListener(eventName, handler);
                this.eventListeners.push({target: document, type: eventName, handler});
            });

            // Fallback for URL changes if YT events are missed
            let lastHref = window.location.href;
            const titleElement = document.querySelector('head > title');
            if (titleElement) {
                const urlObserver = new MutationObserver(() => {
                    if (window.location.href !== lastHref) {
                        lastHref = window.location.href;
                        this.logger.debug(`URL changed (MutationObserver on title/URL): ${lastHref.substring(0,100)}`);
                        this.handleUrlChange(lastHref);
                    }
                });
                urlObserver.observe(titleElement, { childList: true, characterData: true, subtree: true }); // Observe title for SPA nav
                this.eventListeners.push({observer: urlObserver}); // Store observer for cleanup
            }


            this.videoManager.setupVideoObserver(() => {
                this.logger.debug('Video observer callback triggered (video src or element change).');
                this.triggerSpeedApplication();
            });

            window.addEventListener('beforeunload', () => this.cleanup());
        }

        handleUrlChange(newUrl) {
            // Check if it's a significant change or just a hash change on the same video page
            const oldBaseUrl = this.currentUrl.split('#')[0].split('?')[0];
            const newBaseUrl = newUrl.split('#')[0].split('?')[0];
            const oldVideoId = new URLSearchParams(this.currentUrl.split('?')[1]).get('v');
            const newVideoId = new URLSearchParams(newUrl.split('?')[1]).get('v');

            if (newBaseUrl === oldBaseUrl && newVideoId === oldVideoId && this.videoManager.currentVideo) {
                 this.logger.debug("URL changed but seems to be on the same video page, not forcing full re-evaluation unless video element changes.");
                 // Still, a slight re-check might be good if fragments change player state.
                 this.debouncer.debounce('minorUrlChangeSpeedApply', () => this.triggerSpeedApplication(), CONFIG.TIMERS.RETRY_DELAY / 2);
                return;
            }

            this.logger.log(`URL or video context changed. New URL: ${newUrl.substring(0,100)}`);
            this.currentUrl = newUrl;
            this.isProcessingSpeedChange = false;
            this.videoDetector.clearCache();
            // VideoManager's currentVideo will be re-evaluated by findVideoElement

            this.debouncer.debounce('majorUrlChangeSpeedApply', () => {
                this.triggerSpeedApplication();
            }, CONFIG.TIMERS.RETRY_DELAY);
        }

        async triggerSpeedApplication() {
            if (this.isProcessingSpeedChange) {
                this.logger.debug("Speed application already processing, request ignored.");
                return;
            }
            this.isProcessingSpeedChange = true;
            this.logger.debug("Triggering speed application...");

            try {
                const videoType = this.videoDetector.getVideoType();
                this.logger.debug(`Detected video type: '${videoType}'.`);

                const settings = this.settingsManager.settings;
                let shouldApply = false;

                switch (videoType) {
                    case 'regular': shouldApply = true; break;
                    case 'shorts': shouldApply = settings.enableShorts; break;
                    case 'live': shouldApply = settings.enableLive; break;
                    case 'premiere': shouldApply = settings.enablePremiere; break;
                    case 'music': shouldApply = settings.enableMusic; break;
                    default: this.logger.warn(`Unknown video type: ${videoType}`);
                }

                if (shouldApply) {
                    this.logger.log(`Applying speed for '${videoType}' video (target: ${settings.speed}x).`);
                    await this.videoManager.setPlaybackSpeed(settings.speed);
                } else {
                    this.logger.log(`Skipping speed change for '${videoType}' video as per settings.`);
                    // Consider if we should revert to 1x if speed was previously changed by this script
                    // For now, just skip applying the new speed.
                }
            } catch (error) {
                this.logger.error(`Error in triggerSpeedApplication: ${error.message}`);
            } finally {
                this.isProcessingSpeedChange = false;
            }
        }

        cleanup() {
            this.timer.clearAll();
            this.debouncer.clear();
            this.videoManager.cleanup();
            this.menuManager.cleanup();

            this.eventListeners.forEach(listener => {
                if (listener.observer) {
                    listener.observer.disconnect();
                } else if (listener.target && listener.type && listener.handler) {
                    listener.target.removeEventListener(listener.type, listener.handler, listener.capture);
                }
            });
            this.eventListeners = [];
            this.logger.log('YouTubeSpeedController cleanup performed.');
        }

        async checkForUpdates() {
            this.logger.log('Checking for script updates...');
            const scriptInfo = (typeof GM_info !== 'undefined' && GM_info.script) ? GM_info.script : null;

            if (!scriptInfo) {
                this.logger.error('GM_info is not available. Cannot check for updates.');
                if (typeof GM_notification === 'function') {
                    GM_notification({ text: 'GM_info not available. Update check failed.', title: 'Script Update Error', timeout: 5000 });
                } else {
                    alert('GM_info not available. Update check failed.');
                }
                return;
            }

            const currentVersion = scriptInfo.version;
            const updateURL = scriptInfo.updateURL || (scriptInfo.meta && scriptInfo.meta.match(/@updateURL\s+(.*)/i)?.[1]?.trim());
            const downloadURL = scriptInfo.downloadURL || (scriptInfo.meta && scriptInfo.meta.match(/@downloadURL\s+(.*)/i)?.[1]?.trim());
            const scriptName = scriptInfo.name || CONFIG.SCRIPT_NAME;

            if (!updateURL) {
                const msg = 'Update URL is missing in script metadata. Cannot check for updates.';
                this.logger.warn(msg);
                if (typeof GM_notification === 'function') {
                    GM_notification({ text: msg, title: `${scriptName} - Update Error`, timeout: 7000 });
                } else {
                    alert(msg);
                }
                return;
            }
            this.logger.debug(`Update URL: ${updateURL}`);

            GM_xmlhttpRequest({
                method: 'GET',
                url: updateURL,
                headers: { 'Cache-Control': 'no-cache' },
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        const responseText = response.responseText;
                        const remoteVersionMatch = responseText.match(/@version\s+([\d\w\.-]+)/);

                        if (remoteVersionMatch && remoteVersionMatch[1]) {
                            const remoteVersion = remoteVersionMatch[1];
                            this.logger.log(`Current version: ${currentVersion}, Remote version from ${updateURL}: ${remoteVersion}`);

                            if (compareVersions(remoteVersion, currentVersion) > 0) {
                                this.logger.log(`New version available: ${remoteVersion}`);
                                const updateMessage = `A new version (${remoteVersion}) of ${scriptName} is available.`;
                                if (typeof GM_notification === 'function') {
                                    GM_notification({
                                        text: `${updateMessage} Click to install.`,
                                        title: `${scriptName} - Update Available`,
                                        onclick: () => {
                                            if (downloadURL) {
                                                window.open(downloadURL, '_blank');
                                            } else {
                                                this.logger.warn('Download URL not found. Cannot open update page.');
                                                alert('Update available, but no download URL configured.');
                                            }
                                        },
                                        timeout: 0
                                    });
                                } else if (confirm(`${updateMessage}\n\nGo to download page?`)) {
                                    if (downloadURL) {
                                        window.open(downloadURL, '_blank');
                                    } else {
                                        this.logger.warn('Download URL not found.');
                                        alert('Update available, but no download URL configured.');
                                    }
                                }
                            } else {
                                const uptodateMsg = `Your version of ${scriptName} (${currentVersion}) is up to date.`;
                                this.logger.log(uptodateMsg);
                                if (typeof GM_notification === 'function') {
                                    GM_notification({ text: uptodateMsg, title: `${scriptName} - Up to Date`, timeout: 5000 });
                                } else {
                                    alert(uptodateMsg);
                                }
                            }
                        } else {
                            this.logger.warn(`Could not parse @version from remote script at ${updateURL}`);
                            if (typeof GM_notification === 'function') {
                                GM_notification({ text: 'Could not determine remote version.', title: `${scriptName} - Update Check Failed`, timeout: 7000 });
                            }
                        }
                    } else {
                        this.logger.error(`Error fetching update from ${updateURL}: ${response.status} ${response.statusText}`);
                        if (typeof GM_notification === 'function') {
                            GM_notification({ text: `Error fetching update: ${response.statusText}`, title: `${scriptName} - Update Check Failed`, timeout: 7000 });
                        }
                    }
                },
                onerror: (error) => {
                    this.logger.error(`Network error while checking for updates from ${updateURL}:`, error);
                    if (typeof GM_notification === 'function') {
                        GM_notification({ text: 'Network error during update check. See console.', title: `${scriptName} - Update Check Failed`, timeout: 7000 });
                    }
                }
            });
        }

        getStatus() {
            return {
                settings: this.settingsManager.settings,
                currentUrl: this.currentUrl,
                videoType: this.videoManager.currentVideo ? this.videoDetector.getVideoType() : 'N/A (no video)',
                isProcessingSpeedChange: this.isProcessingSpeedChange,
                videoState: {
                    element: this.videoManager.currentVideo ? 'Found' : 'Not Found',
                    src: this.videoManager.lastVideoSrc ? this.videoManager.lastVideoSrc.substring(0, 70) + '...' : 'N/A',
                    playbackRate: this.videoManager.currentVideo ? this.videoManager.currentVideo.playbackRate : 'N/A',
                    readyState: this.videoManager.currentVideo ? this.videoManager.currentVideo.readyState : 'N/A',
                },
                loggerEnabled: this.logger.enabled,
            };
        }
    }

    // ===============================
    // INITIALIZATION
    // ===============================
    if (window.youtubeSpeedAppInstanceMarker) { // Use a more unique marker
        console.log('[YouTube Speed] Instance marker found. Skipping initialization to prevent duplicates.');
        return;
    }
    window.youtubeSpeedAppInstanceMarker = true;

    const app = new YouTubeSpeedController();

    // Expose a minimal debug interface on window.youtubeSpeedApp
     window.youtubeSpeedApp = { // Keep this structure for existing README examples
        controller: app, // For direct access if needed
        getStatus: () => app.getStatus(),
        checkForUpdates: () => app.checkForUpdates(),
        toggleDebug: async () => {
            if (app && app.settingsManager && app.logger && app.menuManager) {
                const newDebugState = !app.settingsManager.get('debug');
                await app.settingsManager.updateSetting('debug', newDebugState);
                app.logger.setEnabled(newDebugState);
                app.logger.log(`Debug mode toggled to ${newDebugState} via console.`);
                app.menuManager.refreshMenuLabels();
            } else {
                console.error("App not fully initialized for debug toggle.");
            }
        }
    };


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => app.initialize(), { once: true });
    } else {
        app.initialize();
    }

})();
