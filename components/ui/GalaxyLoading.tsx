'use client'

import { useEffect, useState } from 'react'

export function GalaxyLoading({ text = 'AI Health Checkup in progress...' }: { text?: string }) {
  const [particles, setParticles] = useState<Array<{ id: number; x: number; y: number; size: number; duration: number; delay: number }>>([])

  useEffect(() => {
    const newParticles = Array.from({ length: 40 }).map((_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: Math.random() * 3 + 1,
      duration: Math.random() * 3 + 2,
      delay: Math.random() * 2,
    }))
    setParticles(newParticles)
  }, [])

  return (
    <div className="flex-1 w-full flex flex-col items-center justify-center overflow-hidden bg-background relative min-h-[60vh]">
      {/* Dynamic Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-secondary/5 via-background to-background" />

      {/* Particles */}
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-secondary/40"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `float ${p.duration}s ease-in-out infinite alternate`,
            animationDelay: `${p.delay}s`,
          }}
        />
      ))}

      {/* Main Animation Container */}
      <div className="relative z-10 flex flex-col items-center gap-10">

        {/* Galaxy AI Stars Logo Container */}
        <div className="relative w-32 h-32 flex items-center justify-center galaxy-container">
          {/* Main Glow */}
          <div className="absolute inset-0 bg-secondary/20 blur-2xl rounded-full animate-pulse" />

          {/* The entire SVG canvas now handles the smooth continuous clockwise rotation */}
          <svg
            width="100"
            height="100"
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_0_20px_rgba(255,255,255,0.7)]"
          >
            <defs>
              <linearGradient id="starGradient" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop stopColor="#000000" stopOpacity="0.9" />
                <stop offset="1" stopColor="#000000" />
              </linearGradient>
            </defs>

            <g fill="url(#starGradient)">
              {/* Cluster A (Spawns at 0s) */}
              <g style={{ transform: 'translate(-5px, 5px) scale(0.9)' }}>
                <g className="galaxy-star-1">
                  <path d="M 50 30 C 50 45 45 50 30 50 C 45 50 50 55 50 70 C 50 55 55 50 70 50 C 55 50 50 45 50 30 Z" />
                </g>
              </g>
              <g style={{ transform: 'translate(15px, -15px) scale(0.6)' }}>
                <g className="galaxy-star-2">
                  <path d="M 50 30 C 50 45 45 50 30 50 C 45 50 50 55 50 70 C 50 55 55 50 70 50 C 55 50 50 45 50 30 Z" />
                </g>
              </g>
              <g style={{ transform: 'translate(10px, 15px) scale(0.4)' }}>
                <g className="galaxy-star-3">
                  <path d="M 50 30 C 50 45 45 50 30 50 C 45 50 50 55 50 70 C 50 55 55 50 70 50 C 55 50 50 45 50 30 Z" />
                </g>
              </g>

              {/* Cluster B (Spawns at 1.5s) */}
              <g style={{ transform: 'translate(-5px, 5px) scale(0.9)' }}>
                <g className="galaxy-star-4">
                  <path d="M 50 30 C 50 45 45 50 30 50 C 45 50 50 55 50 70 C 50 55 55 50 70 50 C 55 50 50 45 50 30 Z" />
                </g>
              </g>
              <g style={{ transform: 'translate(15px, -15px) scale(0.6)' }}>
                <g className="galaxy-star-5">
                  <path d="M 50 30 C 50 45 45 50 30 50 C 45 50 50 55 50 70 C 50 55 55 50 70 50 C 55 50 50 45 50 30 Z" />
                </g>
              </g>
              <g style={{ transform: 'translate(10px, 15px) scale(0.4)' }}>
                <g className="galaxy-star-6">
                  <path d="M 50 30 C 50 45 45 50 30 50 C 45 50 50 55 50 70 C 50 55 55 50 70 50 C 55 50 50 45 50 30 Z" />
                </g>
              </g>
            </g>
          </svg>
        </div>

        {/* Text */}
        <div className="flex flex-col items-center gap-3 relative z-10">
          <h2 className="text-xl md:text-2xl font-semibold bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text text-transparent text-shimmer bg-[length:200%_auto]">
            {text}
          </h2>
        </div>
      </div>

      <style dangerouslySetInnerHTML={{
        __html: `
        /* Main subtle bobbing container */
        .galaxy-container {
          animation: magical-float 4s ease-in-out infinite;
        }

        /* Diagonal shooting stars */
        .galaxy-star-1, .galaxy-star-2, .galaxy-star-3, .galaxy-star-4, .galaxy-star-5, .galaxy-star-6 {
          animation: star-shoot 3s linear infinite;
          transform-origin: 50px 50px;
          opacity: 0;
        }
        .galaxy-star-1 { animation-delay: 0s; }
        .galaxy-star-2 { animation-delay: 0.15s; }
        .galaxy-star-3 { animation-delay: 0.3s; }
        .galaxy-star-4 { animation-delay: 1.5s; }
        .galaxy-star-5 { animation-delay: 1.65s; }
        .galaxy-star-6 { animation-delay: 1.8s; }

        .text-shimmer {
          animation: shimmer 2s linear infinite;
        }

        @keyframes float {
          0% { transform: translateY(0px) scale(1); opacity: 0.3; }
          100% { transform: translateY(-20px) scale(1.5); opacity: 0.8; }
        }
        @keyframes magical-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes star-shoot {
          0% {
            opacity: 0;
            transform: translate(-30px, -30px) scale(0);
          }
          20% { opacity: 1; }
          50% {
            opacity: 1;
            transform: translate(0px, 0px) scale(1);
          }
          80% { opacity: 1; }
          100% {
            opacity: 0;
            transform: translate(30px, 30px) scale(0);
          }
        }
        @keyframes shimmer {
          0% { background-position: 200% center; }
          100% { background-position: -200% center; }
        }
      `}} />
    </div>
  )
}