import { useEffect } from "react";

/**
 * useShuffle
 * Calls callback on the hour, :15, :30, :45.
 */
export function useShuffle(callback) {
  useEffect(() => {
    if (!callback) return;

    function scheduleNext() {
      const now = new Date();
      const minutes = now.getMinutes();
      const seconds = now.getSeconds();
      const ms = now.getMilliseconds();

      // Find next quarter-hour mark
      const nextQuarter = Math.ceil(minutes / 15) * 15;
      const nextDate = new Date(now);

      if (nextQuarter === 60) {
        nextDate.setHours(now.getHours() + 1);
        nextDate.setMinutes(0, 0, 0);
      } else {
        nextDate.setMinutes(nextQuarter, 0, 0);
      }

      const delay = nextDate - now;

      return setTimeout(() => {
        callback();
        scheduleNext(); // schedule again
      }, delay);
    }

    const timer = scheduleNext();

    return () => clearTimeout(timer);
  }, [callback]);
}
