'use client';

import React from 'react';
import { motion } from 'framer-motion';

interface WaterTankProps {
  levelPct: number; // 0 to 100
  isLeaking?: boolean;
  isStabilized?: boolean;
  colorTheme?: 'cyan' | 'indigo' | 'emerald' | 'rose';
}

export default function WaterTank({
  levelPct,
  isLeaking = false,
  isStabilized = false,
  colorTheme = 'cyan'
}: WaterTankProps) {
  // Clamp level between 5 and 95 so tank always has some visual presence
  const clampedPct = Math.min(Math.max(levelPct, 5), 95);
  // Calculate SVG Y position: viewBox height is 200, so height of water is 200 * (clampedPct / 100)
  const waterHeight = (200 * clampedPct) / 100;
  const waterY = 200 - waterHeight;

  // Colors based on state
  let gradStart = '#06b6d4'; // cyan
  let gradEnd = '#0284c7';   // sky/blue
  let waveOpacity = 0.85;

  if (isLeaking) {
    gradStart = '#f43f5e'; // rose-500
    gradEnd = '#e11d48';   // rose-600
  } else if (isStabilized) {
    gradStart = '#10b981'; // emerald-500
    gradEnd = '#059669';   // emerald-600
  } else if (clampedPct < 45) {
    gradStart = '#f59e0b'; // amber-500
    gradEnd = '#d97706';
  }

  const gradId = `water-grad-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="relative flex flex-col items-center justify-center w-full py-2">
      {/* 3D Glass Cylindrical Tank Container */}
      <div className="relative w-28 h-48 rounded-[36px] p-[3px] bg-gradient-to-b from-slate-600/40 via-slate-800/30 to-slate-700/50 shadow-[inset_0_2px_6px_rgba(255,255,255,0.15),0_12px_24px_rgba(0,0,0,0.4)] backdrop-blur-md overflow-hidden">
        
        {/* Glass reflection highlight on left edge */}
        <div className="absolute left-1.5 top-3 bottom-3 w-1.5 bg-gradient-to-b from-white/30 via-white/10 to-transparent rounded-full z-20 pointer-events-none" />
        {/* Glass reflection on right edge */}
        <div className="absolute right-1.5 top-4 bottom-4 w-1 bg-gradient-to-b from-white/15 via-white/5 to-transparent rounded-full z-20 pointer-events-none" />

        {/* Measurement notches on inner glass */}
        <div className="absolute right-3 top-8 bottom-8 flex flex-col justify-between z-20 pointer-events-none opacity-40">
          <div className="w-2.5 h-[1.5px] bg-slate-300" />
          <div className="w-1.5 h-[1.5px] bg-slate-400" />
          <div className="w-2.5 h-[1.5px] bg-slate-300" />
          <div className="w-1.5 h-[1.5px] bg-slate-400" />
          <div className="w-2.5 h-[1.5px] bg-slate-300" />
        </div>

        {/* SVG Animated Water Surface & Liquid Body */}
        <svg
          viewBox="0 0 100 200"
          preserveAspectRatio="none"
          className="w-full h-full rounded-[33px] overflow-hidden"
        >
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor={gradStart} stopOpacity="0.9" />
              <stop offset="60%" stopColor={gradEnd} stopOpacity="0.95" />
              <stop offset="100%" stopColor={isLeaking ? '#9f1239' : '#0f172a'} stopOpacity="1" />
            </linearGradient>

            {/* Wave clip path for liquid top */}
            <pattern id="bubbles" width="20" height="20" patternUnits="userSpaceOnUse">
              <circle cx="5" cy="5" r="1.5" fill="rgba(255,255,255,0.25)" />
              <circle cx="15" cy="14" r="1" fill="rgba(255,255,255,0.2)" />
            </pattern>
          </defs>

          {/* Liquid Body Rectangle */}
          <motion.rect
            initial={{ height: 0, y: 200 }}
            animate={{ height: waterHeight, y: waterY }}
            transition={{ type: 'spring', damping: 20, stiffness: 60 }}
            x="0"
            width="100"
            fill={`url(#${gradId})`}
          />

          {/* Rising Bubbles inside water */}
          <motion.rect
            animate={{ y: [0, -40] }}
            transition={{ repeat: Infinity, duration: 4, ease: 'linear' }}
            x="0"
            y={waterY}
            width="100"
            height={waterHeight}
            fill="url(#bubbles)"
            opacity={0.6}
          />

          {/* Animated Wave 1 on water crest */}
          <motion.path
            animate={{
              d: [
                `M 0 ${waterY} Q 25 ${waterY - 5} 50 ${waterY} T 100 ${waterY} V 200 H 0 Z`,
                `M 0 ${waterY} Q 25 ${waterY + 5} 50 ${waterY} T 100 ${waterY} V 200 H 0 Z`,
                `M 0 ${waterY} Q 25 ${waterY - 5} 50 ${waterY} T 100 ${waterY} V 200 H 0 Z`
              ]
            }}
            transition={{ repeat: Infinity, duration: 3, ease: 'easeInOut' }}
            fill={gradStart}
            opacity="0.5"
          />

          {/* Animated Wave 2 (counter-phase for natural fluid sloshing) */}
          <motion.path
            animate={{
              d: [
                `M 0 ${waterY} Q 30 ${waterY + 4} 60 ${waterY - 4} T 100 ${waterY} V 200 H 0 Z`,
                `M 0 ${waterY} Q 30 ${waterY - 4} 60 ${waterY + 4} T 100 ${waterY} V 200 H 0 Z`,
                `M 0 ${waterY} Q 30 ${waterY + 4} 60 ${waterY - 4} T 100 ${waterY} V 200 H 0 Z`
              ]
            }}
            transition={{ repeat: Infinity, duration: 2.2, ease: 'easeInOut' }}
            fill="rgba(255,255,255,0.2)"
          />
        </svg>

        {/* Ambient liquid glow inside the cylinder */}
        <div
          className="absolute inset-0 rounded-[33px] pointer-events-none mix-blend-overlay opacity-30"
          style={{ background: `radial-gradient(circle at 50% 80%, ${gradStart}, transparent 70%)` }}
        />
      </div>

      {/* Animated Water Dripping Drops when Leaking */}
      {isLeaking && (
        <div className="relative w-8 h-8 flex flex-col items-center justify-start overflow-visible pt-1 pointer-events-none">
          {/* Drop 1 */}
          <motion.div
            animate={{
              y: [0, 22],
              opacity: [1, 0],
              scale: [1, 0.4]
            }}
            transition={{
              repeat: Infinity,
              duration: 0.9,
              ease: 'easeIn'
            }}
            className="w-2 h-2.5 bg-rose-500 rounded-full blur-[0.3px] shadow-[0_0_8px_rgba(244,63,94,0.8)]"
            style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
          />

          {/* Drop 2 (offset) */}
          <motion.div
            animate={{
              y: [0, 22],
              opacity: [1, 0],
              scale: [0.8, 0.3]
            }}
            transition={{
              repeat: Infinity,
              duration: 1.1,
              delay: 0.45,
              ease: 'easeIn'
            }}
            className="w-1.5 h-2 bg-rose-400 rounded-full blur-[0.2px] -mt-1 shadow-[0_0_6px_rgba(244,63,94,0.7)]"
            style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}
          />
        </div>
      )}
    </div>
  );
}
