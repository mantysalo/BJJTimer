import {
  createInitialState,
  TIMER_PHASES,
  TIMER_CONSTANTS,
  getCurrentPhaseDuration,
  shouldTransitionPhase,
  createPhaseTransition,
  validateSettings,
} from "./TimerState";
import { AudioManager } from "./AudioManager";

/**
 * Core timer logic class
 * Manages all timer state, transitions, and business logic
 */
export class TimerLogic {
  constructor(initialSettings = {}) {
    const { roundTime } = validateSettings(initialSettings.roundTime || 5 * 60 * 1000);

    this.state = createInitialState(roundTime);
    this.audioManager = AudioManager.getInstance();
    this.subscribers = new Set();
    this.intervalId = null;
    this.lastActionTime = 0; // For debouncing rapid actions
    this.lastNotifyTime = 0; // For throttling subscriber notifications
  }

  /**
   * Subscribe to state changes
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Notify all subscribers of state change
   */
  notifySubscribers() {
    this.subscribers.forEach((callback) => callback(this.getState()));
  }

  /**
   * Get current state
   */
  getState() {
    return {
      ...this.state,
    };
  }

  /**
   * Update timer settings
   */
  updateSettings(newSettings) {
    const validated = validateSettings(newSettings.roundTime ?? this.state.roundTime);

    this.state = {
      ...this.state,
      ...validated,
    };

    // Update timeLeft if idle
    if (this.state.phase === TIMER_PHASES.IDLE) {
      this.state.timeLeft = validated.roundTime;
    }

    this.notifySubscribers();
  }
  /**
   * Start or resume the timer
   */
  start() {
    // Prevent double-start race condition
    if (this.state.isRunning) return;

    // Initialize and ensure audio is loaded on user interaction (required for iOS)
    this.audioManager.initialize();

    // Capture precise start time immediately
    const now = Date.now();

    if (this.state.phase === TIMER_PHASES.IDLE) {
      // Starting fresh - begin directly with work phase
      this.transitionToPhase(TIMER_PHASES.WORK);
      // Override the startTime from transitionToPhase with our precise timestamp
      this.state.startTime = now;
    } else {
      // Resuming - recalculate start time based on current timeLeft with precise timing
      const currentPhaseDuration = getCurrentPhaseDuration(this.state);
      this.state.startTime = now - (currentPhaseDuration - this.state.timeLeft);
    }

    this.state.isRunning = true;
    if (!this.state.sessionStartTime) {
      this.state.sessionStartTime = now;
    }

    this.startTicking();
    this.notifySubscribers();
  }

  /**
   * Pause the timer
   */
  pause() {
    // Prevent double-pause race condition
    if (!this.state.isRunning) return;

    this.state.isRunning = false;
    this.stopTicking();
    this.notifySubscribers();
  }

  /**
   * Reset the timer to initial state
   */
  reset() {
    this.stopTicking();
    this.state = createInitialState(this.state.roundTime);
    this.notifySubscribers();
  }
  /**
   * Toggle between start and pause
   */
  toggle() {
    // Debounce rapid toggle attempts (prevent double-clicks)
    const now = Date.now();
    if (now - this.lastActionTime < 100) return; // 100ms debounce
    this.lastActionTime = now;

    if (this.state.isRunning) {
      this.pause();
    } else {
      this.start();
    }
  }

  /**
   * Adjust current time by a delta (in milliseconds)
   */
  adjustCurrentTime(deltaMs) {
    const currentPhaseDuration = getCurrentPhaseDuration(this.state);
    const newTimeLeft = Math.min(Math.max(0, this.state.timeLeft + deltaMs), currentPhaseDuration);

    this.state.timeLeft = newTimeLeft;

    // If running, adjust the startTime to maintain the new timeLeft
    if (this.state.isRunning) {
      const now = Date.now();
      this.state.startTime = now - (currentPhaseDuration - newTimeLeft);
    }

    this.notifySubscribers();
  }

  /**
   * Start the ticking interval
   */
  startTicking() {
    // Enhanced protection against multiple intervals
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
    }

    this.intervalId = setInterval(() => {
      this.tick();
    }, TIMER_CONSTANTS.RENDER_RATE);
  }

  /**
   * Stop the ticking interval
   */
  stopTicking() {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  /**
   * Main tick function - updates timer state
   */
  tick() {
    // Additional safety checks to prevent inconsistent state
    if (!this.state.isRunning || !this.state.startTime || this.intervalId === null) return;

    const now = Date.now();
    const currentPhaseDuration = getCurrentPhaseDuration(this.state);
    const elapsedTimeInPhase = now - this.state.startTime;
    const newTimeLeft = currentPhaseDuration - elapsedTimeInPhase;

    // Update timeLeft first
    this.state.timeLeft = newTimeLeft;

    // Check for phase transition using the utility function
    if (shouldTransitionPhase(this.state)) {
      this.handlePhaseTransition();
      return; // handlePhaseTransition will handle the rest
    }

    // Check for audio cues
    this.checkAudioCues();

    // Throttle UI updates to reduce CPU usage (update UI every 100ms)
    const shouldNotify = !this.lastNotifyTime || now - this.lastNotifyTime >= 100;
    if (shouldNotify) {
      this.lastNotifyTime = now;
      this.notifySubscribers();
    }
  }
  /**
   * Check and play audio cues based on current state
   */
  checkAudioCues() {
    const { timeLeft, phase, soonSoundPlayed } = this.state;

    // Play "soon" sound towards end of timer
    // Use a time window to ensure we don't miss the exact moment
    if (
      phase === TIMER_PHASES.WORK &&
      timeLeft <= TIMER_CONSTANTS.SOON_TIME &&
      timeLeft > TIMER_CONSTANTS.SOON_TIME - TIMER_CONSTANTS.RENDER_RATE * 2 &&
      !soonSoundPlayed
    ) {
      this.audioManager.playSoon();
      this.state.soonSoundPlayed = true;
    }
  }

  /**
   * Handle transition to next phase when current phase ends
   */
  handlePhaseTransition() {
    // Set timeLeft to 0 for current phase
    this.state.timeLeft = 0;

    // Timer complete - play finish sound and reset
    if (this.state.phase === TIMER_PHASES.WORK) {
      this.audioManager.playFinish();
      this.reset();
      return;
    }

    this.notifySubscribers();
  }
  /**
   * Transition to a new phase
   */
  transitionToPhase(newPhase) {
    this.state = createPhaseTransition(this.state, newPhase);
  }

  /**
   * Cleanup method
   */
  destroy() {
    this.stopTicking();
    this.subscribers.clear();
    this.state.isRunning = false;
  }
}
