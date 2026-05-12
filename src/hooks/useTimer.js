import { useEffect, useState } from "react";

const useTimer = (durationSeconds, storageKey = null) => {
  const [timeLeft, setTimeLeft] = useState(null);

  // Initialize timer once exam duration is known
  useEffect(() => {
    if (!durationSeconds || !storageKey) return;

    const saved = localStorage.getItem(storageKey);
    let startedAt;

    if (saved !== null) {
      const parsed = parseInt(saved, 10);

      if (!isNaN(parsed) && isFinite(parsed) && parsed > 0) {
        // Valid saved timestamp — returning student
        startedAt = parsed;
      } else {
        // Corrupted value — treat as fresh start and overwrite
        console.warn(
          "[useTimer] Corrupted startedAt in localStorage, resetting."
        );
        startedAt = Date.now();
        localStorage.setItem(storageKey, startedAt);
      }
    } else {
      // First entry
      startedAt = Date.now();
      localStorage.setItem(storageKey, startedAt);
    }

    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = Math.max(durationSeconds - elapsed, 0);
    setTimeLeft(remaining);
  }, [durationSeconds, storageKey]); // ← also added storageKey as dep (see Bug 3)

  // Countdown — restarts whenever timeLeft is freshly initialised (was null, now a number)
  useEffect(() => {
    if (timeLeft === null || timeLeft <= 0) return;

    const timerId = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerId);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timerId); // ← cleanup prevents double-interval on re-init
  }, [timeLeft === null]); // keep the boolean trick — only re-fires on null↔number transition

  const minutes = Math.floor((timeLeft ?? 0) / 60);
  const seconds = (timeLeft ?? 0) % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
  const isExpired = timeLeft === 0;

  return { timeLeft, formattedTime, isExpired };
};

export default useTimer;
