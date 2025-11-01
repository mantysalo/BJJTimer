/**
 * Timer state management utility
 * Defines the core timer state structure and handles state transitions
 */

export const TIMER_PHASES = {
  IDLE: "idle",
  WORK: "work",
};

export const TIMER_CONSTANTS = {
  SECOND: 1000,
  MINUTE: 60 * 1000,
  RENDER_RATE: 1000 / 30,
  SOON_TIME: 10 * 1000,
  MIN_ROUND_TIME: 30 * 1000,
};

/**
 * Creates initial timer state
 */
export const createInitialState = (roundTime) => ({
  isRunning: false,
  timeLeft: roundTime,
  phase: TIMER_PHASES.IDLE,
  startTime: null,
  sessionStartTime: null,
  roundTime,
  soonSoundPlayed: false,
});
/**
 * Validates and clamps timer settings
 */
export const validateSettings = (roundTime) => ({
  roundTime: Math.max(TIMER_CONSTANTS.MIN_ROUND_TIME, roundTime),
});

/**
 * Gets the duration for the current phase
 */
export const getCurrentPhaseDuration = (state) => {
  return state.roundTime;
};

/**
 * Checks if the current phase should transition to the next one
 */
export const shouldTransitionPhase = (state) => {
  return state.timeLeft <= 0;
};

/**
 * Creates state for transitioning to a new phase
 */
export const createPhaseTransition = (state, newPhase) => {
  const now = Date.now();
  let updates = {
    phase: newPhase,
    startTime: now,
    soonSoundPlayed: false,
  };

  switch (newPhase) {
    case TIMER_PHASES.WORK:
      updates = {
        ...updates,
        timeLeft: state.roundTime,
      };
      break;

    case TIMER_PHASES.IDLE:
      updates = {
        ...updates,
        timeLeft: state.roundTime,
        isRunning: false,
        startTime: null,
        sessionStartTime: null,
      };
      break;
  }

  return { ...state, ...updates };
};
