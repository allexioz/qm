# Badminton Queue Manager

A Progressive Web App (PWA) for efficiently managing badminton courts, players, and queues. Designed for badminton club managers and tournament organizers to ensure fair court time distribution and transparent queue management.

![Badminton Queue Manager App](https://example.com/app-screenshot.png)

## 📋 Overview

The Badminton Queue Manager solves the common problem of court time allocation in busy badminton clubs. It provides a systematic approach to tracking players, managing courts, and ensuring equitable play time through intelligent queue management.

## 🎯 Features

### Court Management
- Track and manage up to 5 badminton courts simultaneously
- Visual court status indicators (empty, ready, in progress)
- Real-time game duration tracking with automatic timers
- Court-specific queues for upcoming games
- One-click game completion with automatic player rotation

### Player Management
- Import players in bulk via text input
- Track comprehensive player statistics:
  - Total games played
  - Last game time with dynamic "time ago" display
  - Current status (playing, queued, resting, available)
  - Court assignment
- Visual status indicators with color coding and icons
- Automatic status transitions based on game events

### Queue System
- Add players to court-specific queues
- Automatic queue advancement when games complete
- Manual queue management for overrides
- Visual queue position indicators
- Estimated wait time calculations
- One-click queue removal

### Magic Queue™ Algorithm
- Intelligent player selection based on multiple factors:
  - Wait time since last game (higher priority for longer waits)
  - Total games played (higher priority for fewer games)
  - Current player status (prioritizes players who haven't played)
  - Team balance and rotation
- Weighted randomness to ensure fairness while maintaining priority
- Team formation logic to avoid repetitive pairings

### Offline Support
- Full functionality without internet connection
- Service worker for asset caching
- LocalStorage for data persistence
- Automatic data synchronization when connection is restored
- Offline status indicators and notifications

### Mobile Optimization
- Responsive design works on all devices
- Touch-optimized interface with appropriate target sizes
- Tab-based navigation on smaller screens
- Installable as home screen app on iOS and Android
- Custom splash screens and icons

## 🏗️ Technical Architecture

### Core Models
- **Player**: Encapsulates player data, status tracking, and game history
- **Court**: Manages court state, active games, queues, and timers

### Infrastructure Components
- **EventBus**: Implements a publish-subscribe pattern for decoupled communication
- **LocalStorage**: Handles data serialization, persistence, and validation
- **Toast**: Provides user feedback through non-intrusive notifications

### Controllers
- **GameManager**: Central orchestrator for game logic, player assignment, and state management
- **PlayerTimerManager**: Handles time-based calculations, status updates, and UI refreshes

### View Components
- **CourtView**: Renders court UI, handles court-specific interactions
- **PlayerListView**: Manages player listings, filtering, and status display
- **QueueModal**: Facilitates queue management and player selection
- **QuickAddModal**: Enables direct player assignment to courts

## 🔄 Data Flow Architecture

1. **User Interaction Layer**:
   - Direct DOM event listeners on UI elements
   - Modal interfaces for complex interactions

2. **Controller Layer**:
   - Processes user inputs
   - Applies business logic
   - Updates model state

3. **Model Layer**:
   - Maintains application state
   - Enforces data integrity
   - Provides serialization for persistence

4. **Event Communication Layer**:
   - Broadcasts state changes via EventBus
   - Decouples components for maintainability

5. **View Update Layer**:
   - Listens for relevant events
   - Re-renders affected UI components
   - Updates dynamic elements (timers, status indicators)

6. **Persistence Layer**:
   - Automatically saves state changes
   - Handles data recovery on page load
   - Manages offline synchronization

## 💾 Data Persistence Strategy

- **LocalStorage**: Primary persistence mechanism
- **State Serialization**: JSON-based with custom serialization for complex objects
- **Data Validation**: Schema validation on load to prevent corruption
- **Automatic Saving**: State saved after every significant change
- **Version Management**: State versioning for backward compatibility

## 🚀 Progressive Web App Implementation

### Service Worker Capabilities
- Static asset caching for offline access
- Cache-first strategy for performance
- Background sync for offline changes
- Update notification system

### Installation Experience
- Web App Manifest for native-like installation
- Custom icons for various platforms and sizes
- Splash screens for iOS devices
- Full-screen mode without browser chrome

### Performance Optimizations
- Minimal external dependencies
- Efficient DOM manipulation
- Throttled event handlers
- Optimized rendering cycles

## 🔒 Security Considerations

- All data stored locally on device
- No external API dependencies
- No sensitive data collection
- Content Security Policy implementation

## 🧪 Testing Approach

- Manual testing across devices and browsers
- Edge case validation for queue management
- Offline functionality verification
- Performance testing on low-end devices

## 🚦 Getting Started

### For Users
1. Open the application in a modern browser
2. Import players using the text area (one name per line)
3. Use "Magic Queue" for automatic game creation
4. Manually add players to courts or queues as needed
5. Track game progress and complete games when finished

### For Developers
1. Clone the repository
2. Open `index.html` in a browser (no build step required)
3. Inspect code organization in app.js
4. Review CSS architecture in styles.css

## 🌐 Browser Compatibility

- Chrome (desktop and mobile)
- Safari (iOS and macOS)
- Firefox (desktop and mobile)
- Edge (Chromium-based)

## 🔄 Version History

- **1.0.1** - Current version
  - Added Magic Queue algorithm
  - Improved offline support
  - Enhanced mobile experience
  - Fixed timer synchronization issues

- **1.0.0** - Initial release
  - Basic court and player management
  - Simple queue functionality
  - Core PWA features

## 📈 Future Roadmap

- **Player Skill Ratings**: Track and factor player skill levels
- **Tournament Mode**: Specialized features for tournament management
- **Statistics Dashboard**: Advanced analytics on court usage and player patterns
- **Multi-Language Support**: Internationalization for global use
- **Cloud Sync**: Optional cloud synchronization for multi-device scenarios

## 📄 License

MIT License

## 👥 Contributing

Contributions are welcome! Please feel free to submit a Pull Request. 