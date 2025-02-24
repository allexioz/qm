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
        this.processingMagicQueue = false;
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
        console.group('🎮 Starting Game');
        this.status = 'in_progress';
        this.startTime = Date.now();
        console.log('Game started at:', this.startTime);
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
        if (!this.startTime) return null;
        
        const elapsed = Math.floor((Date.now() - this.startTime) / 1000);
        const minutes = Math.floor(elapsed / 60);
        const seconds = elapsed % 60;

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
    constructor(storageKey) {
        this.storageKey = storageKey;
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
        this.storage = storage;
        this.eventBus = eventBus;
        this.courts = new Map();
        this.players = new Map();
        
        // First register event handlers
        this.registerEventHandlers();
        
        // Then load state and emit initial events
        this.loadState();
        
        // Emit initial state events
        this.emitInitialState();
        
        console.groupEnd();
    }

    registerEventHandlers() {
        // Register any internal event handlers here
        this.eventBus.on('player:added', (player) => {
            this.saveState();
        });
        
        this.eventBus.on('court:updated', (court) => {
            this.saveState();
        });
    }

    emitInitialState() {
        // Emit initial state events
        this.eventBus.emit('players:updated');
        this.courts.forEach(court => {
            this.eventBus.emit('court:updated', court);
        });
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

        // Restore timers for in-progress games
        this.restoreTimers();
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
        console.group('🎮 Assigning player to court');
        console.log('Player ID:', playerId, 'Court ID:', courtId);
        
        const player = this.players.get(playerId);
        const court = this.courts.get(courtId);
        
        if (!player || !court) {
            console.error('Player or court not found');
            console.groupEnd();
            return;
        }

        // Update player status
        player.status = 'waiting';
        player.courtId = courtId;
        
        // Add to court
        court.addPlayer(player);
        
        // Save and emit events
        this.saveState();
        this.eventBus.emit('court:updated', court);
        this.eventBus.emit('players:updated');
        
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
            
            // Update player statuses and increment games count
            court.players.forEach(player => {
                const oldStatus = player.status;
                player.status = 'playing';
                player.gamesPlayed++;
                player.lastGameTime = Date.now();
                console.log(`Player ${player.name}: ${oldStatus} -> ${player.status} (Games: ${player.gamesPlayed})`);
            });

            // Save state before emitting events
            this.saveState();

            // Emit events after state is saved
            Toast.show('Game started!', Toast.types.SUCCESS);
            this.eventBus.emit('game:started', court);
            this.eventBus.emit('players:updated');
            
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
        console.group('🔄 Resetting all data');
        
        // Clear players
        this.players.clear();
        
        // Reset courts
        this.courts.forEach(court => {
            // Stop any running timers
            if (court.timerId) {
                clearInterval(court.timerId);
                court.timerId = null;
            }
            
            court.players = [];
            court.status = 'empty';
            court.startTime = null;
            court.queue = [];
        });

        // Save empty state
        this.saveState();
        
        // Emit events in correct order
        this.courts.forEach(court => {
            this.eventBus.emit('court:updated', court);
        });
        this.eventBus.emit('players:updated');
        
        console.log('✅ All data reset successfully');
        console.groupEnd();
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
        console.log('Court ID:', courtId);
        console.log('Player IDs:', playerIds);
        
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
                // Update player status to queued
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

        console.log('Final court queue:', court.queue.map(p => p.name));
        console.groupEnd();
    }

    getQueueablePlayers() {
        return Array.from(this.players.values())
            .filter(player => 
                player.status === 'nogames' || 
                player.status === 'waiting' || 
                player.status === 'resting' && 
                !player.courtId // Ensure player isn't assigned to any court
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

    // Add method to restore timers after page load
    restoreTimers() {
        this.courts.forEach(court => {
            if (court.status === 'in_progress' && court.startTime) {
                this.eventBus.emit('game:started', court);
            }
        });
    }

    getMagicQueuePlayers(courtId) {
        console.group('🎯 getMagicQueuePlayers');
        console.log('Court ID:', courtId);

        // Get all players
        const allPlayers = Array.from(this.players.values());
        console.log('Total players:', allPlayers.length);

        // Sort players by priority
        const sortedPlayers = allPlayers.sort((a, b) => {
            // First priority: Players with 0 games
            if (a.gamesPlayed === 0 && b.gamesPlayed > 0) return -1;
            if (b.gamesPlayed === 0 && a.gamesPlayed > 0) return 1;

            // Second priority: Time since last game
            const aTime = a.lastGameTime || 0;
            const bTime = b.lastGameTime || 0;
            return aTime - bTime;
        });

        // Take top 4 players
        const selectedPlayers = sortedPlayers.slice(0, 4);
        console.log('Selected players:', selectedPlayers.map(p => p.name));

        // Check if we have enough players
        if (selectedPlayers.length < 4) {
            console.warn('Not enough players');
            console.groupEnd();
            Toast.show('Not enough players for a game', Toast.types.WARNING);
            return null;
        }

        console.groupEnd();
        return selectedPlayers;
    }

    handleMagicQueue(courtId) {
        console.group('✨ handleMagicQueue');
        console.log('Court ID:', courtId);
        
        const court = this.courts.get(courtId);
        if (!court) {
            console.warn('Court not found');
            console.groupEnd();
            return;
        }

        // Prevent multiple executions while processing
        if (court.processingMagicQueue) {
            console.warn('Magic Queue already processing');
            console.groupEnd();
            return;
        }
        court.processingMagicQueue = true;

        try {
            // Get the players using existing magic queue logic
            const players = this.getMagicQueuePlayers(courtId);
            if (!players) {
                console.warn('No players returned from getMagicQueuePlayers');
                console.groupEnd();
                return;
            }

            // Only start game directly if court is empty
            if (court.status === 'empty') {
                console.log('Starting game directly with:', players.map(p => p.name));
                
                // Assign players directly to court
                players.forEach(player => {
                    player.status = 'playing';
                    player.courtId = courtId;
                });
                court.players = players;
                court.status = 'ready';

                // Start the game immediately
                this.startGame(courtId);

                const playerNames = players.map(p => p.name).join(', ');
                Toast.show(`✨ Started game with: ${playerNames}`, Toast.types.SUCCESS);
            } else if (court.status === 'in_progress') {
                // Add to queue if game is in progress
                console.log('Game in progress, adding players to queue:', players.map(p => p.name));
                this.addToQueue(courtId, players.map(p => p.id));
                
                const playerNames = players.map(p => p.name).join(', ');
                Toast.show(`✨ Magic Queue created with: ${playerNames}`, Toast.types.SUCCESS);
            } else if (court.status === 'ready') {
                // If court is ready (has players waiting to start), just start the game
                console.log('Starting game with existing players:', court.players.map(p => p.name));
                this.startGame(courtId);
                Toast.show('✨ Game started!', Toast.types.SUCCESS);
            }
        } finally {
            court.processingMagicQueue = false;
            console.groupEnd();
        }
    }
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    console.group('🚀 Application Initialization');
    
    // First create event bus and register global event handlers
    const eventBus = new EventBus();
    
    // Create storage
    const storage = new LocalStorage('gameState');
    
    // Create game manager first
    const gameManager = new GameManager(storage, eventBus);
    
    // Initialize UI components with gameManager and event bus
    const playerListView = new PlayerListView(gameManager, eventBus);
    const queueModal = new QueueModal(gameManager, eventBus);
    const quickAddModal = new QuickAddModal(gameManager, eventBus);
    
    // Initialize courts with gradients
    const courtsContainer = document.querySelector('.courts-container');
    const courtViews = new Map();
    
    ['court-1', 'court-2'].forEach(courtId => {
        try {
            const court = gameManager.courts.get(courtId);
            const courtView = new CourtView(court, gameManager, eventBus);
            courtView.mount(courtsContainer);
            courtViews.set(courtId, courtView);
            console.log(`✅ Court ${courtId} mounted successfully`);
        } catch (error) {
            console.error(`Failed to mount court ${courtId}:`, error);
        }
    });

    // Register global event handlers
    eventBus.on('court:quickAdd', (court) => {
        quickAddModal.show(court);
    });

    eventBus.on('court:addToQueue', (court) => {
        queueModal.show(court);
    });

    eventBus.on('players:assigned', ({courtId, playerIds}) => {
        playerIds.forEach(playerId => {
            gameManager.assignPlayerToCourt(playerId, courtId);
        });
    });

    eventBus.on('court:startGame', (court) => {
        gameManager.startGame(court.id);
    });

    // Add back critical court update handlers
    eventBus.on('court:updated', (court) => {
        console.log('🎾 Court updated:', court.id);
        const view = courtViews.get(court.id);
        if (view) {
            view.render();
        }
    });

    eventBus.on('game:started', (court) => {
        console.log('🎲 Game started on court:', court.id);
        const view = courtViews.get(court.id);
        if (view) {
            view.render();
            view.startGameTimer();
        }
    });

    // Add event handler for game completion
    eventBus.on('game:completed', (court) => {
        console.log('🏁 Game completed on court:', court.id);
        const view = courtViews.get(court.id);
        if (view) {
            view.render();
        }
    });
    
    // Now set the game manager for all components
    playerListView.setGameManager(gameManager);
    queueModal.setGameManager(gameManager);
    quickAddModal.setGameManager(gameManager);

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
    const color1 = `hsl(${palette.h1}, ${75 + Math.random() * 5}%, ${60 + Math.random() * 5}%)`;
    const color2 = `hsl(${palette.h2}, ${70 + Math.random() * 5}%, ${70 + Math.random() * 4}%)`;
    const color3 = `hsl(${palette.h3}, ${52 + Math.random() * 5}%, ${62 + Math.random() * 4}%)`;
    
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
        this.listenersAttached = false;
        this.initialize();
    }

    initialize() {
        // Create the court element
        this.element = document.createElement('div');
        this.element.className = `court-2d ${this.court.status}`;
        this.element.dataset.courtId = this.court.id;
        
        // Apply initial gradient
        this.applyGradient();
        
        // Initial render
        this.render();
        
        // Attach event listeners
        this.attachEventListeners();

        // Listen for game started event
        this.eventBus.on('game:started', (court) => {
            if (court.id === this.court.id) {
                this.startGameTimer();
                this.render();
            }
        });

        // Listen for game completed event
        this.eventBus.on('game:completed', (court) => {
            if (court.id === this.court.id) {
                this.stopGameTimer();
                this.render();
            }
        });
    }

    // Add gradient generation methods
    generateCourtGradient() {
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
        const color1 = `hsl(${palette.h1}, ${75 + Math.random() * 5}%, ${60 + Math.random() * 5}%)`;
        const color2 = `hsl(${palette.h2}, ${70 + Math.random() * 5}%, ${70 + Math.random() * 4}%)`;
        const color3 = `hsl(${palette.h3}, ${52 + Math.random() * 5}%, ${62 + Math.random() * 4}%)`;
        
        return {
            gradient1: color1,
            gradient2: color2,
            gradient3: color3
        };
    }

    applyGradient() {
        const colors = this.generateCourtGradient();
        this.element.style.setProperty('--court-gradient-1', colors.gradient1);
        this.element.style.setProperty('--court-gradient-2', colors.gradient2);
        this.element.style.setProperty('--court-gradient-3', colors.gradient3);
    }

    render() {
        console.group(`🎾 Rendering court ${this.court.id}`);
        
        // Preserve the current gradients
        const currentGradients = {
            g1: this.element.style.getPropertyValue('--court-gradient-1'),
            g2: this.element.style.getPropertyValue('--court-gradient-2'),
            g3: this.element.style.getPropertyValue('--court-gradient-3')
        };

        // Update the content
        this.element.className = `court-2d ${this.court.status}`;
        this.element.innerHTML = `
            <div class="court-simulation">
                ${this.renderHeader()}
                ${this.renderContent()}
            </div>
            <div class="court-bottom-section">
                ${this.renderActions()}
            </div>
        `;

        // Reapply the gradients
        if (currentGradients.g1) {
            this.element.style.setProperty('--court-gradient-1', currentGradients.g1);
            this.element.style.setProperty('--court-gradient-2', currentGradients.g2);
            this.element.style.setProperty('--court-gradient-3', currentGradients.g3);
        } else {
            this.applyGradient();
        }

        // If game is in progress, start the timer
        if (this.court.status === 'in_progress' && this.court.startTime) {
            this.startGameTimer();
        }

        console.groupEnd();
    }

    mount(container) {
        container.appendChild(this.element);
    }

    renderHeader() {
        const statusText = this.getStatusText();
        const timeDisplay = this.court.status === 'in_progress' ? 
            `<span class="time-elapsed">0:00</span>` : '';

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

    startGameTimer() {
        console.group('⏱️ Starting Game Timer');
        
        // Clear any existing timer
        if (this.court.timerId) {
            clearInterval(this.court.timerId);
        }

        // Start a new timer
        this.court.timerId = setInterval(() => {
            this.updateTimeDisplay();
        }, 1000);

        // Initial update
        this.updateTimeDisplay();
        
        console.log('Timer started with ID:', this.court.timerId);
        console.groupEnd();
    }

    updateTimeDisplay() {
        const elapsed = this.court.getElapsedTime();
        if (!elapsed) return;

        const timeDisplay = this.element.querySelector('.time-elapsed');
        if (timeDisplay) {
            timeDisplay.textContent = `${elapsed.minutes}:${elapsed.seconds.toString().padStart(2, '0')}`;
        }
    }

    attachEventListeners() {
        if (!this.element || this.listenersAttached) {
            return;
        }

        console.group('🎯 Attaching court event listeners');

        this.element.addEventListener('click', (e) => {
            // Handle all button clicks through data-action
            const actionButton = e.target.closest('[data-action], .add-to-queue-btn, .complete-game-btn, .start-game-btn');
            if (!actionButton) return;

            console.group('🎯 Court Action Clicked');
            console.log('Button clicked:', actionButton);

            if (actionButton.classList.contains('start-game-btn')) {
                console.log('Start game button clicked');
                this.gameManager.startGame(this.court.id);
            } else if (actionButton.classList.contains('add-to-queue-btn')) {
                console.log('Queue button clicked');
                this.eventBus.emit('court:addToQueue', this.court);
            } else if (actionButton.classList.contains('complete-game-btn')) {
                console.log('Complete game button clicked');
                this.gameManager.completeGame(this.court.id);
            } else {
                const action = actionButton.dataset.action;
                console.log('Action:', action);
                console.log('Court ID:', this.court.id);

                switch (action) {
                    case 'magic-queue':
                        console.log('Triggering magic queue');
                        this.gameManager.handleMagicQueue(this.court.id);
                        break;
                    case 'quick-add':
                        this.eventBus.emit('court:quickAdd', this.court);
                        break;
                }
            }
            console.groupEnd();
        });

        this.listenersAttached = true;
        console.groupEnd();
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

    renderContent() {
        return `
            <div class="court-content">
                ${this.renderTeamSection('a')}
                ${this.renderCourtLines()}
                ${this.renderTeamSection('b')}
            </div>
        `;
    }

    renderTeamSection(team) {
        const players = team === 'a' ? 
            this.court.players.slice(0, 2) : 
            this.court.players.slice(2, 4);

        // Add debug logging
        console.log(`Rendering team ${team}:`, players);

        return `
            <div class="team-section team-${team}" style="display: ${players.length ? 'block' : 'none'}">
                <div class="team-info">
                    <div class="team-players">
                        ${this.renderPlayers(players)}
                    </div>
                </div>
            </div>
        `;
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

    renderActions() {
        let primaryButton = '';
        let queueButton = '';
        let completeButton = '';
        
        if (this.court.status === 'ready') {
            primaryButton = `
                <button class="start-game-btn">
                    <i class="fas fa-play"></i>
                    Start Game
                </button>
            `;
        } else if (this.court.status === 'empty' || this.court.players.length < 4) {
            const remainingSlots = 4 - this.court.players.length;
            primaryButton = `
                <button class="quick-add-btn" data-action="quick-add">
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
                <button class="court-button add-to-queue-btn" data-action="queue">
                    <i class="fas fa-plus"></i>
                    Queue
                </button>
            `;
        }

        const magicQueueButton = `
            <button class="action-btn magic-queue-btn" data-action="magic-queue">
                <i class="fas fa-wand-magic-sparkles"></i>
                Magic Queue
            </button>`;

        return `
            <div class="court-actions">
                ${primaryButton}
                ${completeButton}
                ${queueButton}
                ${magicQueueButton}
                ${this.renderQueueSection()}
            </div>
        `;
    }

    renderQueueSection() {
        if (!this.court.queue.length) return '';

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
}

class QuickAddModal {
    constructor(gameManager, eventBus) {
        this.gameManager = gameManager;
        this.eventBus = eventBus;
        this.element = null;
        this.selectedPlayers = new Set();
        this.currentCourt = null;
        
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initialize());
        } else {
            this.initialize();
        }
    }

    initialize() {
        console.group('🎯 Initializing Quick Add Modal');
        
        this.element = document.getElementById('quickAddModal');
        if (!this.element) {
            console.error('Quick Add Modal element not found');
            console.groupEnd();
            return;
        }

        // Close button
        const closeBtn = this.element.querySelector('.close-btn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.hide());
        }
        
        // Cancel button
        const cancelBtn = document.getElementById('cancelQuickAdd');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => this.hide());
        }
        
        // Confirm button
        const confirmBtn = document.getElementById('confirmQuickAdd');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.confirmSelection());
        }
        
        // Player selection
        const playersList = document.getElementById('quickAddPlayersList');
        if (playersList) {
            playersList.addEventListener('click', (e) => {
                const playerChip = e.target.closest('.player-chip');
                if (playerChip) {
                    this.togglePlayerSelection(playerChip);
                }
            });
        }

        // Search functionality
        const searchInput = document.getElementById('quickAddSearchInput');
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

        // Add listeners for player status changes
        this.eventBus.on('players:updated', () => {
            if (this.element && this.element.classList.contains('active')) {
                console.log('Refreshing available players after status update');
                this.refreshAvailablePlayers();
            }
        });

        console.log('Quick Add Modal initialized successfully');
        console.groupEnd();
    }

    renderPlayers(players) {
        console.group('📋 Updating Available Players List');
        console.log('Players to render:', players);

        const playersList = document.getElementById('quickAddPlayersList');
        if (!playersList) {
            console.error('Quick add players list element not found');
            console.groupEnd();
            return;
        }

        if (!players || players.length === 0) {
            playersList.innerHTML = this.renderEmptyState();
            console.groupEnd();
            return;
        }

        // Match the Queue Modal's simpler, cleaner design
        playersList.innerHTML = players.map(player => `
            <div class="player-chip ${this.selectedPlayers.has(player.id) ? 'selected' : ''}" 
                 data-player-id="${player.id}">
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <span class="player-stats">
                        Games: ${player.gamesPlayed} | 
                        Status: ${formatPlayerStatus(player.status)}
                    </span>
                </div>
                <div class="selection-indicator">
                    <i class="fas fa-check"></i>
                </div>
            </div>
        `).join('');

        console.log('Players rendered:', players.length);
        console.groupEnd();
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

    updateSelectedCount() {
        const countDisplay = this.element.querySelector('.selected-count span');
        if (countDisplay) {
            countDisplay.textContent = `Selected Players (${this.selectedPlayers.size}/4)`;
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

    confirmSelection() {
        if (this.currentCourt) {
            const playerIds = Array.from(this.selectedPlayers);
            playerIds.forEach(playerId => {
                this.gameManager.assignPlayerToCourt(playerId, this.currentCourt.id);
            });
            Toast.show('Players added to court', Toast.types.SUCCESS);
            this.hide();
        }
    }

    sortPlayers(criteria) {
        let allPlayers = this.gameManager.getAvailablePlayers();
        
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
        const players = this.gameManager.getAvailablePlayers();
        const filtered = players.filter(player => 
            player.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderPlayers(filtered);
    }

    show(court) {
        this.currentCourt = court;
        this.selectedPlayers.clear();
        this.element.classList.add('active');
        this.refreshAvailablePlayers();
    }

    hide() {
        this.element.classList.remove('active');
        this.selectedPlayers.clear();
        this.currentCourt = null;
    }

    refreshAvailablePlayers() {
        // Get ALL players for manual override functionality
        const availablePlayers = this.gameManager.getAvailablePlayers();
        console.log('Available players for quick add:', availablePlayers);
        
        // Render the players
        this.renderPlayers(availablePlayers);
        
        // Update selected count display
        this.updateSelectedCount();
    }

    updateUI() {
        // Update available players list
        this.sortPlayers('name');

        // Update selected count
        this.updateSelectedCount();
    }

    setGameManager(gameManager) {
        this.gameManager = gameManager;
        this.updateUI(); // Initial render
    }
}

// New PlayerListView component
class PlayerListView {
    constructor(gameManager, eventBus) {
        this.gameManager = gameManager;
        this.eventBus = eventBus;
        
        // Only initialize if we have a gameManager
        if (gameManager) {
            this.initialize();
        }
        
        // Register event listeners regardless of gameManager
        this.registerEventListeners();
    }

    registerEventListeners() {
        // Listen for players:updated event
        this.eventBus.on('players:updated', () => {
            this.updatePlayersList();
        });
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
                    if (!this.gameManager) return;
                    
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
                    if (!this.gameManager) return;
                    
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
        if (!this.gameManager) return;
        
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

    setGameManager(gameManager) {
        this.gameManager = gameManager;
        this.updateUI(); // Initial render
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

// Toast notification system
class Toast {
    static types = {
        SUCCESS: 'success',
        ERROR: 'error',
        WARNING: 'warning',
        INFO: 'info'
    };

    static show(message, type = 'info') {
        const container = document.querySelector('.toast-container') || Toast.createContainer();
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.innerHTML = `
            <div class="toast-content">${message}</div>
            <div class="toast-progress"></div>
        `;

        container.appendChild(toast);

        // Animate progress bar
        const progress = toast.querySelector('.toast-progress');
        progress.style.animation = 'toast-progress 3s linear forwards';

        // Remove toast after animation
        setTimeout(() => {
            toast.classList.add('toast-fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    static createContainer() {
        const container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
        return container;
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

        // Add listeners for player status changes
        this.eventBus.on('players:updated', () => {
            if (this.element.classList.contains('active')) {
                console.log('Refreshing available players after status update');
                this.refreshAvailablePlayers();
            }
        });
    }

    show(court) {
        this.currentCourt = court;
        this.selectedPlayers.clear();
        this.element.classList.add('active');
        this.refreshAvailablePlayers();
    }

    hide() {
        this.element.classList.remove('active');
        this.selectedPlayers.clear();
        this.currentCourt = null;
    }

    refreshAvailablePlayers() {
        // Get ALL players for manual override functionality
        const availablePlayers = this.gameManager.getAvailablePlayers();
        console.log('Available players for queue:', availablePlayers);
        
        // Render the players
        this.renderPlayers(availablePlayers);
        
        // Update selected count display
        this.updateSelectedCount();
    }

    updateSelectedCount() {
        const countDisplay = this.element.querySelector('.selected-count span');
        if (countDisplay) {
            countDisplay.textContent = `Selected Players (${this.selectedPlayers.size}/4)`;
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
        console.group('📋 Updating Available Players List');
        console.log('Players to render:', players);

        const playersList = document.getElementById('queuePlayersList');
        if (!playersList) {
            console.error('Queue players list element not found');
            console.groupEnd();
            return;
        }

        if (!players || players.length === 0) {
            playersList.innerHTML = this.renderEmptyState();
            console.groupEnd();
            return;
        }

        playersList.innerHTML = players.map(player => `
            <div class="player-chip ${this.selectedPlayers.has(player.id) ? 'selected' : ''}" 
                 data-player-id="${player.id}">
                <div class="player-info">
                    <span class="player-name">${player.name}</span>
                    <span class="player-stats">
                        Games: ${player.gamesPlayed} | 
                        Status: ${formatPlayerStatus(player.status)}
                    </span>
                </div>
                <div class="selection-indicator">
                    <i class="fas fa-check"></i>
                </div>
            </div>
        `).join('');

        console.log('Players rendered:', players.length);
        console.groupEnd();
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
        let allPlayers = this.gameManager.getAvailablePlayers();
        
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
        const players = this.gameManager.getAvailablePlayers();
        const filtered = players.filter(player => 
            player.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        this.renderPlayers(filtered);
    }

    setGameManager(gameManager) {
        this.gameManager = gameManager;
        this.updateUI(); // Initial render
    }
}

function renderQueueActionButtons(court) {
    const container = court.querySelector('.queue-action-container');
    container.innerHTML = `
        <button class="add-to-queue-btn" data-action="queue">
            <i class="fas fa-plus"></i>
            Add to Queue
        </button>
        ${court.classList.contains('active') ? `
            <button class="complete-game-btn" data-action="complete">
                <i class="fas fa-flag-checkered"></i>
                Complete Game
            </button>
        ` : ''}
    `;
}

// Add at the start of your initialization code
const APP_VERSION = '1.0.1'; // Match with CACHE_VERSION in sw.js

// Add version checking on load
async function checkVersion() {
    try {
        const response = await fetch(`version.json?t=${Date.now()}`);
        const { version } = await response.json();
        
        if (version !== APP_VERSION) {
            // Clear all caches
            if ('caches' in window) {
                const cacheNames = await caches.keys();
                await Promise.all(
                    cacheNames.map(cacheName => caches.delete(cacheName))
                );
            }
            
            // Clear localStorage
            localStorage.clear();
            
            // Unregister service worker
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                await Promise.all(
                    registrations.map(registration => registration.unregister())
                );
            }
            
            // Force reload from server
            window.location.reload(true);
        }
    } catch (error) {
        console.error('Version check failed:', error);
    }
}

// Check version on load and periodically
window.addEventListener('load', checkVersion);
setInterval(checkVersion, 5 * 60 * 1000); // Check every 5 minutes

// Add reload button to UI
function addReloadButton() {
    const button = document.createElement('button');
    button.textContent = '🔄 Force Refresh';
    button.className = 'force-refresh-btn';
    button.onclick = async () => {
        // Clear all browser caches
        if ('caches' in window) {
            const cacheNames = await caches.keys();
            await Promise.all(
                cacheNames.map(cacheName => caches.delete(cacheName))
            );
        }
        
        // Force reload from server
        window.location.reload(true);
    };
    document.body.appendChild(button);
}

// After your existing service worker registration code
window.addEventListener('online', () => {
    Toast.show('Back online', Toast.types.SUCCESS);
    // Sync any pending changes
    syncPendingChanges();
});

window.addEventListener('offline', () => {
    Toast.show('Working offline', Toast.types.INFO);
});

// Function to handle pending changes when offline
function syncPendingChanges() {
    const pendingChanges = localStorage.getItem('pendingChanges');
    if (pendingChanges) {
        try {
            const changes = JSON.parse(pendingChanges);
            // Process pending changes here
            localStorage.removeItem('pendingChanges');
        } catch (error) {
            console.error('Error syncing pending changes:', error);
        }
    }
}

// Add beforeinstallprompt handler for custom install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Optionally show your own install button/prompt
});