import React, { useEffect, useState, useCallback } from 'react';
import confetti from 'canvas-confetti';
import { motion, AnimatePresence } from 'framer-motion';

// Global function to trigger success confetti
export function fireConfetti() {
  const duration = 2500;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

  const randomInRange = (min, max) => Math.random() * (max - min) + min;

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) {
      return clearInterval(interval);
    }

    const particleCount = 50 * (timeLeft / duration);
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 } }));
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 } }));
  }, 250);
}

// Global function to trigger a subtle error shake effect
export function useShake() {
  const [isShaking, setShaking] = useState(false);
  const shake = useCallback(() => {
    setShaking(true);
    setTimeout(() => setShaking(false), 500);
  }, []);
  
  const shakeAnimation = {
    x: isShaking ? [-10, 10, -10, 10, -5, 5, 0] : 0,
    transition: { duration: 0.4 }
  };

  return { isShaking, shake, shakeAnimation };
}

// A reusable animated combo counter
export function ComboCounter({ count }) {
  if (!count || count < 2) return null;
  return (
    <AnimatePresence>
      <motion.div
        key={count}
        initial={{ scale: 0.5, opacity: 0, y: 20 }}
        animate={{ scale: 1.2, opacity: 1, y: 0 }}
        exit={{ scale: 0.8, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 15 }}
        className="comboCounter"
      >
        <span>🔥 КОМБО x{count}!</span>
      </motion.div>
    </AnimatePresence>
  );
}
