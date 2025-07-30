import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';

interface CelebrationProps {
  type: 'birdie' | 'eagle' | 'hole-in-one' | 'par' | 'achievement';
  show: boolean;
  onComplete?: () => void;
}

export function Celebration({ type, show, onComplete }: CelebrationProps) {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show) {
      // Trigger confetti based on achievement type
      switch (type) {
        case 'hole-in-one':
          // Epic celebration
          const duration = 3000;
          const animationEnd = Date.now() + duration;
          const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

          function randomInRange(min: number, max: number) {
            return Math.random() * (max - min) + min;
          }

          const interval: any = setInterval(function() {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
              clearInterval(interval);
              setTimeout(() => {
                setIsVisible(false);
                onComplete?.();
              }, 1000);
              return;
            }

            const particleCount = 50 * (timeLeft / duration);
            confetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
              colors: ['#FFD700', '#FFA500', '#FF6347']
            });
            confetti({
              ...defaults,
              particleCount,
              origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
              colors: ['#FFD700', '#FFA500', '#FF6347']
            });
          }, 250);
          break;

        case 'eagle':
          // Large celebration
          confetti({
            particleCount: 150,
            spread: 180,
            origin: { y: 0.6 },
            colors: ['#10b981', '#059669', '#047857']
          });
          setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
          }, 3000);
          break;

        case 'birdie':
          // Medium celebration
          confetti({
            particleCount: 100,
            spread: 70,
            origin: { y: 0.6 },
            colors: ['#3b82f6', '#2563eb', '#1d4ed8']
          });
          setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
          }, 2500);
          break;

        case 'par':
        case 'achievement':
          // Small celebration
          confetti({
            particleCount: 50,
            spread: 45,
            origin: { y: 0.6 }
          });
          setTimeout(() => {
            setIsVisible(false);
            onComplete?.();
          }, 2000);
          break;
      }
    }
  }, [show, type, onComplete]);

  const celebrations = {
    'hole-in-one': {
      emoji: '🏌️‍♂️',
      text: 'HOLE IN ONE!',
      subtext: 'Absolutely incredible!',
      color: 'text-yellow-600',
      bgColor: 'bg-gradient-to-r from-yellow-400 to-orange-500'
    },
    'eagle': {
      emoji: '🦅',
      text: 'EAGLE!',
      subtext: 'Outstanding shot!',
      color: 'text-green-600',
      bgColor: 'bg-gradient-to-r from-green-400 to-emerald-500'
    },
    'birdie': {
      emoji: '🐦',
      text: 'BIRDIE!',
      subtext: 'Great playing!',
      color: 'text-blue-600',
      bgColor: 'bg-gradient-to-r from-blue-400 to-indigo-500'
    },
    'par': {
      emoji: '⛳',
      text: 'PAR!',
      subtext: 'Solid play!',
      color: 'text-gray-600',
      bgColor: 'bg-gradient-to-r from-gray-400 to-gray-500'
    },
    'achievement': {
      emoji: '🏆',
      text: 'ACHIEVEMENT!',
      subtext: 'New milestone unlocked!',
      color: 'text-purple-600',
      bgColor: 'bg-gradient-to-r from-purple-400 to-pink-500'
    }
  };

  const celebration = celebrations[type];

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-50"
        >
          <motion.div
            initial={{ y: 50 }}
            animate={{ y: 0 }}
            exit={{ y: -50 }}
            transition={{ type: "spring", stiffness: 300, damping: 20 }}
            className="text-center"
          >
            <motion.div
              animate={{ 
                rotate: [0, -10, 10, -10, 10, 0],
                scale: [1, 1.1, 1, 1.1, 1]
              }}
              transition={{ duration: 0.5 }}
              className="text-8xl mb-4"
            >
              {celebration.emoji}
            </motion.div>
            
            <motion.h2
              className={`text-5xl font-bold ${celebration.color} mb-2`}
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 0.3 }}
            >
              {celebration.text}
            </motion.h2>
            
            <motion.p
              className="text-xl text-gray-600"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              {celebration.subtext}
            </motion.p>

            <motion.div
              className={`mt-4 px-6 py-2 rounded-full ${celebration.bgColor} text-white inline-block`}
              initial={{ width: 0 }}
              animate={{ width: "auto" }}
              transition={{ delay: 0.3, duration: 0.3 }}
            >
              <span className="font-semibold">+{type === 'hole-in-one' ? 1000 : type === 'eagle' ? 500 : type === 'birdie' ? 250 : 100} XP</span>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}