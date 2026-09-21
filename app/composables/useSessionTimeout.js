export const useSessionTimeout = () => {
  const config = useRuntimeConfig();
  const { isRememberMe, isAuthenticated, logout } = useAuth();

  const idleTimeoutSeconds = config.public.sessionIdleTimeoutSeconds || 180;
  const warningDurationSeconds = config.public.sessionWarningSeconds || 30;
  const idleTriggerSeconds = Math.max(10, idleTimeoutSeconds - warningDurationSeconds);

  const showWarningModal = useState('session_warning_modal', () => false);
  const countdownSeconds = useState('session_countdown_seconds', () => warningDurationSeconds);

  let idleTimer = null;
  let countdownInterval = null;

  const resetTimers = () => {
    if (idleTimer) clearTimeout(idleTimer);
    if (countdownInterval) clearInterval(countdownInterval);
    showWarningModal.value = false;
    countdownSeconds.value = warningDurationSeconds;
  };

  const startWarningCountdown = () => {
    showWarningModal.value = true;
    countdownSeconds.value = warningDurationSeconds;

    countdownInterval = setInterval(() => {
      countdownSeconds.value -= 1;
      if (countdownSeconds.value <= 0) {
        clearInterval(countdownInterval);
        showWarningModal.value = false;
        logout('session_timeout');
      }
    }, 1000);
  };

  const startIdleWatch = () => {
    resetTimers();

    if (isRememberMe.value || !isAuthenticated.value) {
      return;
    }

    idleTimer = setTimeout(() => {
      startWarningCountdown();
    }, idleTriggerSeconds * 1000);
  };

  const onUserActivity = () => {
    if (!showWarningModal.value && !isRememberMe.value && isAuthenticated.value) {
      startIdleWatch();
    }
  };

  const extendSession = async () => {
    try {
      await $fetch('/api/auth/session-ping', { method: 'POST' });
    } catch (err) {
      console.error('Failed to ping session:', err);
    }
    resetTimers();
    startIdleWatch();
  };

  const initSessionTracker = () => {
    if (import.meta.client) {
      const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach((evt) => {
        window.addEventListener(evt, onUserActivity, { passive: true });
      });

      startIdleWatch();
    }
  };

  const destroySessionTracker = () => {
    if (import.meta.client) {
      resetTimers();
      const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
      events.forEach((evt) => {
        window.removeEventListener(evt, onUserActivity);
      });
    }
  };

  return {
    showWarningModal,
    countdownSeconds,
    extendSession,
    initSessionTracker,
    destroySessionTracker,
    startIdleWatch,
  };
};
