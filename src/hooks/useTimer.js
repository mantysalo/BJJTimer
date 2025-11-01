import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { TimerLogic } from "../utils/TimerLogic";
import { TIMER_PHASES, TIMER_CONSTANTS } from "../utils/TimerState";
import { loadFromLocalStorage, saveToLocalStorage } from "../utils/storage";

/**
 * Custom hook that provides timer functionality to React components
 */
export const useTimer = () => {
  // Load initial settings from localStorage
  const initialRoundTime = loadFromLocalStorage("roundTime", 5 * TIMER_CONSTANTS.MINUTE);

  // Create timer logic instance
  const timerLogic = useRef(
    new TimerLogic({
      roundTime: initialRoundTime,
    })
  );

  // Timer state
  const [timerState, setTimerState] = useState(timerLogic.current.getState());
  const [currentTime, setCurrentTime] = useState(new Date());

  // Subscribe to timer updates and update current time periodically
  useEffect(() => {
    const unsubscribe = timerLogic.current.subscribe(setTimerState);
    const interval = setInterval(() => setCurrentTime(new Date()), 1000);

    return () => {
      unsubscribe();
      clearInterval(interval);
      if (timerLogic.current) {
        timerLogic.current.destroy();
      }
    };
  }, []);

  // Actions
  const actions = {
    start: () => timerLogic.current.start(),
    pause: () => timerLogic.current.pause(),
    reset: () => timerLogic.current.reset(),
    toggle: () => timerLogic.current.toggle(),

    updateRoundTime: (newTime) => {
      const validated = Math.max(30 * TIMER_CONSTANTS.SECOND, newTime);
      timerLogic.current.updateSettings({ roundTime: validated });
      saveToLocalStorage("roundTime", validated);
    },

    changeRoundTime: (deltaSeconds) => {
      const newTime = timerState.roundTime + deltaSeconds * TIMER_CONSTANTS.SECOND;
      actions.updateRoundTime(newTime);
    },

    changeCurrentTime: (deltaSeconds) => {
      timerLogic.current.adjustCurrentTime(deltaSeconds * TIMER_CONSTANTS.SECOND);
    },
  };

  // Memoized formatters to prevent recreation on every render
  const formatters = useMemo(
    () => ({
      formatTime: (time) => {
        // Using Math.ceil for countdowns makes the display show the current second
        // until it has fully elapsed. E.g., 2999ms remaining is displayed as "3 seconds left".
        const totalSeconds = Math.max(0, Math.ceil(time / 1000));
        const minutes = Math.floor(totalSeconds / 60)
          .toString()
          .padStart(2, "0");
        const seconds = (totalSeconds % 60).toString().padStart(2, "0");
        return `${minutes}:${seconds}`;
      },

      formatCurrentTime: (date) => {
        if (!date) return "";
        const d = new Date(date);
        let hours = d.getHours();
        let minutes = d.getMinutes();
        const ampm = hours >= 12 ? "pm" : "am";
        hours = hours % 12 || 12;
        minutes = minutes < 10 ? "0" + minutes : minutes.toString();
        return `${hours}:${minutes.padStart(2, "0")} ${ampm}`;
      },
    }),
    []
  );

  // Computed state
  const isIdle = timerState.phase === TIMER_PHASES.IDLE;

  const getStatusText = useCallback(() => {
    if (timerState.isRunning) {
      return "Running";
    } else {
      return isIdle ? "Stopped" : "Paused";
    }
  }, [timerState.isRunning, isIdle]);

  const computed = {
    isIdle,
    isEndingSoon: timerState.phase === TIMER_PHASES.WORK && timerState.timeLeft <= TIMER_CONSTANTS.SOON_TIME,
    getStatusText,
  };

  return {
    // State
    state: {
      ...timerState,
      currentTime,
    },
    // Actions
    actions,
    // Formatters
    formatters,
    // Computed properties
    computed,
  };
};
