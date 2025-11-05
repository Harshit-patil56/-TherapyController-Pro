/**
 * TherapyController Pro - Industry-Grade Massage Therapy Application
 * @version 2.0.0
 * @description Professional gamepad vibration therapy system with advanced features
 */

class TherapyControllerPro {
    constructor() {
        // Core state
        this.gamepad = null;
        this.gamepadIndex = -1;
        this.isSessionActive = false;
        this.isPaused = false;
        this.currentTherapy = null;
        
        // Session tracking
        this.sessionStartTime = null;
        this.sessionDuration = 0;
        this.patternCount = 0;
        this.sessionHistory = [];
        
        // Session configuration
        this.selectedDuration = 600; // 10 minutes default
        this.breathingEnabled = true;
        this.breathingPattern = '4-7-8';
        this.pendingTherapy = null;
        this.pendingButton = null;
        
        // Breathing state
        this.breathingCycleCount = 0;
        this.breathingInterval = null;
        
        // Settings
        this.settings = this.loadSettings();
        this.currentTab = 'therapy';
        
        // Animation frame ID
        this.animationId = null;
        this.sessionTimerId = null;
        
        // Initialize application
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('TherapyController Pro initializing...');
        this.bindEvents();
        this.applyTheme();
        this.startGamepadLoop();
        this.loadSessionHistory();
        this.checkFirstVisit();
        this.rotateRandomTips();
        console.log('Application ready. Connect your controller to begin.');
    }

    /**
     * Load settings from localStorage
     */
    loadSettings() {
        const defaultSettings = {
            theme: 'light',
            soundEnabled: true,
            hapticIntensity: 1.0,
            autoSave: true,
            safetyTimeout: 20 * 60 * 1000, // 20 minutes
            confirmStop: true
        };

        try {
            const saved = localStorage.getItem('therapyControllerSettings');
            return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
        } catch (error) {
            console.warn('Failed to load settings, using defaults');
            return defaultSettings;
        }
    }

    /**
     * Save settings to localStorage
     */
    saveSettings() {
        try {
            localStorage.setItem('therapyControllerSettings', JSON.stringify(this.settings));
        } catch (error) {
            console.error('Failed to save settings');
        }
    }

    /**
     * Load session history from localStorage
     */
    loadSessionHistory() {
        try {
            const history = localStorage.getItem('therapySessionHistory');
            this.sessionHistory = history ? JSON.parse(history) : [];
        } catch (error) {
            console.warn('Failed to load session history');
            this.sessionHistory = [];
        }
    }

    /**
     * Save session to history
     */
    saveSessionToHistory(sessionData) {
        this.sessionHistory.unshift({
            ...sessionData,
            timestamp: new Date().toISOString()
        });

        // Keep only last 50 sessions
        if (this.sessionHistory.length > 50) {
            this.sessionHistory = this.sessionHistory.slice(0, 50);
        }

        try {
            localStorage.setItem('therapySessionHistory', JSON.stringify(this.sessionHistory));
        } catch (error) {
            console.error('Failed to save session history');
        }
    }

    /**
     * Bind all event listeners
     */
    bindEvents() {
        // Gamepad events
        window.addEventListener('gamepadconnected', (e) => this.onGamepadConnected(e));
        window.addEventListener('gamepaddisconnected', (e) => this.onGamepadDisconnected(e));

        // Navigation tabs
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.addEventListener('click', (e) => this.switchTab(e.target.closest('.nav-tab').dataset.tab));
        });

        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }

        // Quick actions
        const emergencyStop = document.getElementById('emergency-stop');
        if (emergencyStop) {
            emergencyStop.addEventListener('click', () => this.emergencyStop());
        }

        const quickTest = document.getElementById('quick-test');
        if (quickTest) {
            quickTest.addEventListener('click', () => this.quickTest());
        }

        // Therapy cards
        document.querySelectorAll('.therapy-card').forEach(card => {
            const btn = card.querySelector('.therapy-btn');
            const therapy = card.dataset.therapy;
            
            if (btn && therapy) {
                btn.addEventListener('click', () => this.startTherapy(therapy, btn));
            }
        });

        // Session controls
        const closeSession = document.getElementById('close-session');
        if (closeSession) {
            closeSession.addEventListener('click', () => this.hideSessionOverlay());
        }

        const stopSession = document.getElementById('stop-session');
        if (stopSession) {
            stopSession.addEventListener('click', () => this.stopSession());
        }

        const pauseSession = document.getElementById('pause-session');
        if (pauseSession) {
            pauseSession.addEventListener('click', () => this.togglePause());
        }

        // Settings
        const themeSelect = document.getElementById('theme-select');
        if (themeSelect) {
            themeSelect.value = this.settings.theme;
            themeSelect.addEventListener('change', (e) => {
                this.settings.theme = e.target.value;
                this.saveSettings();
                this.applyTheme();
            });
        }

        // Session Setup Dialog
        this.bindSetupDialog();
    }

    /**
     * Bind session setup dialog events
     */
    bindSetupDialog() {
        // Duration presets
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedDuration = parseInt(btn.dataset.duration);
                document.getElementById('custom-duration').value = '';
            });
        });

        // Custom duration
        const customDuration = document.getElementById('custom-duration');
        if (customDuration) {
            customDuration.addEventListener('input', (e) => {
                if (e.target.value) {
                    document.querySelectorAll('.preset-btn').forEach(b => b.classList.remove('active'));
                    this.selectedDuration = parseInt(e.target.value) * 60; // Convert to seconds
                }
            });
        }

        // Breathing choice cards
        document.querySelectorAll('.choice-card').forEach(card => {
            card.addEventListener('click', () => {
                document.querySelectorAll('.choice-card').forEach(c => c.classList.remove('active'));
                card.classList.add('active');
                this.breathingEnabled = card.dataset.breathing === 'enabled';
                const patternsSection = document.getElementById('breathing-patterns');
                if (patternsSection) {
                    patternsSection.style.display = this.breathingEnabled ? 'block' : 'none';
                }
            });
        });

        // Breathing pattern selection
        document.querySelectorAll('input[name="breathing-pattern"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                this.breathingPattern = e.target.value;
            });
        });

        // Cancel duration setup
        const cancelDuration = document.getElementById('cancel-duration');
        if (cancelDuration) {
            cancelDuration.addEventListener('click', () => this.hideDurationSetup());
        }

        // Next to breathing setup
        const nextToBreathing = document.getElementById('next-to-breathing');
        if (nextToBreathing) {
            nextToBreathing.addEventListener('click', () => this.showBreathingSetup());
        }

        // Back to duration
        const backToDuration = document.getElementById('back-to-duration');
        if (backToDuration) {
            backToDuration.addEventListener('click', () => this.backToDuration());
        }

        // Start session
        const startSessionFinal = document.getElementById('start-session-final');
        if (startSessionFinal) {
            startSessionFinal.addEventListener('click', () => this.confirmSetupAndStart());
        }

        // Welcome overlay
        const closeWelcome = document.getElementById('close-welcome');
        if (closeWelcome) {
            closeWelcome.addEventListener('click', () => this.hideWelcome());
        }

        const startUsing = document.getElementById('start-using');
        if (startUsing) {
            startUsing.addEventListener('click', () => this.hideWelcome());
        }

        // Quick help
        const quickHelpBtn = document.getElementById('quick-help-btn');
        if (quickHelpBtn) {
            quickHelpBtn.addEventListener('click', () => this.toggleQuickHelp());
        }

        const closeHelpPopup = document.getElementById('close-help-popup');
        if (closeHelpPopup) {
            closeHelpPopup.addEventListener('click', () => this.hideQuickHelp());
        }

        // Filter buttons
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => this.filterTherapies(btn.dataset.filter));
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => this.handleKeyboardShortcuts(e));
    }

    /**
     * Start gamepad polling loop
     */
    startGamepadLoop() {
        const loop = () => {
            this.updateGamepadState();
            this.animationId = requestAnimationFrame(loop);
        };
        loop();
    }

    /**
     * Update gamepad state
     */
    updateGamepadState() {
        if (this.gamepadIndex >= 0) {
            const gamepads = navigator.getGamepads();
            if (gamepads[this.gamepadIndex]) {
                this.gamepad = gamepads[this.gamepadIndex];
            }
        }
    }

    /**
     * Handle gamepad connection
     */
    onGamepadConnected(event) {
        this.gamepad = event.gamepad;
        this.gamepadIndex = event.gamepad.index;
        
        this.updateConnectionStatus(true);
        this.updateControllerInfo();
        this.enableTherapyButtons(true);
        
        // Hide connection prompt, show controller info
        const prompt = document.getElementById('connection-prompt');
        const info = document.getElementById('controller-info');
        if (prompt) prompt.style.display = 'none';
        if (info) info.style.display = 'block';

        // Enable quick test button
        const quickTest = document.getElementById('quick-test');
        if (quickTest) quickTest.disabled = false;
        
        console.log(`Controller connected: ${event.gamepad.id}`);
        this.showToast('success', 'Controller Connected', event.gamepad.id);
        
        if (event.gamepad.vibrationActuator) {
            console.log(`Vibration support: ${event.gamepad.vibrationActuator.type}`);
            this.testVibrationSupport();
        } else {
            console.warn('Controller does not support vibration');
            this.showToast('warning', 'No Vibration Support', 'This controller may not support vibration');
        }
    }

    /**
     * Handle gamepad disconnection
     */
    onGamepadDisconnected(event) {
        if (event.gamepad.index === this.gamepadIndex) {
            this.emergencyStop();
            
            this.gamepad = null;
            this.gamepadIndex = -1;
            
            this.updateConnectionStatus(false);
            this.enableTherapyButtons(false);

            // Show connection prompt, hide controller info
            const prompt = document.getElementById('connection-prompt');
            const info = document.getElementById('controller-info');
            if (prompt) prompt.style.display = 'block';
            if (info) info.style.display = 'none';

            // Disable quick test button
            const quickTest = document.getElementById('quick-test');
            if (quickTest) quickTest.disabled = true;
            
            console.log(`Controller disconnected: ${event.gamepad.id}`);
            this.showToast('error', 'Controller Disconnected', 'Please reconnect your controller');
        }
    }

    /**
     * Update connection status indicator
     */
    updateConnectionStatus(connected) {
        const statusElement = document.getElementById('connection-status');
        if (!statusElement) return;

        const indicator = statusElement.querySelector('.status-indicator');
        const text = statusElement.querySelector('.status-text');

        if (connected) {
            indicator.classList.remove('offline');
            indicator.classList.add('online');
            text.textContent = 'Connected';
        } else {
            indicator.classList.remove('online');
            indicator.classList.add('offline');
            text.textContent = 'Disconnected';
        }
    }

    /**
     * Update controller information display
     */
    updateControllerInfo() {
        if (!this.gamepad) return;

        const deviceName = document.getElementById('device-name');
        const batteryLevel = document.getElementById('battery-level');
        const vibrationSupport = document.getElementById('vibration-support');

        if (deviceName) {
            const name = this.gamepad.id.split('(')[0].trim();
            deviceName.textContent = name || 'Unknown Device';
        }

        if (batteryLevel) {
            batteryLevel.textContent = 'USB'; // Most gamepads don't report battery
        }

        if (vibrationSupport) {
            vibrationSupport.textContent = this.gamepad.vibrationActuator ? 'Supported' : 'Not Supported';
        }
    }

    /**
     * Enable/disable therapy buttons
     */
    enableTherapyButtons(enabled) {
        document.querySelectorAll('.therapy-btn').forEach(btn => {
            btn.disabled = !enabled;
        });

        const quickTest = document.getElementById('quick-test');
        if (quickTest) quickTest.disabled = !enabled;
    }

    /**
     * Test vibration support
     */
    async testVibrationSupport() {
        if (!this.gamepad?.vibrationActuator) return;

        try {
            await this.vibrate(0.2, 0.1, 100);
            console.log('Vibration test successful!');
        } catch (error) {
            console.error(`Vibration test failed: ${error.message}`);
        }
    }

    /**
     * Quick vibration test
     */
    async quickTest() {
        if (!this.gamepad?.vibrationActuator) {
            console.error('No vibration support available');
            return;
        }

        console.log('Running quick vibration test...');
        
        try {
            await this.vibrate(0.5, 0.5, 500);
            await this.delay(200);
            await this.vibrate(0.3, 0.3, 300);
            console.log('Quick test completed successfully!');
        } catch (error) {
            console.error(`Quick test failed: ${error.message}`);
        }
    }

    /**
     * Core vibration method
     */
    async vibrate(weakMagnitude, strongMagnitude, duration) {
        if (!this.gamepad?.vibrationActuator) {
            throw new Error('No vibration support');
        }

        // Apply intensity multiplier from settings
        const intensityMultiplier = this.settings.hapticIntensity;
        
        await this.gamepad.vibrationActuator.playEffect('dual-rumble', {
            duration: duration,
            weakMagnitude: Math.min(1.0, weakMagnitude * intensityMultiplier),
            strongMagnitude: Math.min(1.0, strongMagnitude * intensityMultiplier)
        });
    }

    /**
     * Stop all vibration
     */
    async stopVibration() {
        if (this.gamepad?.vibrationActuator) {
            try {
                await this.gamepad.vibrationActuator.reset();
            } catch (error) {
                console.error(`Failed to stop vibration: ${error.message}`);
            }
        }
    }

    /**
     * Start therapy session - shows setup dialog first
     */
    async startTherapy(therapyType, buttonElement) {
        if (!this.gamepad?.vibrationActuator) {
            console.error('Controller not ready for therapy');
            return;
        }

        if (this.isSessionActive) {
            console.warn('A session is already active');
            return;
        }

        // Store therapy info and show duration setup
        this.pendingTherapy = therapyType;
        this.pendingButton = buttonElement;
        this.showDurationSetup();
    }

    /**
     * Show duration setup (Step 1)
     */
    showDurationSetup() {
        const overlay = document.getElementById('duration-setup-overlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    /**
     * Hide duration setup
     */
    hideDurationSetup() {
        const overlay = document.getElementById('duration-setup-overlay');
        if (overlay) {
            overlay.classList.remove('active');
        }
        this.pendingTherapy = null;
        this.pendingButton = null;
    }

    /**
     * Show breathing setup (Step 2)
     */
    showBreathingSetup() {
        const durationOverlay = document.getElementById('duration-setup-overlay');
        const breathingOverlay = document.getElementById('breathing-setup-overlay');
        
        if (durationOverlay) {
            durationOverlay.classList.remove('active');
        }
        
        if (breathingOverlay) {
            breathingOverlay.classList.add('active');
            // Show or hide patterns based on current selection
            const patternsSection = document.getElementById('breathing-patterns');
            if (patternsSection) {
                patternsSection.style.display = this.breathingEnabled ? 'block' : 'none';
            }
        }
    }

    /**
     * Go back to duration setup
     */
    backToDuration() {
        const durationOverlay = document.getElementById('duration-setup-overlay');
        const breathingOverlay = document.getElementById('breathing-setup-overlay');
        
        if (breathingOverlay) {
            breathingOverlay.classList.remove('active');
        }
        
        if (durationOverlay) {
            durationOverlay.classList.add('active');
        }
    }

    /**
     * Hide all setup dialogs
     */
    hideAllSetupDialogs() {
        const durationOverlay = document.getElementById('duration-setup-overlay');
        const breathingOverlay = document.getElementById('breathing-setup-overlay');
        
        if (durationOverlay) {
            durationOverlay.classList.remove('active');
        }
        if (breathingOverlay) {
            breathingOverlay.classList.remove('active');
        }
    }

    /**
     * Confirm setup and start session
     */
    async confirmSetupAndStart() {
        if (!this.pendingTherapy || !this.pendingButton) return;

        this.hideAllSetupDialogs();
        
        const therapyType = this.pendingTherapy;
        const buttonElement = this.pendingButton;
        
        this.pendingTherapy = null;
        this.pendingButton = null;

        // Start actual session
        await this.executeTherapySession(therapyType, buttonElement);
    }

    /**
     * Execute therapy session with selected configuration
     */
    async executeTherapySession(therapyType, buttonElement) {
        this.isSessionActive = true;
        this.isPaused = false;
        this.currentTherapy = therapyType;
        this.sessionStartTime = Date.now();
        this.patternCount++;
        this.breathingCycleCount = 0;

        // Update UI
        this.setActiveButton(buttonElement);
        this.showSessionOverlay(therapyType);
        this.startSessionTimer();
        this.updateSessionStats();

        // Start breathing guide if enabled
        if (this.breathingEnabled) {
            this.startBreathingGuide();
        }

        console.log(`Starting ${this.getTherapyName(therapyType)} therapy for ${this.selectedDuration / 60} minutes...`);

        try {
            await this.executeTherapy(therapyType);
            
            if (this.isSessionActive) {
                // Save to history
                this.saveSessionToHistory({
                    therapy: therapyType,
                    duration: Date.now() - this.sessionStartTime,
                    completed: true
                });
                
                console.log('Therapy session completed successfully!');
            }
        } catch (error) {
            console.error(`Therapy session error: ${error.message}`);
        } finally {
            this.endSession();
        }
    }

    /**
     * Execute therapy pattern
     */
    async executeTherapy(therapyType) {
        const patterns = this.getTherapyPattern(therapyType);
        const endTime = Date.now() + (this.selectedDuration * 1000);
        
        while (Date.now() < endTime && this.isSessionActive) {
            for (const step of patterns.steps) {
                if (!this.isSessionActive || Date.now() >= endTime) break;
                
                // Handle pause
                while (this.isPaused && this.isSessionActive) {
                    await this.delay(100);
                }
                
                if (!this.isSessionActive || Date.now() >= endTime) break;
                
                // Update UI
                this.updateSessionProgress(step.weak, step.strong);
                this.updateStageInfo(step.description || 'Therapy in progress...');
                
                // Execute vibration
                await this.vibrate(step.weak, step.strong, step.duration);
            }
            
            // Brief pause between cycles
            if (Date.now() < endTime && this.isSessionActive) {
                await this.delay(500);
            }
        }
    }

    /**
     * Get therapy pattern definition
     */
    getTherapyPattern(therapyType) {
        const patterns = {
            'head-tension': {
                repetitions: 10,
                steps: [
                    { weak: 0.4, strong: 0.2, duration: 800, description: 'Gentle pulse...' },
                    { weak: 0.0, strong: 0.0, duration: 400, description: 'Resting...' },
                    { weak: 0.6, strong: 0.3, duration: 1200, description: 'Deep release...' },
                    { weak: 0.0, strong: 0.0, duration: 600, description: 'Recovery...' },
                    { weak: 0.3, strong: 0.1, duration: 600, description: 'Soothing...' },
                    { weak: 0.0, strong: 0.0, duration: 300, description: 'Resting...' }
                ]
            },
            'head-migraine': {
                repetitions: 8,
                steps: [
                    { weak: 0.2, strong: 0.1, duration: 2000, description: 'Ultra gentle...' },
                    { weak: 0.0, strong: 0.0, duration: 1000, description: 'Calming...' },
                    { weak: 0.15, strong: 0.05, duration: 3000, description: 'Sustained relief...' },
                    { weak: 0.0, strong: 0.0, duration: 2000, description: 'Deep rest...' }
                ]
            },
            'head-sleep': {
                repetitions: 3,
                steps: [
                    { weak: 0.3, strong: 0.2, duration: 2000, description: 'Starting relaxation...' },
                    { weak: 0.25, strong: 0.15, duration: 2000, description: 'Deeper relaxation...' },
                    { weak: 0.2, strong: 0.1, duration: 2000, description: 'Calming...' },
                    { weak: 0.15, strong: 0.08, duration: 2000, description: 'Peaceful...' },
                    { weak: 0.1, strong: 0.05, duration: 3000, description: 'Drifting...' },
                    { weak: 0.05, strong: 0.02, duration: 4000, description: 'Sleeping...' },
                    { weak: 0.0, strong: 0.0, duration: 5000, description: 'Rest...' }
                ]
            },
            'head-focus': {
                repetitions: 6,
                steps: [
                    { weak: 0.5, strong: 0.3, duration: 300, description: 'Alertness pulse...' },
                    { weak: 0.0, strong: 0.0, duration: 200, description: 'Brief pause...' },
                    { weak: 0.4, strong: 0.2, duration: 300, description: 'Focus rhythm...' },
                    { weak: 0.0, strong: 0.0, duration: 200, description: 'Brief pause...' },
                    { weak: 0.6, strong: 0.4, duration: 500, description: 'Concentration boost...' },
                    { weak: 0.0, strong: 0.0, duration: 1000, description: 'Integration...' }
                ]
            },
            'body-deep': {
                repetitions: 8,
                steps: [
                    { weak: 0.8, strong: 0.9, duration: 1500, description: 'Deep pressure...' },
                    { weak: 0.4, strong: 0.5, duration: 500, description: 'Release...' },
                    { weak: 1.0, strong: 1.0, duration: 2000, description: 'Maximum intensity...' },
                    { weak: 0.2, strong: 0.1, duration: 800, description: 'Recovery...' },
                    { weak: 0.9, strong: 0.8, duration: 1200, description: 'Sustained work...' },
                    { weak: 0.0, strong: 0.0, duration: 1000, description: 'Rest...' }
                ]
            },
            'body-relaxing': {
                repetitions: 6,
                steps: [
                    { weak: 0.3, strong: 0.2, duration: 1000, description: 'Gentle wave rising...' },
                    { weak: 0.5, strong: 0.4, duration: 1500, description: 'Building wave...' },
                    { weak: 0.7, strong: 0.6, duration: 2000, description: 'Peak wave...' },
                    { weak: 0.5, strong: 0.4, duration: 1500, description: 'Receding wave...' },
                    { weak: 0.3, strong: 0.2, duration: 1000, description: 'Calming wave...' },
                    { weak: 0.0, strong: 0.0, duration: 800, description: 'Peaceful...' }
                ]
            },
            'body-sports': {
                repetitions: 10,
                steps: [
                    { weak: 0.6, strong: 0.7, duration: 800, description: 'Muscle activation...' },
                    { weak: 0.3, strong: 0.2, duration: 400, description: 'Light release...' },
                    { weak: 0.8, strong: 0.9, duration: 1000, description: 'Deep work...' },
                    { weak: 0.2, strong: 0.1, duration: 600, description: 'Recovery phase...' },
                    { weak: 0.5, strong: 0.6, duration: 700, description: 'Circulation boost...' },
                    { weak: 0.0, strong: 0.0, duration: 500, description: 'Rest...' }
                ]
            },
            'body-stress': {
                repetitions: 7,
                steps: [
                    { weak: 0.4, strong: 0.3, duration: 1800, description: 'Stress release...' },
                    { weak: 0.0, strong: 0.0, duration: 400, description: 'Breathing...' },
                    { weak: 0.35, strong: 0.25, duration: 1600, description: 'Tension relief...' },
                    { weak: 0.0, strong: 0.0, duration: 600, description: 'Calming...' },
                    { weak: 0.3, strong: 0.2, duration: 2000, description: 'Deep relaxation...' },
                    { weak: 0.0, strong: 0.0, duration: 800, description: 'Peace...' }
                ]
            },
            'full-body': {
                repetitions: 1,
                steps: [
                    // Combined sequence
                    { weak: 0.3, strong: 0.2, duration: 2000, description: 'Full body scan starting...' },
                    { weak: 0.5, strong: 0.4, duration: 2000, description: 'Head and neck...' },
                    { weak: 0.0, strong: 0.0, duration: 1000, description: 'Transitioning...' },
                    { weak: 0.7, strong: 0.6, duration: 2500, description: 'Shoulders and upper back...' },
                    { weak: 0.0, strong: 0.0, duration: 1000, description: 'Transitioning...' },
                    { weak: 0.8, strong: 0.7, duration: 3000, description: 'Lower back and hips...' },
                    { weak: 0.0, strong: 0.0, duration: 1000, description: 'Transitioning...' },
                    { weak: 0.6, strong: 0.5, duration: 2500, description: 'Legs and feet...' },
                    { weak: 0.3, strong: 0.2, duration: 2000, description: 'Whole body integration...' },
                    { weak: 0.1, strong: 0.05, duration: 3000, description: 'Final relaxation...' },
                    { weak: 0.0, strong: 0.0, duration: 2000, description: 'Complete...' }
                ]
            },
            'energy-boost': {
                repetitions: 12,
                steps: [
                    { weak: 0.3, strong: 0.2, duration: 200, description: 'Wake up pulse...' },
                    { weak: 0.6, strong: 0.4, duration: 300, description: 'Energizing...' },
                    { weak: 0.9, strong: 0.7, duration: 400, description: 'Power surge...' },
                    { weak: 0.6, strong: 0.4, duration: 300, description: 'Sustaining...' },
                    { weak: 0.3, strong: 0.2, duration: 200, description: 'Settling...' },
                    { weak: 0.0, strong: 0.0, duration: 400, description: 'Brief rest...' }
                ]
            },
            'meditation': {
                repetitions: 5,
                steps: [
                    { weak: 0.2, strong: 0.1, duration: 4000, description: 'Breathe in slowly...' },
                    { weak: 0.1, strong: 0.05, duration: 1000, description: 'Hold...' },
                    { weak: 0.15, strong: 0.08, duration: 6000, description: 'Breathe out slowly...' },
                    { weak: 0.0, strong: 0.0, duration: 1000, description: 'Empty pause...' }
                ]
            }
        };

        return patterns[therapyType] || patterns['body-relaxing'];
    }

    /**
     * Get human-readable therapy name
     */
    getTherapyName(therapyType) {
        const names = {
            'head-tension': 'Tension Relief',
            'head-migraine': 'Migraine Relief',
            'head-sleep': 'Sleep Inducer',
            'head-focus': 'Focus Booster',
            'body-deep': 'Deep Tissue',
            'body-relaxing': 'Relaxing Massage',
            'body-sports': 'Sports Recovery',
            'body-stress': 'Stress Relief',
            'full-body': 'Full Body Wellness',
            'energy-boost': 'Energy Boost',
            'meditation': 'Meditation Guide'
        };
        return names[therapyType] || therapyType;
    }

    /**
     * Set active therapy button
     */
    setActiveButton(button) {
        document.querySelectorAll('.therapy-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        if (button) {
            button.classList.add('active');
        }
    }

    /**
     * Show session overlay
     */
    showSessionOverlay(therapyType) {
        const overlay = document.getElementById('session-overlay');
        const title = document.getElementById('session-title');
        
        if (overlay) overlay.classList.add('active');
        if (title) title.textContent = `${this.getTherapyName(therapyType)} Session`;
    }

    /**
     * Hide session overlay
     */
    hideSessionOverlay() {
        const overlay = document.getElementById('session-overlay');
        if (overlay) overlay.classList.remove('active');
    }

    /**
     * Start session timer
     */
    startSessionTimer() {
        this.sessionTimerId = setInterval(() => {
            if (!this.isPaused && this.isSessionActive) {
                this.sessionDuration = Date.now() - this.sessionStartTime;
                this.updateSessionTime();
            }
        }, 1000);
    }

    /**
     * Update session time display
     */
    updateSessionTime() {
        const minutes = Math.floor(this.sessionDuration / 60000);
        const seconds = Math.floor((this.sessionDuration % 60000) / 1000);
        
        const timeString = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        const sessionTime = document.getElementById('session-time');
        const progressTime = document.getElementById('progress-time');
        
        if (sessionTime) sessionTime.textContent = timeString;
        if (progressTime) progressTime.textContent = timeString;
    }

    /**
     * Update session stats
     */
    updateSessionStats() {
        const patternCountEl = document.getElementById('pattern-count');
        if (patternCountEl) {
            patternCountEl.textContent = this.patternCount;
        }
    }

    /**
     * Update session progress indicators
     */
    updateSessionProgress(weak, strong) {
        const avgIntensity = (weak + strong) / 2;
        const percentage = Math.round(avgIntensity * 100);
        
        const intensityFill = document.getElementById('intensity-fill');
        const intensityValue = document.getElementById('intensity-value');
        
        if (intensityFill) intensityFill.style.width = `${percentage}%`;
        if (intensityValue) intensityValue.textContent = `${percentage}%`;
    }

    /**
     * Update stage information
     */
    updateStageInfo(text) {
        const stageInfo = document.getElementById('stage-info');
        if (stageInfo) stageInfo.textContent = text;
    }

    /**
     * Toggle pause state
     */
    togglePause() {
        this.isPaused = !this.isPaused;
        
        const pauseBtn = document.getElementById('pause-session');
        if (pauseBtn) {
            const icon = pauseBtn.querySelector('i');
            const text = pauseBtn.querySelector('span') || pauseBtn;
            
            if (this.isPaused) {
                if (icon) icon.className = 'fas fa-play';
                text.textContent = this.isPaused ? 'Resume' : 'Pause';
                console.log('Session paused');
            } else {
                if (icon) icon.className = 'fas fa-pause';
                text.textContent = 'Pause';
                console.log('Session resumed');
            }
        }
    }

    /**
     * Stop current session
     */
    async stopSession() {
        if (this.settings.confirmStop) {
            // In production, show a confirmation dialog
            console.log('Stopping session...');
        }
        
        this.isSessionActive = false;
        await this.stopVibration();
        this.endSession();
        console.warn('Session stopped by user');
    }

    /**
     * Emergency stop - immediate halt
     */
    async emergencyStop() {
        this.isSessionActive = false;
        this.isPaused = false;
        await this.stopVibration();
        this.endSession();
        console.error('EMERGENCY STOP activated');
    }

    /**
     * End session and cleanup
     */
    endSession() {
        this.isSessionActive = false;
        this.isPaused = false;
        this.currentTherapy = null;
        
        if (this.sessionTimerId) {
            clearInterval(this.sessionTimerId);
            this.sessionTimerId = null;
        }
        
        // Stop breathing guide
        this.stopBreathingGuide();
        
        this.sessionDuration = 0;
        
        this.setActiveButton(null);
        this.hideSessionOverlay();
        this.updateSessionTime();
    }

    /**
     * Switch navigation tabs
     */
    switchTab(tabName) {
        this.currentTab = tabName;
        
        // Update tab buttons
        document.querySelectorAll('.nav-tab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tab === tabName);
        });
        
        // Update content
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `${tabName}-tab`);
        });
        
        console.log(`Switched to ${tabName} tab`);
    }

    /**
     * Toggle theme
     */
    toggleTheme() {
        const body = document.body;
        const isDark = body.classList.contains('theme-dark');
        
        body.classList.toggle('theme-dark', !isDark);
        body.classList.toggle('theme-light', isDark);
        
        this.settings.theme = isDark ? 'light' : 'dark';
        this.saveSettings();
        
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.className = isDark ? 'fas fa-moon' : 'fas fa-sun';
        }
        
        console.log(`Theme changed to ${this.settings.theme}`);
    }

    /**
     * Apply theme from settings
     */
    applyTheme() {
        const body = document.body;
        const theme = this.settings.theme;
        
        if (theme === 'dark') {
            body.classList.add('theme-dark');
            body.classList.remove('theme-light');
        } else {
            body.classList.add('theme-light');
            body.classList.remove('theme-dark');
        }
        
        const icon = document.querySelector('#theme-toggle i');
        if (icon) {
            icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }
    }

    /**
     * Utility: Delay/sleep function
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    /**
     * Check if first visit and show welcome
     */
    checkFirstVisit() {
        const hasVisited = localStorage.getItem('therapyControllerVisited');
        if (!hasVisited) {
            this.showWelcome();
        }
    }

    /**
     * Show welcome overlay
     */
    showWelcome() {
        const overlay = document.getElementById('welcome-overlay');
        if (overlay) {
            overlay.classList.add('active');
        }
    }

    /**
     * Hide welcome overlay
     */
    hideWelcome() {
        const overlay = document.getElementById('welcome-overlay');
        const dontShow = document.getElementById('dont-show-welcome');
        
        if (dontShow && dontShow.checked) {
            localStorage.setItem('therapyControllerVisited', 'true');
        }
        
        if (overlay) {
            overlay.classList.remove('active');
        }
    }

    /**
     * Toggle quick help popup
     */
    toggleQuickHelp() {
        const popup = document.getElementById('quick-help-popup');
        if (popup) {
            popup.classList.toggle('active');
        }
    }

    /**
     * Hide quick help popup
     */
    hideQuickHelp() {
        const popup = document.getElementById('quick-help-popup');
        if (popup) {
            popup.classList.remove('active');
        }
    }

    /**
     * Filter therapies by category
     */
    filterTherapies(filter) {
        // Update active filter button - ensure only ONE is active at a time
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        document.querySelector(`.filter-btn[data-filter="${filter}"]`)?.classList.add('active');

        // Filter therapy categories
        document.querySelectorAll('.therapy-category').forEach(category => {
            if (filter === 'all') {
                category.style.display = 'block';
            } else if (filter === 'premium') {
                // Show only premium cards
                category.style.display = 'none';
                const premiumCards = category.querySelectorAll('.premium-card');
                if (premiumCards.length > 0) {
                    category.style.display = 'block';
                    category.querySelectorAll('.therapy-card').forEach(card => {
                        card.style.display = card.classList.contains('premium-card') ? 'block' : 'none';
                    });
                }
            } else {
                const categoryType = category.dataset.category;
                category.style.display = categoryType === filter ? 'block' : 'none';
            }
        });

        this.showToast('success', 'Filter Applied', `Showing ${filter === 'all' ? 'all' : filter} programs`);
    }

    /**
     * Show toast notification
     */
    showToast(type, title, message) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        const iconMap = {
            success: 'check-circle',
            error: 'exclamation-circle',
            info: 'info-circle',
            warning: 'exclamation-triangle'
        };

        toast.innerHTML = `
            <div class="toast-icon"><i class="fas fa-${iconMap[type]}"></i></div>
            <div class="toast-content">
                <div class="toast-title">${title}</div>
                <div class="toast-message">${message}</div>
            </div>
        `;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.animation = 'fadeOut 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    /**
     * Handle keyboard shortcuts
     */
    handleKeyboardShortcuts(e) {
        // Esc - Emergency stop
        if (e.key === 'Escape') {
            this.emergencyStop();
        }

        // Space - Pause/Resume
        if (e.key === ' ' && this.isSessionActive) {
            e.preventDefault();
            this.togglePause();
        }

        // ? - Show help
        if (e.key === '?') {
            this.toggleQuickHelp();
        }
    }

    /**
     * Rotate random tips
     */
    rotateRandomTips() {
        const tips = [
            'Tip: Start with gentler programs and gradually increase intensity',
            'Tip: Enable breathing guide for enhanced relaxation',
            'Tip: Use in a comfortable, quiet environment',
            'Tip: Regular sessions provide best results',
            'Tip: Try different programs to find what works for you',
            'Tip: Hydrate before and after therapy sessions',
            'Tip: Use the Emergency Stop button if you feel any discomfort',
            'Tip: Premium programs combine multiple therapy techniques',
            'Tip: Shorter sessions (5-10 min) are great for daily use',
            'Tip: Press any gamepad button to wake your controller'
        ];

        const updateTip = () => {
            const tipElement = document.querySelector('.tip-content p');
            if (tipElement) {
                const randomTip = tips[Math.floor(Math.random() * tips.length)];
                tipElement.textContent = randomTip;
            }
        };

        // Update tip every 30 seconds
        setInterval(updateTip, 30000);
    }

    /**
     * Start breathing guide visualization
     */
    startBreathingGuide() {
        const guide = document.getElementById('breathing-guide');
        if (guide) {
            guide.style.display = 'block';
        }

        this.breathingCycleCount = 0;
        this.runBreathingCycle();
    }

    /**
     * Stop breathing guide
     */
    stopBreathingGuide() {
        if (this.breathingInterval) {
            clearTimeout(this.breathingInterval);
            this.breathingInterval = null;
        }
        
        const guide = document.getElementById('breathing-guide');
        if (guide) {
            guide.style.display = 'none';
        }
    }

    /**
     * Run a breathing cycle based on selected pattern
     */
    async runBreathingCycle() {
        if (!this.breathingEnabled || !this.isSessionActive) return;

        const patterns = {
            '4-7-8': { breatheIn: 4, hold: 7, breatheOut: 8 },
            'box': { breatheIn: 4, hold: 4, breatheOut: 4, holdOut: 4 },
            '4-4-4': { breatheIn: 4, hold: 4, breatheOut: 4 },
            '5-5': { breatheIn: 5, hold: 0, breatheOut: 5 }
        };

        const pattern = patterns[this.breathingPattern] || patterns['4-7-8'];
        const animation = document.getElementById('breathing-animation');
        const instruction = document.getElementById('breathing-instruction');
        const counter = document.getElementById('breathing-counter');

        // Breathe In
        if (animation) animation.className = 'breathing-animation breathe-in';
        if (instruction) instruction.textContent = 'Breathe In';
        await this.delay(pattern.breatheIn * 1000);

        if (!this.isSessionActive) return;

        // Hold
        if (pattern.hold > 0) {
            if (animation) animation.className = 'breathing-animation hold';
            if (instruction) instruction.textContent = 'Hold';
            await this.delay(pattern.hold * 1000);
        }

        if (!this.isSessionActive) return;

        // Breathe Out
        if (animation) animation.className = 'breathing-animation breathe-out';
        if (instruction) instruction.textContent = 'Breathe Out';
        await this.delay(pattern.breatheOut * 1000);

        if (!this.isSessionActive) return;

        // Hold Out (for box breathing)
        if (pattern.holdOut) {
            if (animation) animation.className = 'breathing-animation hold';
            if (instruction) instruction.textContent = 'Hold';
            await this.delay(pattern.holdOut * 1000);
        }

        // Update counter
        this.breathingCycleCount++;
        if (counter) {
            counter.textContent = `${this.breathingCycleCount} cycles`;
        }

        // Continue cycling
        if (this.isSessionActive) {
            this.breathingInterval = setTimeout(() => this.runBreathingCycle(), 1000);
        }
    }
}

// Initialize application when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.therapyController = new TherapyControllerPro();
});

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { TherapyControllerPro };
}