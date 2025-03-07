# Queue Display Enhancement with Session Management

## Core Concept 🎯
Each queue instance (venue/session) needs a unique identifier to isolate its data and players.

## Session Management 🔑

### 1. Session Creation

typescript
interface Session {
id: string; // Unique session ID (e.g., 'friday-evening-123')
name: string; // Human readable (e.g., 'Friday Evening Session')
created: number; // Timestamp
organizer: string; // Organizer name
courts: number; // Number of courts
displayCode: string; // Short code for players (e.g., 'FRI123')
}


### 2. Session Flow
1. **Organizer Starts Session**
   - Generate unique session ID
   - Create short display code
   - Initialize courts
   - Get shareable URL

2. **Players Join Session**
   - Access via URL or display code
   - Format: `/display/{sessionCode}`
   - See only their session's data

### 3. Data Isolation

typescript
// Local storage structure
{
'session_FRI123': {
players: Player[];
courts: Court[];
created: number;
lastActive: number;
}
}


## Implementation Steps 📋

### Week 1: Session Management
1. Add session creation on startup
2. Generate unique session ID and display code
3. Isolate data per session
4. Add session URL generation

### Week 2: Display View
1. Create session-specific display route
2. Add player finder within session
3. Show court status for session
4. Add basic wait time estimates

## Technical Details 🛠

### 1. Session ID Generation

javascript
function createSession() {
const sessionId = crypto.randomUUID();
const displayCode = generateDisplayCode(); // e.g., 'FRI123'
return {
id: sessionId,
displayCode,
created: Date.now(),
url: /display/${displayCode}
};
}


### 2. URL Structure
- Organizer: `/manage/{sessionId}`
- Players: `/display/{displayCode}`
- QR Code: Generated from display URL

### 3. Data Storage

javascript
// Prefix all storage keys with session ID
const storageKey = session_${sessionId}_players;
const sessionData = {
players: [],
courts: [],
metadata: {
created: Date.now(),
displayCode,
organizer
}
};


## User Experience 👥

### Organizer Flow
1. Open app
2. Get new session ID and display code
3. Share display code or URL with players
4. Manage queue as normal

### Player Flow
1. Get display code from organizer
2. Access display URL
3. Find their name
4. See their status/position

## Success Metrics 📊
1. Multiple sessions running simultaneously
2. No data crossover between sessions
3. Players accessing correct session data
4. Reduced organizer workload

## Next Steps 👣

1. Add session creation to startup
2. Modify storage to use session prefix
3. Create display view with session filter
4. Add session code sharing (QR + URL)

This approach ensures each venue/session remains isolated while keeping the implementation simple and effective.