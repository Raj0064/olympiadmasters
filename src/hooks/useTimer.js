import { useEffect, useState } from "react";

const useTimer = (durationSeconds, storageKey = null) => {
  const [timeLeft, setTimeLeft] = useState(null);

  // Initialize timer once exam duration is known
  useEffect(() => {
    if (!durationSeconds || !storageKey) return;

    const saved = localStorage.getItem(storageKey);
    let startedAt;

    if (saved) {
      // Returning student — use existing startedAt
      startedAt = parseInt(saved, 10);
    } else {
      // First entry — record now as startedAt
      startedAt = Date.now();
      localStorage.setItem(storageKey, startedAt);
    }

    const elapsed = Math.floor((Date.now() - startedAt) / 1000);
    const remaining = Math.max(durationSeconds - elapsed, 0);
    setTimeLeft(remaining);
  }, [durationSeconds]);

  // Countdown
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

    return () => clearInterval(timerId);
  }, [timeLeft === null]);

  const minutes = Math.floor((timeLeft ?? 0) / 60);
  const seconds = (timeLeft ?? 0) % 60;

  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
  const isExpired = timeLeft === 0;

  return { timeLeft, formattedTime, isExpired };
};

export default useTimer;
