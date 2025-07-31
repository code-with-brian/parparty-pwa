import { motion } from 'framer-motion';

interface GolfLoaderProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
  text?: string;
}

export function GolfLoader({ size = 'md', color = 'green', text }: GolfLoaderProps) {
  const sizes = {
    sm: { ball: 24, container: 60 },
    md: { ball: 32, container: 80 },
    lg: { ball: 48, container: 120 }
  };

  const { ball, container } = sizes[size];

  return (
    <div className="flex flex-col items-center justify-center space-y-4">
      <div className={`relative`} style={{ width: container, height: container }}>
        {/* Golf hole */}
        <div 
          className={`absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-full`}
          style={{ width: ball * 0.8, height: ball * 0.3 }}
        />
        
        {/* Golf ball */}
        <motion.div
          className={`absolute left-1/2 transform -translate-x-1/2 bg-slate-200 rounded-full shadow-lg`}
          style={{ 
            width: ball, 
            height: ball,
            background: `radial-gradient(circle at 30% 30%, #e2e8f0, #cbd5e1)`
          }}
          initial={{ y: 0 }}
          animate={{ 
            y: [0, -container * 0.6, 0],
            rotate: [0, 360, 720]
          }}
          transition={{
            y: {
              duration: 1.2,
              repeat: Infinity,
              ease: "easeInOut"
            },
            rotate: {
              duration: 1.2,
              repeat: Infinity,
              ease: "linear"
            }
          }}
        >
          {/* Dimples on golf ball */}
          <div className="absolute inset-0 rounded-full overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-1.5 h-1.5 bg-gray-300 rounded-full opacity-50" />
            <div className="absolute top-1/3 right-1/4 w-1.5 h-1.5 bg-gray-300 rounded-full opacity-50" />
            <div className="absolute bottom-1/4 left-1/3 w-1.5 h-1.5 bg-gray-300 rounded-full opacity-50" />
          </div>
        </motion.div>

        {/* Shadow */}
        <motion.div
          className="absolute bottom-0 left-1/2 transform -translate-x-1/2 bg-black/20 rounded-full blur-sm"
          style={{ width: ball * 0.8, height: ball * 0.2 }}
          animate={{
            scale: [1, 0.8, 1],
            opacity: [0.3, 0.1, 0.3]
          }}
          transition={{
            duration: 1.2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>
      
      {text && (
        <motion.p 
          className="text-green-400 font-medium text-sm"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
        >
          {text}
        </motion.p>
      )}
    </div>
  );
}

export function GolfLoaderInline({ size = 'sm' }: { size?: 'sm' | 'md' | 'lg' }) {
  const sizes = {
    sm: 16,
    md: 20,
    lg: 24
  };

  return (
    <motion.div
      className="inline-block bg-slate-200 rounded-full shadow-sm relative"
      style={{ 
        width: sizes[size], 
        height: sizes[size],
        background: `radial-gradient(circle at 30% 30%, #ffffff, #f0f0f0)`
      }}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <div className="absolute inset-0 rounded-full overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-0.5 h-0.5 bg-gray-300 rounded-full opacity-50" />
        <div className="absolute bottom-1/4 right-1/4 w-0.5 h-0.5 bg-gray-300 rounded-full opacity-50" />
      </div>
    </motion.div>
  );
}