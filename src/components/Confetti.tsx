import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';

export const Confetti = () => {
  const [pieces, setPieces] = useState<any[]>([]);

  useEffect(() => {
    const colors = ['#00E5FF', '#FF5A00', '#DCEE0D', '#000000', '#FFFFFF'];
    const newPieces = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: -20,
      size: Math.random() * 8 + 4,
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: Math.random() * 2,
      duration: Math.random() * 2 + 2,
      rotation: Math.random() * 360,
    }));
    setPieces(newPieces);
  }, []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {pieces.map(pc => (
        <motion.div
          key={pc.id}
          initial={{ x: `${pc.x}%`, y: '-10%', rotate: 0 }}
          animate={{ 
            y: '110%', 
            rotate: pc.rotation + 360,
            x: `${pc.x + (Math.random() * 10 - 5)}%`
          }}
          transition={{ 
            duration: pc.duration, 
            delay: pc.delay, 
            repeat: Infinity,
            ease: 'linear'
          }}
          style={{
            position: 'absolute',
            width: pc.size,
            height: pc.size,
            backgroundColor: pc.color,
            borderRadius: pc.size > 8 ? '50%' : '0'
          }}
        />
      ))}
    </div>
  );
};
