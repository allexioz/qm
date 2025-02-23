// Core Models
class Player {
    constructor(name) {
        this.id = crypto.randomUUID();
        this.name = name;
        this.status = 'nogames'; // nogames, waiting, playing, resting
        this.courtId = null;
        this.gamesPlayed = 0;
        this.lastGameTime = null;
    }
}

class Court {
    constructor(id) {
        this.id = id;
        this.status = 'empty'; // empty, ready, in_progress
        this.players = [];     // max 4 players
        this.startTime = null;
        this.queue = [];       // players waiting for this court
        this.timerId = null;   // for tracking the timer interval
        this.startedFromQueue = false;
    }

    // Add method to handle serialization for localStorage
    toJSON() {
        return {
            id: this.id,
            status: this.status,
            players: this.players,
            startTime: this.startTime ? this.startTime.toString() : null,
            queue: this.queue
        };
    }

    // Add method to restore from localStorage
    static fromJSON(data) {
        const court = new Court(data.id);
        court.status = data.status;
        court.players = data.players;
        court.startTime = data.startTime ? parseInt(data.startTime) : null;
        court.queue = data.queue;
        return court;
    }

    canAddPlayer() {
        return this.players.length < 4;
    }

    addPlayer(player) {
        console.group('➕ Adding player to court');
        console.log('Current players:', this.players);
        console.log('Adding player:', player);

        if (!this.canAddPlayer()) {
            console.error('Court is full');
            console.groupEnd();
            throw new Error('Court is full');
        }

        this.players.push(player);
        
        // Update court status
        if (this.players.length === 4) {
            this.status = 'ready';
        } else if (this.players.length > 0) {
            this.status = 'active';
        }

        console.log('Updated players:', this.players);
        console.log('New status:', this.status);
        console.groupEnd();
    }

    startGame() {
        console.group('🎾 Court Start Game');
        const previousState = {
            status: this.status,
            startTime: this.startTime,
            timerId: this.timerId
        };
        console.log('Previous state:', previousState);
        
        this.status = 'in_progress';
        this.startTime = Date.now();
        
        console.log('New state:', {
            status: this.status,
            startTime: this.startTime,
            timerId: this.timerId
        });
        console.groupEnd();
    }

    stopGame() {
        console.group('🛑 Stopping Game');
        console.log('Previous state:', {
            status: this.status,
            startTime: this.startTime,
            timerId: this.timerId
        });

        this.status = 'empty';
        this.startTime = null;
        if (this.timerId) {
            console.log('Clearing timer:', this.timerId);
            clearInterval(this.timerId);
            this.timerId = null;
        }

        console.log('New state:', {
            status: this.status,
            startTime: this.startTime,
            timerId: this.timerId
        });
        console.groupEnd();
    }

    getElapsedTime() {
        console.group('⏱️ Getting Elapsed Time');
        if (!this.startTime) {
            console.log('No start time set');
            console.groupEnd();
            return null;
        }

        const now = Date.now();
        const elapsed = Math.floor((now - this.startTime) / 1000);
        
        console.log('Time calculation:', {
            now,
            startTime: this.startTime,
            elapsed,
            difference: now - this.startTime
        });
        
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

        console.groupEnd();
        return { minutes, seconds };
    }

    completeGame() {
        // Stop any existing timer
        if (this.timerId) {
            clearInterval(this.timerId);
            this.timerId = null;
        }

        // Move next players from queue if available
        if (this.queue.length >= 4) {
            const nextPlayers = this.queue.splice(0, 4);
            this.players = nextPlayers;
            this.status = 'ready';
        } else {
            this.players = [];
            this.status = 'empty';
        }
        
        this.startTime = null;
        this.startedFromQueue = false;
    }
}

// Infrastructure
class EventBus {
    constructor() {
        this.listeners = new Map();
    }

    on(event, callback) {
        console.log(`🎧 Adding listener for: ${event}`);
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event).add(callback);
    }

    emit(event, data) {
        console.group(`📢 Event: ${event}`);
        console.log('Event data:', data);
        
        const callbacks = this.listeners.get(event) || new Set();
        console.log('Number of listeners:', callbacks.size);

        callbacks.forEach((callback, index) => {
            try {
                console.log(`Executing listener ${index + 1}`);
                callback(data);
            } catch (error) {
                console.error(`Error in listener ${index + 1}:`, error);
            }
        });

        console.groupEnd();
    }
}

class LocalStorage {
    constructor() {
        this.storageKey = 'gameState';
        console.log('📦 Initializing LocalStorage with key:', this.storageKey);
        this.validateStorage();
    }

    validateStorage() {
        console.group('🔍 Validating LocalStorage');
        try {
            localStorage.setItem('test', 'test');
            localStorage.removeItem('test');
            console.log('✅ LocalStorage is available and working');
            console.groupEnd();
        } catch (error) {
            console.error('❌ LocalStorage validation failed:', error);
            console.groupEnd();
            throw new Error('LocalStorage is not available');
        }
    }

    save(state) {
        console.group('💾 Saving to LocalStorage');
        try {
            // Validate state object
            if (!state || typeof state !== 'object') {
                throw new Error('Invalid state object');
            }

            console.log('📝 State to save:', {
                players: state.players.length,
                courts: Object.keys(state.courts).length,
                timestamp: new Date().toISOString()
            });

            const serializedState = JSON.stringify(state);
            localStorage.setItem(this.storageKey, serializedState);
            
            console.log('✅ State saved successfully');
            console.groupEnd();
            return true;
        } catch (error) {
            console.error('❌ Failed to save state:', error);
            console.groupEnd();
            throw new Error(`Failed to save state: ${error.message}`);
        }
    }

    load() {
        console.group('📂 Loading from LocalStorage');
        try {
            const serializedState = localStorage.getItem(this.storageKey);
            
            if (!serializedState) {
                console.log('ℹ️ No existing state found, returning default state');
                console.groupEnd();
                return this.getDefaultState();
            }

            const state = JSON.parse(serializedState);
            
            console.log('📊 Loaded state:', {
                players: state.players.length,
                courts: Object.keys(state.courts).length,
                timestamp: new Date().toISOString()
            });

            // Validate loaded state
            if (!this.isValidState(state)) {
                console.warn('⚠️ Invalid state structure detected, returning default state');
                console.groupEnd();
                return this.getDefaultState();
            }

            console.log('✅ State loaded successfully');
            console.groupEnd();
            return state;
        } catch (error) {
            console.error('❌ Failed to load state:', error);
            console.groupEnd();
            return this.getDefaultState();
        }
    }

    clear() {
        console.group('🧹 Clearing LocalStorage');
        try {
            localStorage.removeItem(this.storageKey);
            console.log('✅ Storage cleared successfully');
            console.groupEnd();
            return true;
        } catch (error) {
            console.error('❌ Failed to clear storage:', error);
            console.groupEnd();
            throw new Error(`Failed to clear storage: ${error.message}`);
        }
    }

    isValidState(state) {
        console.group('🔍 Validating State Structure');
        
        const isValid = state &&
            typeof state === 'object' &&
            Array.isArray(state.players) &&
            typeof state.courts === 'object';

        if (!isValid) {
            console.log('❌ State validation failed');
            console.log('Expected structure:', {
                players: 'Array',
                courts: 'Object'
            });
            console.log('Received:', {
                players: state?.players ? typeof state.players : 'undefined',
                courts: state?.courts ? typeof state.courts : 'undefined'
            });
        } else {
            console.log('✅ State structure is valid');
        }

        console.groupEnd();
        return isValid;
    }

    getDefaultState() {
        console.log('📋 Creating default state');
        return {
            players: [],
            courts: {}
        };
    }

    getStorageStats() {
        console.group('📊 LocalStorage Stats');
        try {
            const total = localStorage.length;
            const used = new Blob([JSON.stringify(localStorage)]).size;
            const remaining = 5 * 1024 * 1024 - used; // 5MB is typical limit

            const stats = {
                totalItems: total,
                usedSpace: `${(used / 1024).toFixed(2)}KB`,
                remainingSpace: `${(remaining / 1024).toFixed(2)}KB`,
                timestamp: new Date().toISOString()
            };

            console.table(stats);
            console.groupEnd();
            return stats;
        } catch (error) {
            console.error('❌ Failed to get storage stats:', error);
            console.groupEnd();
            return null;
        }
    }
}

// Game Manager
class GameManager {
    constructor(storage, eventBus) {
        console.group('🎮 Initializing GameManager');
        console.log('Creating new GameManager instance');
        this.storage = storage;
        this.eventBus = eventBus;
        this.courts = new Map();
        this.players = new Map();
        this.loadState();
        console.groupEnd();
    }

    loadState() {
        console.group('📥 Loading State');
        const state = this.storage.load();

        // Load players
        state.players.forEach(playerData => {
            const player = new Player(playerData.name);
            Object.assign(player, playerData);
            this.players.set(player.id, player);
        });

        // Initialize courts with proper time restoration
        ['court-1', 'court-2'].forEach(courtId => {
            console.log(`Initializing court: ${courtId}`);
            const courtData = state.courts[courtId];
            const court = courtData ? Court.fromJSON(courtData) : new Court(courtId);
            this.courts.set(courtId, court);
            
            // Log court state after restoration
            console.log('Restored court state:', {
                id: court.id,
                status: court.status,
                startTime: court.startTime,
                hasTimer: !!court.timerId
            });
        });
        console.groupEnd();
    }

    saveState() {
        console.group('💾 Saving State');
        const state = {
            players: Array.from(this.players.values()),
            courts: Object.fromEntries(
                Array.from(this.courts.entries()).map(([id, court]) => [id, court.toJSON()])
            )
        };
        console.log('Saving state:', state);
        this.storage.save(state);
        console.groupEnd();
    }

    addPlayer(name) {
        const player = new Player(name);
        this.players.set(player.id, player);
        this.eventBus.emit('player:added', player);
        this.saveState();
        return player;
    }

    assignPlayerToCourt(playerId, courtId) {
        console.group('👥 Assigning player to court');
        console.log('Player ID:', playerId);
        console.log('Court ID:', courtId);

        const player = this.players.get(playerId);
        const court = this.courts.get(courtId);

        if (!player || !court) {
            console.error('Player or court not found', { player, court });
            console.groupEnd();
            return;
        }

        try {
            if (court.canAddPlayer()) {
                // Update player status first
                player.status = 'playing';
                player.courtId = courtId;

                // Then add to court
                court.addPlayer(player);
                
                console.log('Updated court state:', court);
                console.log('Updated player state:', player);

                // Save and emit events
                this.saveState();
                this.eventBus.emit('court:updated', court);
                this.eventBus.emit('players:updated');

                Toast.show(`Added ${player.name} to Court ${courtId.split('-')[1]}`, Toast.types.SUCCESS);
            } else {
                Toast.show('Court is full', Toast.types.ERROR);
            }
        } catch (error) {
            console.error('Failed to assign player:', error);
            Toast.show('Failed to assign player', Toast.types.ERROR);
        }

        console.groupEnd();
    }

    startGame(courtId) {
        console.group('🎮 Starting Game Process');
        
        const court = this.courts.get(courtId);
        if (!court) {
            console.error('❌ Court not found:', courtId);
            console.groupEnd();
            return;
        }

        try {
            court.startGame();
            
            // Update player statuses and increment games count for Quick Add
            court.players.forEach(player => {
                const oldStatus = player.status;
                player.status = 'playing';
                player.gamesPlayed++; // Increment games count when starting via Quick Add
                player.lastGameTime = Date.now();
                console.log(`Player ${player.name}: ${oldStatus} -> ${player.status} (Games: ${player.gamesPlayed})`);
            });

            Toast.show('Game started!', Toast.types.SUCCESS);
            this.eventBus.emit('game:started', court);
            this.saveState();
        } catch (error) {
            console.error('❌ Failed to start game:', error);
            Toast.show('Failed to start game', Toast.types.ERROR);
        }
        
        console.groupEnd();
    }

    getAvailablePlayers() {
        // Return all players without filtering by status
        return Array.from(this.players.values());
    }

    importPlayers(namesText) {
        console.group('👥 Importing players');
        console.log('Raw input:', namesText);

        const playerNames = namesText
            .split('\n')
            .map(name => name.trim())
            // Remove numbers and dots from the start (e.g., "1.", "12.", etc.)
            .map(name => name.replace(/^\d+\.\s*/, ''))
            // Capitalize first letter of each word
            .map(name => name
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
            )
            .filter(name => name.length > 0);

        console.log('Processed names:', playerNames);

        if (playerNames.length === 0) {
            console.warn('❌ No valid player names found');
            Toast.show('Please enter at least one player name', Toast.types.ERROR);
            throw new Error('Please enter at least one player name');
        }

        // Add new players
        const newPlayers = playerNames.filter(name => 
            !Array.from(this.players.values()).find(p => p.name === name)
        );

        console.log('New players to add:', newPlayers);

        newPlayers.forEach(name => {
            const player = new Player(name);
            this.players.set(player.id, player);
            console.log('Added player:', player);
        });

        if (newPlayers.length > 0) {
            console.log(`✅ Added ${newPlayers.length} new players`);
            Toast.show(`Added ${newPlayers.length} new player${newPlayers.length === 1 ? '' : 's'}`, Toast.types.SUCCESS);
        } else {
            console.log('ℹ️ All players already exist');
            Toast.show('All players already exist', Toast.types.INFO);
        }

        this.saveState();
        this.eventBus.emit('players:updated');
        return newPlayers.length;
    }

    resetAllData() {
        // Clear players
        this.players.clear();
        
        // Reset courts
        this.courts.forEach(court => {
            court.players = [];
            court.status = 'empty';
            court.startTime = null;
            court.queue = [];
        });

        // Save empty state
        this.saveState();
        
        // Emit events
        this.eventBus.emit('players:updated');
        this.courts.forEach(court => {
            this.eventBus.emit('court:updated', court);
        });
    }

    resetCourt(court) {
        // Reset court to empty state
        court.players = [];
        court.status = 'empty';
        court.startTime = null;
        court.queue = [];
        
        // Update display
        this.eventBus.emit('court:updated', court);
        this.saveState();
    }

    addToQueue(courtId, playerIds) {
        console.group('➕ Adding players to queue');
        const court = this.courts.get(courtId);
        
        if (!court) {
            console.error('Court not found');
            console.groupEnd();
            return;
        }

        const addedPlayers = [];
        playerIds.forEach(playerId => {
            const player = this.players.get(playerId);
            if (player) {
                player.status = 'queued';
                player.courtId = courtId;
                court.queue.push(player);
                addedPlayers.push(player);
                console.log('Added to queue:', player.name);
            }
        });

        if (addedPlayers.length > 0) {
            Toast.show(`Added ${addedPlayers.length} player${addedPlayers.length === 1 ? '' : 's'} to queue`, Toast.types.SUCCESS);
            this.saveState();
            this.eventBus.emit('court:updated', court);
            this.eventBus.emit('players:updated');
        }

        console.groupEnd();
    }

    getQueueablePlayers() {
        return Array.from(this.players.values())
            .filter(player => 
                player.status === 'nogames' || 
                player.status === 'waiting' || 
                player.status === 'resting'
            );
    }

    completeGame(courtId) {
        console.group('🏁 Complete Game Flow');
        
        try {
            const court = this.courts.get(courtId);
            if (!court) throw new Error(`Court ${courtId} not found`);

            // For games started from queue, increment the count here
            if (court.startedFromQueue) {
                court.players.forEach(player => {
                    const playerObj = this.players.get(player.id);
                    if (playerObj) {
                        playerObj.gamesPlayed++;
                    }
                });
            }

            // Update player statuses
            court.players.forEach(player => {
                const playerObj = this.players.get(player.id);
                if (playerObj) {
                    playerObj.status = 'resting';
                    playerObj.lastGameTime = Date.now();
                }
            });

            // Clear the court and handle queue
            court.completeGame();
            
            // Stop the timer
            if (court.timerId) {
                clearInterval(court.timerId);
                court.timerId = null;
            }

            // Save state and emit events
            this.saveState();
            this.eventBus.emit('game:completed', court);
            this.eventBus.emit('court:updated', court);
            this.eventBus.emit('players:updated');

        } catch (error) {
            console.error('❌ Error completing game:', error);
            Toast.show('Failed to complete game', Toast.types.ERROR);
        }
        
        console.groupEnd();
    }

    initializeCourtViews() {
        console.group('🎮 Initializing Court Views');
        this.courts.forEach(court => {
            const view = new CourtView(court, this, this.eventBus);
            console.log(`Initialized view for court ${court.id}`);
        });
        console.groupEnd();
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.group('🚀 Initializing Application');
    
    // Set up infrastructure
    const storage = new LocalStorage();
    const eventBus = new EventBus();
    const gameManager = new GameManager(storage, eventBus);

    // Initialize UI Components
    const courtsContainer = document.querySelector('.courts-container');
    if (!courtsContainer) {
        console.error('Courts container not found');
        return;
    }
    
    // Clear existing content
    courtsContainer.innerHTML = '';
    
    const courtViews = new Map();
    
    // Create court views
    ['court-1', 'court-2'].forEach(courtId => {
        console.log(`Creating view for court: ${courtId}`);
        const court = gameManager.courts.get(courtId);
        const view = new CourtView(court, gameManager, eventBus);
        courtViews.set(courtId, view);
        
        // Create container for this court
        const courtContainer = document.createElement('div');
        courtsContainer.appendChild(courtContainer);
        
        // Mount the court view
        try {
            view.mount(courtContainer);
            console.log(`Successfully mounted court: ${courtId}`);
        } catch (error) {
            console.error(`Failed to mount court ${courtId}:`, error);
        }
    });

    // Initialize modals
    const playerListView = new PlayerListView(gameManager, eventBus);
    const quickAddModal = new QuickAddModal(gameManager, eventBus);
    const queueModal = new QueueModal(gameManager, eventBus);

    // Set up event listeners
    eventBus.on('players:updated', () => {
        console.log('🔄 Players updated event received');
        playerListView.updatePlayersList();
        // Also update quick add modal if it's open
        if (quickAddModal.isVisible()) {
            quickAddModal.updateAvailablePlayers();
        }
    });

    eventBus.on('court:updated', (court) => {
        console.log('🎾 Court updated:', court.id);
        const view = courtViews.get(court.id);
        if (view) view.update();
    });

    eventBus.on('court:quickAdd', (court) => {
        quickAddModal.show(court);
    });

    eventBus.on('players:assigned', ({courtId, playerIds}) => {
        playerIds.forEach(playerId => {
            gameManager.assignPlayerToCourt(playerId, courtId);
        });
    });

    // Add queue event listener with debugging
    eventBus.on('court:addToQueue', (court) => {
        console.group('Queue Modal Show');
        console.log('Opening queue modal for court:', court);
        queueModal.show(court);
        console.groupEnd();
    });

    eventBus.on('court:startGame', (court) => {
        console.group('🎮 Starting Game');
        console.log('Starting game for court:', court.id);
        gameManager.startGame(court.id);
        console.groupEnd();
    });

    eventBus.on('game:started', (court) => {
        console.group('🎲 Game Started');
        console.log('Game started on court:', court.id);
        const view = courtViews.get(court.id);
        if (view) {
            view.update();
            view.startGameTimer();
        }
        console.groupEnd();
    });

    // Initialize tabs
    initializeTabs();

    // Apply initial gradients
    applyCourtGradients();

    console.groupEnd();
});

function initializeTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const views = document.querySelectorAll('.view');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            views.forEach(v => v.classList.remove('active'));

            tab.classList.add('active');
            const viewId = `${tab.dataset.view}-view`;
            document.getElementById(viewId).classList.add('active');
        });
    });
}

// Add function to generate random mesh gradients
function generateCourtGradient() {
    const palettes = [
        // Spring Pastels
        { h1: 150, h2: 140, h3: 145 },  // Mint and sage
        { h1: 85, h2: 95, h3: 90 },     // Fresh green
        { h1: 180, h2: 175, h3: 178 },  // Spring water
        { h1: 335, h2: 330, h3: 333 },  // Cherry blossom
        
        // Summer Vibes
        { h1: 35, h2: 45, h3: 40 },     // Warm sand
        { h1: 190, h2: 185, h3: 188 },  // Ocean breeze
        { h1: 55, h2: 50, h3: 53 },     // Sunlight
        { h1: 320, h2: 315, h3: 318 },  // Summer rose
        
        // Autumn Warmth
        { h1: 25, h2: 20, h3: 23 },     // Pumpkin spice
        { h1: 15, h2: 10, h3: 13 },     // Autumn leaves
        { h1: 45, h2: 40, h3: 43 },     // Golden hour
        { h1: 5, h2: 0, h3: 3 },        // Maple

        // Winter Cool
        { h1: 200, h2: 195, h3: 198 },  // Winter sky
        { h1: 220, h2: 215, h3: 218 },  // Frost
        { h1: 240, h2: 235, h3: 238 },  // Winter twilight
        { h1: 185, h2: 180, h3: 183 },  // Ice

        // Modern Trends 2024
        { h1: 270, h2: 265, h3: 268 },  // Digital lavender
        { h1: 165, h2: 160, h3: 163 },  // Neo mint
        { h1: 345, h2: 340, h3: 343 },  // Peach fuzz
        { h1: 195, h2: 190, h3: 193 },  // Tranquil blue

        // Nature Inspired
        { h1: 135, h2: 130, h3: 133 },  // Forest moss
        { h1: 210, h2: 205, h3: 208 },  // Mountain mist
        { h1: 40, h2: 35, h3: 38 },     // Desert sand
        { h1: 280, h2: 275, h3: 278 },  // Wild thistle

        // Sunset Collection
        { h1: 20, h2: 15, h3: 18 },     // Sunset orange
        { h1: 350, h2: 345, h3: 348 },  // Dusk pink
        { h1: 285, h2: 280, h3: 283 },  // Evening purple
        { h1: 30, h2: 25, h3: 28 },     // Golden rays

        // Ocean Depths
        { h1: 185, h2: 180, h3: 183 },  // Shallow waters
        { h1: 200, h2: 195, h3: 198 },  // Deep blue
        { h1: 170, h2: 165, h3: 168 },  // Coral reef
        { h1: 210, h2: 205, h3: 208 }   // Ocean abyss
    ];

    const palette = palettes[Math.floor(Math.random() * palettes.length)];
    
    // Varied saturation and lightness for more interest
    const color1 = `hsl(${palette.h1}, ${45 + Math.random() * 5}%, ${73 + Math.random() * 5}%)`;
    const color2 = `hsl(${palette.h2}, ${40 + Math.random() * 5}%, ${80 + Math.random() * 4}%)`;
    const color3 = `hsl(${palette.h3}, ${42 + Math.random() * 5}%, ${76 + Math.random() * 4}%)`;
    
    return {
        gradient1: color1,
        gradient2: color2,
        gradient3: color3
    };
}

// Apply random gradients to courts
function applyCourtGradients() {
    const courts = document.querySelectorAll('.court-2d');
    
    courts.forEach(court => {
        const colors = generateCourtGradient();
        court.style.setProperty('--court-gradient-1', colors.gradient1);
        court.style.setProperty('--court-gradient-2', colors.gradient2);
        court.style.setProperty('--court-gradient-3', colors.gradient3);
    });
}

// UI Components
class CourtView {
    constructor(court, gameManager, eventBus) {
        this.court = court;
        this.gameManager = gameManager;
        this.eventBus = eventBus;
        this.element = null;
        this.render();
        this.attachEventListeners();
        
        console.log('🎾 Initialized CourtView:', {
            courtId: court.id,
            hasGameManager: !!gameManager,
            hasEventBus: !!eventBus
        });
    }

    render() {
        return `
            <div class="court-2d ${this.court.status}" data-court-id="${this.court.id}">
                <div class="court-simulation">
                    ${this.renderHeader()}
                    ${this.renderContent()}
                </div>
                <div class="court-bottom-section">
                    ${this.renderActions()}
                </div>
            </div>
        `;
    }

    renderHeader() {
        const statusText = this.getStatusText();
        const timeDisplay = this.court.status === 'in_progress' ? 
            `<span class="time-elapsed">(${this.getTimeDisplay()})</span>` : '';

        return `
            <div class="court-header">
                <div class="court-number">Court ${this.court.id.split('-')[1]}</div>
                <div class="court-status">
                    <span class="status-dot"></span>
                    ${statusText} ${timeDisplay}
                </div>
            </div>
        `;
    }

    renderContent() {
        return `
            <div class="court-content">
                ${this.renderTeamSection('a')}
                ${this.renderCourtLines()}
                ${this.renderTeamSection('b')}
            </div>
        `;
    }

    renderActions() {
        let primaryButton = '';
        let queueButton = '';
        let completeButton = '';
        
        if (this.court.status === 'ready') {
            primaryButton = `
                <button class="court-button start-game-btn">
                    <i class="fas fa-play"></i>
                    Start Game
                </button>
            `;
        } else if (this.court.status === 'empty' || this.court.players.length < 4) {
            const remainingSlots = 4 - this.court.players.length;
            primaryButton = `
                <button class="court-button quick-add-btn">
                    <i class="fas fa-plus"></i>
                    Add ${remainingSlots} Player${remainingSlots === 1 ? '' : 's'}
                </button>
            `;
        }

        if (this.court.status === 'in_progress') {
            completeButton = `
                <button class="court-button complete-game-btn">
                    <i class="fas fa-flag"></i>
                    Complete Game
                </button>
            `;
        }

        // Only show queue button if court is not empty
        if (this.court.status !== 'empty') {
            queueButton = `
                <button class="court-button add-to-queue-btn">
                    <i class="fas fa-user-plus"></i>
                    Queue
                </button>
            `;
        }

        return `
            <div class="court-actions">
                ${primaryButton}
                ${completeButton}
                ${queueButton}
                ${this.renderQueueSection()}
            </div>
        `;
    }

    renderQueueSection() {
        if (!this.court.queue.length) {
            return '';
        }

        // Group players into matches of 4
        const matches = [];
        for (let i = 0; i < this.court.queue.length; i += 4) {
            const matchPlayers = this.court.queue.slice(i, i + 4);
            // Only create a match if we have exactly 4 players
            if (matchPlayers.length === 4) {
                matches.push({
                    teamA: matchPlayers.slice(0, 2).map(p => p.name.split(' ')[0]).join(' & '),
                    teamB: matchPlayers.slice(2, 4).map(p => p.name.split(' ')[0]).join(' & ')
                });
            }
        }

        // Only show up to 3 matches
        const displayMatches = matches.slice(0, 3);
        const remainingMatches = matches.length - 3;

        return `
            <div class="queue-section">
                <div class="queue-header">Next Up (${matches.length} ${matches.length === 1 ? 'match' : 'matches'})</div>
                <div class="queue-list">
                    ${displayMatches.map((match, index) => `
                        <div class="queue-match">
                            <span class="match-number">${index + 1}</span>
                            <span class="team-a">${match.teamA}</span>
                            <span class="vs">vs</span>
                            <span class="team-b">${match.teamB}</span>
                        </div>
                    `).join('')}
                    ${remainingMatches > 0 ? `
                        <div class="queue-match" style="justify-content: center; color: #666;">
                            +${remainingMatches} more ${remainingMatches === 1 ? 'match' : 'matches'}
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }

    mount(container) {
        // Create a temporary div to hold the court HTML
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = this.render();
        
        // Get the first child (our court element)
        this.element = tempDiv.firstElementChild;
        
        // Clear container and append the new element
        container.innerHTML = '';
        container.appendChild(this.element);
        
        // Now attach event listeners
        this.attachEventListeners();
    }

    update() {
        console.group('🔄 Updating Court View');
        console.log('Court state:', {
            id: this.court.id,
            status: this.court.status,
            startTime: this.court.startTime,
            timerId: this.court.timerId
        });
        
        if (this.element) {
            // Create new element
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = this.render();
            const newElement = tempDiv.firstElementChild;
            
            if (!newElement) {
                console.error('Failed to create new element');
                console.groupEnd();
                return;
            }

            // Replace old element with new one
            try {
                this.element.parentNode.replaceChild(newElement, this.element);
                this.element = newElement;
                this.attachEventListeners();
                
                // Restart timer if game is in progress
                if (this.court.status === 'in_progress') {
                    console.log('Game in progress, starting timer');
                    this.startGameTimer();
                } else {
                    console.log('Game not in progress, stopping timer');
                    this.stopGameTimer();
                }
                
                console.log('Court view updated successfully');
            } catch (error) {
                console.error('Failed to update court view:', error);
            }
        } else {
            console.warn('No element to update');
        }
        
        console.groupEnd();
    }

    attachEventListeners() {
        if (!this.element) {
            console.error('❌ No element to attach listeners to');
            return;
        }

        // Existing listeners
        const quickAddBtn = this.element.querySelector('.quick-add-btn');
        if (quickAddBtn) {
            quickAddBtn.addEventListener('click', () => {
                console.log('Quick add button clicked');
                this.eventBus.emit('court:quickAdd', this.court);
            });
        }

        const startGameBtn = this.element.querySelector('.start-game-btn');
        if (startGameBtn) {
            startGameBtn.addEventListener('click', () => {
                console.group('🎯 Start Game Button Click');
                console.log('Court state:', {
                    id: this.court.id,
                    status: this.court.status,
                    players: this.court.players.length
                });
                this.eventBus.emit('court:startGame', this.court);
                console.groupEnd();
            });
        }

        // Add queue button listener
        const queueBtn = this.element.querySelector('.add-to-queue-btn');
        if (queueBtn) {
            queueBtn.addEventListener('click', () => {
                console.group('Queue Button Click');
                console.log('Court:', this.court);
                this.eventBus.emit('court:addToQueue', this.court);
                console.groupEnd();
            });
        } else {
            console.warn('Queue button not found');
        }

        const completeGameBtn = this.element.querySelector('.complete-game-btn');
        if (completeGameBtn) {
            completeGameBtn.addEventListener('click', () => {
                console.group('🎯 Complete Game Button Click');
                try {
                    if (!this.gameManager) {
                        throw new Error('GameManager not initialized');
                    }
                    
                    console.log('Completing game for court:', {
                        id: this.court.id,
                        status: this.court.status,
                        players: this.court.players.length
                    });
                    
                    this.gameManager.completeGame(this.court.id);
                    Toast.show('Game completed successfully!', Toast.types.SUCCESS);
                } catch (error) {
                    console.error('Failed to complete game:', error);
                    Toast.show(error.message, Toast.types.ERROR);
                }
                console.groupEnd();
            });
            
            console.log('✅ Complete game button listener attached');
        }

        // Listen for game completed event
        this.eventBus.on('game:completed', (court) => {
            if (court.id === this.court.id) {
                this.stopGameTimer();
                this.render(); // Re-render the entire court view
            }
        });
    }

    getStatusText() {
        switch (this.court.status) {
            case 'in_progress': return 'In Progress';
            case 'ready': return 'Ready to Start';
            default: return 'Empty';
        }
    }

    getTimeDisplay() {
        if (this.court.startTime) {
            const elapsed = Math.floor((Date.now() - this.court.startTime) / 1000);
            const minutes = Math.floor(elapsed / 60);
            const seconds = elapsed % 60;
            return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }
        return '--:--';
    }

    renderCourtLines() {
        return `
            <div class="court-lines">
                <div class="doubles-sideline left"></div>
                <div class="doubles-sideline right"></div>
                <div class="service-court top-left"></div>
                <div class="service-court top-right"></div>
                <div class="service-court bottom-left"></div>
                <div class="service-court bottom-right"></div>
                <div class="net">
                    <div class="net-center"></div>
                </div>
            </div>
        `;
    }

    startGameTimer() {
        console.group('⏱️ Starting Game Timer');
        
        if (this.court.timerId) {
            console.log('Clearing existing timer:', this.court.timerId);
            clearInterval(this.court.timerId);
            this.court.timerId = null;
        }

        // Find both time displays
        const statusTimeDisplay = this.element.querySelector('.time-elapsed');
        const headerTimeDisplay = this.element.querySelector('.time-display');

        if (!statusTimeDisplay || !headerTimeDisplay) {
            console.error('Time display elements not found');
            console.groupEnd();
            return;
        }

        console.log('Setting up timer with start time:', new Date(this.court.startTime).toISOString());
        
        const updateTimer = () => {
            const elapsed = this.court.getElapsedTime();
            if (elapsed) {
                const timeString = `${elapsed.minutes.toString().padStart(2, '0')}:${elapsed.seconds.toString().padStart(2, '0')}`;
                // Update both displays
                statusTimeDisplay.textContent = `(${timeString})`;
                headerTimeDisplay.textContent = timeString;
                console.log('Timer displays updated:', timeString);
            }
        };

        // Update immediately
        updateTimer();

        // Set up interval
        this.court.timerId = setInterval(updateTimer, 1000);
        console.log('Timer started with ID:', this.court.timerId);
        console.groupEnd();
    }

    stopGameTimer() {
        console.group('🛑 Stopping Game Timer');
        if (this.court.timerId) {
            clearInterval(this.court.timerId);
            this.court.timerId = null;
            
            // Reset both time displays
            const statusTimeDisplay = this.element.querySelector('.time-elapsed');
            const headerTimeDisplay = this.element.querySelector('.time-display');
            
            if (statusTimeDisplay) statusTimeDisplay.textContent = '';
            if (headerTimeDisplay) headerTimeDisplay.textContent = '--:--';
            
            console.log('Reset time displays');
        }
        console.groupEnd();
    }

    renderTeamSection(team) {
        console.group(`🎾 Rendering team ${team.toUpperCase()}`);
        const players = team === 'a' ? 
            this.court.players.slice(0, 2) : 
            this.court.players.slice(2, 4);

        console.log(`Team ${team.toUpperCase()} players:`, players);

        const html = `
            <div class="team-section team-${team}" style="display: ${players.length ? 'block' : 'none'}">
                <div class="team-info">
                    <div class="team-players">
                        ${this.renderPlayers(players)}
                    </div>
                </div>
            </div>
        `;

        console.groupEnd();
        return html;
    }

    renderPlayers(players) {
        if (!players || players.length === 0) {
            console.log('No players to render');
            return '';
        }
        
        console.log('Rendering players:', players);
        return players.map(player => `
            <div class="player">
                <span>${player.name}</span>
            </div>
        `).join('');
    }
}

class QuickAddModal {
    constructor(gameManager, eventBus) {
        this.gameManager = gameManager;
        this.eventBus = eventBus;
        this.element = document.getElementById('quickAddModal');
        this.currentCourt = null;
        this.selectedPlayers = new Set();
        this.initialize();
    }

    initialize() {
        console.group('🎯 Initializing Quick Add Modal');
        
        // Remove search input creation since it's in HTML
        const modalBody = this.element.querySelector('.modal-body');
        
        // Add search functionality to existing search input
        const searchInput = this.element.querySelector('#playerSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                console.log('🔍 Searching:', searchInput.value);
                this.updateAvailablePlayers();
            });
        }

        // Attach event listeners
        const closeBtn = this.element.querySelector('.close-btn');
        const cancelBtn = document.getElementById('cancelQuickAdd');
        const confirmBtn = document.getElementById('confirmQuickAdd');
        const playersList = document.getElementById('availablePlayersList');

        if (closeBtn) closeBtn.addEventListener('click', () => this.hide());
        if (cancelBtn) cancelBtn.addEventListener('click', () => this.hide());
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => {
                console.group('✅ Confirm Quick Add');
                try {
                    this.confirmSelection();
                } catch (error) {
                    console.error('Failed to confirm selection:', error);
                    Toast.show('Failed to add players', Toast.types.ERROR);
                }
                console.groupEnd();
            });
        }

        if (playersList) {
            playersList.addEventListener('click', (e) => {
                const playerChip = e.target.closest('.player-chip');
                if (playerChip) {
                    const playerId = playerChip.dataset.playerId;
                    console.log('Player chip clicked:', {
                        playerId,
                        isSelected: this.selectedPlayers.has(playerId)
                    });
                    this.togglePlayerSelection(playerChip);
                }
            });
        }

        // Add sort functionality
        const sortBtns = this.element.querySelectorAll('.sort-btn');
        sortBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                sortBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.sortPlayers(btn.dataset.sort);
            });
        });

        console.log('Event listeners attached');
        console.groupEnd();
    }

    show(court) {
        console.group('📱 Showing Quick Add Modal');
        console.log('Court:', court);
        
        this.currentCourt = court;
        this.selectedPlayers.clear();
        this.element.classList.add('active');
        this.updateAvailablePlayers();
        this.updateSelectedCount();
        
        console.log('Modal state after show:', {
            isVisible: this.isVisible(),
            currentCourt: this.currentCourt?.id,
            selectedCount: this.selectedPlayers.size
        });
        console.groupEnd();
    }

    hide() {
        console.log('🔒 Hiding Quick Add Modal');
        this.element.classList.remove('active');
        this.currentCourt = null;
        this.selectedPlayers.clear();
    }

    togglePlayerSelection(playerChip) {
        console.group('🔄 Toggling player selection');
        
        const playerId = playerChip.dataset.playerId;
        
        if (this.selectedPlayers.has(playerId)) {
            this.selectedPlayers.delete(playerId);
        } else if (this.selectedPlayers.size < 4) {
            this.selectedPlayers.add(playerId);
        } else {
            Toast.show('Maximum 4 players can be selected', Toast.types.WARNING);
            return;
        }

        this.updateUI();
        
        console.groupEnd();
    }

    updateUI() {
        this.updateAvailablePlayers();
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const countElement = this.element.querySelector('.selected-count');
        const total = this.selectedPlayers.size;

        if (total > 0) {
            countElement.innerHTML = `
                <div class="team-count">Selected Players (${total}/4)</div>
            `;
            countElement.classList.add('has-teams');
        } else {
            countElement.innerHTML = '<span>Selected Players (0/4)</span>';
            countElement.classList.remove('has-teams');
        }

        if (total === 4) {
            countElement.classList.add('full');
        } else {
            countElement.classList.remove('full');
        }
    }

    confirmSelection() {
        console.group('✅ Confirming player selection');
        
        if (this.selectedPlayers.size === 4 && this.currentCourt) {
            try {
                const playerIds = Array.from(this.selectedPlayers);
                playerIds.forEach(playerId => {
                    this.gameManager.assignPlayerToCourt(playerId, this.currentCourt.id);
                });
                this.hide();
                Toast.show('Players added successfully', Toast.types.SUCCESS);
            } catch (error) {
                console.error('Failed to assign players:', error);
                Toast.show('Failed to add players', Toast.types.ERROR);
            }
        } else {
            console.warn('Invalid selection state');
            Toast.show('Please select exactly 4 players', Toast.types.WARNING);
        }
        console.groupEnd();
    }

    isVisible() {
        return this.element.classList.contains('active');
    }

    updateAvailablePlayers() {
        console.group('📋 Updating Available Players List');
        const container = document.getElementById('availablePlayersList');
        const searchInput = this.element.querySelector('#playerSearchInput');
        
        if (!container) {
            console.error('❌ Available players list container not found');
            console.groupEnd();
            return;
        }

        // Get all players
        let allPlayers = Array.from(this.gameManager.players.values());
        
        // Apply search filter if there's a search term
        const searchTerm = (searchInput?.value || '').toLowerCase();
        if (searchTerm) {
            allPlayers = allPlayers.filter(player => 
                player.name.toLowerCase().includes(searchTerm)
            );
            console.log(`Filtered to ${allPlayers.length} players matching "${searchTerm}"`);
        }

        if (allPlayers.length === 0) {
            container.innerHTML = this.renderEmptyState(searchTerm ? 'No matches found' : 'No players available');
            console.groupEnd();
            return;
        }

        // Get current sort criteria
        const activeSortBtn = this.element.querySelector('.sort-btn.active');
        const sortCriteria = activeSortBtn ? activeSortBtn.dataset.sort : 'name';
        
        // Sort players
        this.sortPlayers(sortCriteria);

        console.groupEnd();
    }

    renderPlayerChip(player) {
        const isSelected = this.selectedPlayers.has(player.id);
        const isFull = this.selectedPlayers.size >= 4;
        const disabledClass = (!isSelected && isFull) ? 'disabled' : '';
        
        return `
            <div class="player-chip ${isSelected ? 'selected' : ''} ${disabledClass}" 
                 data-player-id="${player.id}">
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <div class="player-stats">
                        <span class="games-played">
                            <i class="fas fa-trophy"></i>
                            ${player.gamesPlayed} games
                        </span>
                        ${player.lastGameTime ? `
                            <span class="last-game-time">
                                <i class="fas fa-clock"></i>
                                ${this.formatLastGameTime(player.lastGameTime)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="selection-indicator">
                    ${isSelected ? 'Selected' : 'Select'}
                </div>
            </div>
        `;
    }

    formatLastGameTime(timestamp) {
        if (!timestamp) return null;
        
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours}h ago`;
        }
        
        return `${Math.floor(hours / 24)}d ago`;
    }

    sortPlayers(criteria) {
        console.group('🔄 Sorting Players');
        console.log('Sort criteria:', criteria);
        
        let allPlayers = Array.from(this.gameManager.players.values());
        
        switch(criteria) {
            case 'games':
                allPlayers.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
                break;
            case 'recent':
                allPlayers.sort((a, b) => {
                    if (!a.lastGameTime) return 1;
                    if (!b.lastGameTime) return -1;
                    return b.lastGameTime - a.lastGameTime;
                });
                break;
            default: // 'name'
                allPlayers.sort((a, b) => a.name.localeCompare(b.name));
        }

        const container = document.getElementById('availablePlayersList');
        if (container) {
            container.innerHTML = allPlayers
                .map(player => this.renderPlayerChip(player))
                .join('');
        }
        
        console.log('Players sorted:', allPlayers.length);
        console.groupEnd();
    }

    renderEmptyState(message) {
        return `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>${message}</p>
                <span>Add players first using the import feature</span>
            </div>
        `;
    }
}

// New PlayerListView component
class PlayerListView {
    constructor(gameManager, eventBus) {
        this.gameManager = gameManager;
        this.eventBus = eventBus;
        this.initialize();
    }

    initialize() {
        console.group('🎯 Initializing PlayerListView');
        
        // Get DOM elements for both desktop and mobile
        const importButtons = ['importButton', 'mobileImportButton'];
        const importTextareas = ['playerImport', 'mobilePlayerImport'];
        const resetButtons = ['resetButton', 'mobileResetButton'];

        // Add import handlers
        importButtons.forEach((btnId, index) => {
            const button = document.getElementById(btnId);
            const textarea = document.getElementById(importTextareas[index]);
            
            if (button && textarea) {
                button.addEventListener('click', () => {
                    console.group('📝 Import Button Clicked');
                    const namesText = textarea.value.trim();
                    
                    if (!namesText) {
                        Toast.show('Please enter player names', Toast.types.ERROR);
                        return;
                    }

                    try {
                        const result = this.gameManager.importPlayers(namesText);
                        textarea.value = '';
                    } catch (error) {
                        Toast.show(error.message, Toast.types.ERROR);
                    }
                });
            }
        });

        // Add reset handlers
        resetButtons.forEach(btnId => {
            const button = document.getElementById(btnId);
            if (button) {
                button.addEventListener('click', () => {
                    if (confirm('Are you sure you want to reset all data? This cannot be undone.')) {
                        this.gameManager.resetAllData();
                        Toast.show('All data has been reset', Toast.types.INFO);
                    }
                });
            }
        });

        // Initial render
        this.updatePlayersList();
        console.groupEnd();
    }

    updatePlayersList() {
        console.group('🔄 Updating Players List');
        
        // Update both desktop and mobile lists
        const listsToUpdate = [
            document.getElementById('playersList'),
            document.querySelector('.mobile-players-list')
        ];

        listsToUpdate.forEach(list => {
            if (!list) return;

            const players = Array.from(this.gameManager.players.values());
            
            if (players.length === 0) {
                list.innerHTML = this.renderEmptyState();
            } else {
                const sortedPlayers = players.sort((a, b) => a.name.localeCompare(b.name));
                list.innerHTML = sortedPlayers
                    .map(player => this.renderPlayerItem(player))
                    .join('');
            }
        });

        console.groupEnd();
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>No Players Added</p>
                <span>Import players using the form above</span>
            </div>
        `;
    }

    renderPlayerItem(player) {
        const statuses = this.getPlayerStatuses(player);
        
        return `
            <div class="player-item" data-player-id="${player.id}">
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <div class="player-stats">
                        <span class="games-played" title="Games Played">
                            <i class="fas fa-trophy"></i>
                            ${player.gamesPlayed}
                        </span>
                        ${player.lastGameTime ? `
                            <span class="last-game" title="Last Game">
                                <i class="fas fa-clock"></i>
                                ${this.formatLastGameTime(player.lastGameTime)}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="player-statuses">
                    ${statuses.map(status => `
                        <span class="status-badge ${status.class}">
                            <i class="fas ${status.icon}"></i>
                            ${status.label}
                        </span>
                    `).join('')}
                </div>
            </div>
        `;
    }

    getPlayerStatuses(player) {
        const statuses = [];
        
        // Check if currently playing
        if (player.status === 'playing') {
            statuses.push({
                label: 'Playing',
                icon: 'fa-table-tennis-paddle-ball',
                class: 'playing'
            });
        }

        // Check if in any queue
        const isQueued = Array.from(this.gameManager.courts.values())
            .some(court => court.queue.some(p => p.id === player.id));
        if (isQueued) {
            statuses.push({
                label: 'Queued',
                icon: 'fa-clock',
                class: 'queued'
            });
        }

        // Check if resting (played recently and not playing or queued)
        const restingThreshold = 10 * 60 * 1000; // 10 minutes in milliseconds
        const isResting = player.lastGameTime && 
                         (Date.now() - player.lastGameTime) < restingThreshold && 
                         !isQueued && 
                         player.status !== 'playing';
        
        if (isResting) {
            statuses.push({
                label: 'Resting',
                icon: 'fa-couch',
                class: 'resting'
            });
        }

        // Default status if no other status applies
        if (statuses.length === 0) {
            statuses.push({
                label: player.gamesPlayed > 0 ? 'Available' : 'No Games Yet',
                icon: player.gamesPlayed > 0 ? 'fa-check' : 'fa-circle-minus',
                class: player.gamesPlayed > 0 ? 'available' : 'nogames'
            });
        }

        return statuses;
    }

    formatLastGameTime(timestamp) {
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours}h ago`;
        }
        return `${Math.floor(hours / 24)}d ago`;
    }
}

// Helper function to format the last game time
function formatLastGameTime(timestamp) {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) {
        return `${minutes}m ago`;
    }
    const hours = Math.floor(minutes / 60);
    if (hours < 24) {
        return `${hours}h ago`;
    }
    return `${Math.floor(hours / 24)}d ago`;
}

// Helper function to format player status
function formatPlayerStatus(status) {
    const statusMap = {
        'nogames': '⚪ No Games',
        'waiting': '🔄 Waiting',
        'playing': '🎯 Playing',
        'resting': '💤 Resting'
    };
    return statusMap[status] || status;
}

// Also add back the Toast class
class Toast {
    static types = {
        SUCCESS: 'success',
        ERROR: 'error',
        INFO: 'info'
    };

    static container = null;

    static initialize() {
        if (!this.container) {
            this.container = document.createElement('div');
            this.container.className = 'toast-container';
            document.body.appendChild(this.container);
        }
    }

    static show(message, type = this.types.INFO, duration = 3000) {
        console.log(`🔔 Toast: ${type} - ${message}`);
        this.initialize();

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const icon = this.getIcon(type);
        toast.innerHTML = `
            <i class="fas ${icon}"></i>
            <span>${message}</span>
        `;

        this.container.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        setTimeout(() => {
            toast.classList.remove('show');
            toast.addEventListener('transitionend', () => {
                toast.remove();
            });
        }, duration);
    }

    static getIcon(type) {
        const icons = {
            [this.types.SUCCESS]: 'fa-check-circle',
            [this.types.ERROR]: 'fa-exclamation-circle',
            [this.types.INFO]: 'fa-info-circle'
        };
        return icons[type] || icons[this.types.INFO];
    }
}

// Add QueueModal class
class QueueModal {
    constructor(gameManager, eventBus) {
        this.gameManager = gameManager;
        this.eventBus = eventBus;
        this.element = document.getElementById('queueModal');
        this.selectedPlayers = new Set();
        this.currentCourt = null;
        this.initialize();
    }

    initialize() {
        // Close button
        this.element.querySelector('.close-btn').addEventListener('click', () => this.hide());
        
        // Cancel button
        document.getElementById('cancelQueue').addEventListener('click', () => this.hide());
        
        // Confirm button
        document.getElementById('confirmQueue').addEventListener('click', () => this.confirmSelection());
        
        // Player selection
        const playersList = document.getElementById('queuePlayersList');
        playersList.addEventListener('click', (e) => {
            const playerChip = e.target.closest('.player-chip');
            if (playerChip) {
                this.togglePlayerSelection(playerChip);
            }
        });

        // Search functionality
        const searchInput = document.getElementById('queueSearchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.filterPlayers(e.target.value);
            });
        }

        // Sort buttons
        const sortBtns = this.element.querySelectorAll('.sort-btn');
        sortBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                sortBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.sortPlayers(btn.dataset.sort);
            });
        });
    }

    show(court) {
        this.currentCourt = court;
        this.selectedPlayers.clear();
        this.element.classList.add('active');
        
        // Initial render with all players sorted by name
        this.sortPlayers('name');
    }

    hide() {
        this.element.classList.remove('active');
        this.selectedPlayers.clear();
        this.currentCourt = null;
    }

    updateSelectedCount() {
        const countElement = this.element.querySelector('.selected-count');
        if (countElement) {
            const total = this.selectedPlayers.size;
            countElement.innerHTML = `<span>Selected Players (${total}/4)</span>`;
            countElement.classList.toggle('full', total === 4);
        }
    }

    togglePlayerSelection(chipElement) {
        const playerId = chipElement.dataset.playerId;
        
        if (this.selectedPlayers.has(playerId)) {
            this.selectedPlayers.delete(playerId);
        } else if (this.selectedPlayers.size < 4) {
            this.selectedPlayers.add(playerId);
        } else {
            Toast.show('Maximum 4 players can be selected', Toast.types.WARNING);
            return;
        }

        this.updateUI();
    }

    updateUI() {
        // Update available players list
        this.sortPlayers('name');

        // Update selected count
        this.updateSelectedCount();
    }

    renderPlayers(players) {
        const container = document.getElementById('queuePlayersList');
        if (!container) return;

        if (players.length === 0) {
            container.innerHTML = this.renderEmptyState();
            return;
        }

        container.innerHTML = players
            .map(player => this.renderPlayerChip(player))
            .join('');
    }

    renderPlayerChip(player) {
        const isSelected = this.selectedPlayers.has(player.id);
        const isFull = this.selectedPlayers.size >= 4;
        const disabledClass = (!isSelected && isFull) ? 'disabled' : '';
        
        const statusLabel = player.status === 'playing' ? '🎮 In Game' : 
                          player.status === 'queued' ? '⏳ In Queue' : '';
        
        return `
            <div class="player-chip ${isSelected ? 'selected' : ''} ${disabledClass}" 
                 data-player-id="${player.id}">
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <div class="player-stats">
                        <span class="games-played">
                            <i class="fas fa-trophy"></i>
                            ${player.gamesPlayed} games
                        </span>
                        ${player.lastGameTime ? `
                            <span class="last-game-time">
                                <i class="fas fa-clock"></i>
                                ${this.formatLastGameTime(player.lastGameTime)}
                            </span>
                        ` : ''}
                        ${statusLabel ? `
                            <span class="player-current-status">
                                ${statusLabel}
                            </span>
                        ` : ''}
                    </div>
                </div>
                <div class="selection-indicator">
                    ${isSelected ? 'Selected' : 'Select'}
                </div>
            </div>
        `;
    }

    renderEmptyState() {
        return `
            <div class="empty-state">
                <i class="fas fa-users-slash"></i>
                <p>No players found</p>
                <span>Try adjusting your search</span>
            </div>
        `;
    }

    confirmSelection() {
        if (this.selectedPlayers.size === 4 && this.currentCourt) {
            const playerIds = Array.from(this.selectedPlayers);
            this.gameManager.addToQueue(this.currentCourt.id, playerIds);
            Toast.show('Players added to queue', Toast.types.SUCCESS);
            this.hide();
        } else {
            Toast.show('Please select exactly 4 players', Toast.types.WARNING);
        }
    }

    sortPlayers(criteria) {
        let allPlayers = Array.from(this.gameManager.players.values());
        
        switch(criteria) {
            case 'games':
                allPlayers.sort((a, b) => b.gamesPlayed - a.gamesPlayed);
                break;
            case 'recent':
                allPlayers.sort((a, b) => {
                    if (!a.lastGameTime) return 1;
                    if (!b.lastGameTime) return -1;
                    return b.lastGameTime - a.lastGameTime;
                });
                break;
            default: // 'name'
                allPlayers.sort((a, b) => a.name.localeCompare(b.name));
        }

        this.renderPlayers(allPlayers);
    }

    filterPlayers(searchTerm) {
        const players = Array.from(this.gameManager.players.values());
        const filtered = players.filter(player => 
            player.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderPlayers(filtered);
    }

    formatLastGameTime(timestamp) {
        if (!timestamp) return null;
        
        const minutes = Math.floor((Date.now() - timestamp) / 60000);
        
        if (minutes < 60) {
            return `${minutes}m ago`;
        }
        
        const hours = Math.floor(minutes / 60);
        if (hours < 24) {
            return `${hours}h ago`;
        }
        
        return `${Math.floor(hours / 24)}d ago`;
    }
}

function renderQueueActionButtons(court) {
    const container = court.querySelector('.queue-action-container');
    container.innerHTML = `
        <button class="add-to-queue-btn">
            <i class="fas fa-plus"></i>
            Add to Queue
        </button>
        ${court.classList.contains('active') ? `
            <button class="complete-game-btn">
                <i class="fas fa-flag-checkered"></i>
                Complete Game
            </button>
        ` : ''}
    `;
}