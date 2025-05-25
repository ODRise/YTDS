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

1.  **Install a userscript manager** (if you don't have one already):
    * **Chrome/Edge**: [Tampermonkey](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
    * **Firefox**: [Tampermonkey](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/) or [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
    * **Safari**: [Tampermonkey](https://apps.apple.com/us/app/tampermonkey/id1482490089)

2.  **Click the link below to install the script**:
    * [**Install YouTube Default Playback Speed (Improved)**](https://raw.githubusercontent.com/ODRise/YTDS/main/yt-playback-speed.user.js)

3.  Your userscript manager should prompt you to confirm the installation.
4.  Once installed, the script should be automatically enabled.
5.  Reload any open YouTube pages and check the Tampermonkey (or your chosen manager's) menu for options.

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
