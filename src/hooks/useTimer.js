import { useEffect, useRef, useState } from "react";

const useTimer = (initialSeconds, storageKey = null) => {
  const [timeLeft, setTimeLeft] = useState(() => {
    if (storageKey) {
      const saved = localStorage.getItem(storageKey);
      if (saved !== null) return parseInt(saved, 10);
    }
    return initialSeconds;
  });

  // Ref so the 5s save interval always has fresh value without re-registering
  const timeLeftRef = useRef(timeLeft);
  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  // Save to localStorage every 5 seconds
  useEffect(() => {
    if (!storageKey) return;
    const saveId = setInterval(() => {
      localStorage.setItem(storageKey, timeLeftRef.current);
    }, 5000);
    return () => clearInterval(saveId);
  }, [storageKey]);

  // Countdown
  useEffect(() => {
    if (timeLeft <= 0) return;
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
  }, []);

  const minutes = Math.floor(timeLeft / 60);
  const seconds = timeLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, "0")}:${String(
    seconds
  ).padStart(2, "0")}`;
  const isExpired = timeLeft === 0;

  return { timeLeft, formattedTime, isExpired };
};

export default useTimer;
