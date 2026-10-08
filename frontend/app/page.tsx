'use client';

import { useRef, useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import {
  Droplets,
  ArrowRight,
  ShieldCheck,
  Cpu,
  Activity,
  Layers,
  Sparkles,
  Zap,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Sun,
  Moon,
  ChevronRight,
  TrendingDown,
  Gauge,
  Sliders,
  Shield
} from 'lucide-react';

export default function LandingPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');

  useEffect(() => {
    const saved = localStorage.getItem('aquaops_theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.className = saved;
    } else {
      document.documentElement.className = 'dark';
    }
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('aquaops_theme', next);
    document.documentElement.className = next;
  };

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end']
  });

  const smoothProgress = useSpring(scrollYProgress, { stiffness: 100, damping: 30, restDelta: 0.001 });

  // Scroll Transforms
  const heroScale = useTransform(smoothProgress, [0, 0.22], [1, 0.9]);
  const heroOpacity = useTransform(smoothProgress, [0, 0.18], [1, 0.08]);
  const heroY = useTransform(smoothProgress, [0, 0.22], [0, -80]);

  const bannerX = useTransform(smoothProgress, [0.05, 0.45], [-250, 180]);
  const bannerRotate = useTransform(smoothProgress, [0.05, 0.45], [-3, 3]);

  const problemScale = useTransform(smoothProgress, [0.15, 0.38], [0.88, 1]);
  const problemY = useTransform(smoothProgress, [0.15, 0.4], [90, 0]);

  const pipelineRotateX = useTransform(smoothProgress, [0.35, 0.65], [20, 0]);
  const pipelineScale = useTransform(smoothProgress, [0.35, 0.65], [0.85, 1]);

  const isDark = theme === 'dark';

  return (
    <div
      ref={containerRef}
      className={`min-h-[340vh] relative overflow-hidden font-sans transition-colors duration-500 ${
        isDark ? 'bg-[#030712] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Dynamic Ambient Background Glows */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div
          className={`absolute top-[-15%] left-[-10%] w-[55vw] h-[55vw] rounded-full blur-[150px] transition-all duration-700 ${
            isDark ? 'bg-indigo-600/15' : 'bg-blue-400/10'
          }`}
        />
        <div
          className={`absolute bottom-[-10%] right-[-10%] w-[55vw] h-[55vw] rounded-full blur-[160px] transition-all duration-700 ${
            isDark ? 'bg-violet-600/15' : 'bg-indigo-300/15'
          }`}
        />
        <div
          className={`absolute top-[45%] right-[20%] w-[40vw] h-[40vw] rounded-full blur-[130px] transition-all duration-700 ${
            isDark ? 'bg-blue-500/10' : 'bg-sky-400/10'
          }`}
        />
        {/* Subtle dot matrix */}
        <div
          className={`w-full h-full ${isDark ? 'opacity-15' : 'opacity-25'}`}
          style={{
            backgroundImage: `radial-gradient(${isDark ? 'rgba(99, 102, 241, 0.3)' : 'rgba(79, 70, 229, 0.2)'} 1px, transparent 1px)`,
            backgroundSize: '32px 32px'
          }}
        />
      </div>

      {/* Top Floating Glass Navigation */}
      <motion.nav
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className={`fixed top-0 left-0 right-0 z-50 px-6 py-4 border-b backdrop-blur-2xl flex items-center justify-between transition-colors duration-300 ${
          isDark
            ? 'border-slate-800/80 bg-slate-950/75'
            : 'border-slate-200/90 bg-white/75 shadow-sm'
        }`}
      >
        <Link href="/" className="flex items-center space-x-3 group">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:rotate-12 transition-all duration-300">
            <Droplets className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <span
              className={`font-black text-xl tracking-tight transition ${
                isDark ? 'text-white group-hover:text-indigo-400' : 'text-slate-900 group-hover:text-indigo-600'
              }`}
            >
              AquaOps
            </span>
            <span className="text-[10px] block font-mono text-indigo-500 font-bold uppercase tracking-widest">
              Autonomous Hydraulics
            </span>
          </div>
        </Link>

        <div className="flex items-center space-x-3">
          {/* Dark / Light Toggle Button */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2.5 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 text-amber-400 hover:border-slate-700'
                : 'border-slate-200 bg-white text-slate-700 shadow-sm hover:border-slate-300'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            href="/login"
            className={`text-xs font-semibold px-4 py-2.5 rounded-xl border transition-all hover:scale-105 ${
              isDark
                ? 'border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
            }`}
          >
            Sign In
          </Link>

          <Link
            href="/manager"
            className="text-xs font-bold px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 via-blue-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40 transition-all flex items-center space-x-2 hover:scale-105 active:scale-95"
          >
            <span>Command Center</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </motion.nav>

      {/* Dynamic Scroll Progress Bar */}
      <motion.div
        style={{ scaleX: smoothProgress }}
        className="fixed top-[65px] left-0 right-0 h-[2.5px] bg-gradient-to-r from-indigo-500 via-blue-500 to-violet-500 z-50 origin-left"
      />

      {/* SECTION 1: HERO */}
      <motion.section
        style={{ scale: heroScale, opacity: heroOpacity, y: heroY }}
        className="min-h-screen pt-36 pb-20 px-6 max-w-5xl mx-auto flex flex-col items-center justify-center text-center relative z-10"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.6 }}
          className={`inline-flex items-center space-x-2 px-4 py-1.5 rounded-full border text-xs font-mono font-semibold mb-6 ${
            isDark
              ? 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'
              : 'border-indigo-200 bg-indigo-50 text-indigo-700 shadow-sm'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
          <span>AUTONOMOUS WATER OPERATIONS PLATFORM</span>
        </motion.div>

        {/* Hero Title */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className={`text-5xl md:text-8xl font-black tracking-tight leading-[1.05] max-w-4xl ${
            isDark ? 'text-white' : 'text-slate-900'
          }`}
        >
          Your water grid, <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-500 to-violet-600 filter drop-shadow-[0_0_40px_rgba(99,102,241,0.3)]">
            managed intelligently.
          </span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className={`mt-6 text-lg md:text-xl max-w-2xl leading-relaxed font-normal ${
            isDark ? 'text-slate-400' : 'text-slate-600'
          }`}
        >
          Detect waste. Investigate abnormal consumption. Take operational action.
          <strong className={isDark ? 'text-slate-200 ml-1' : 'text-slate-900 ml-1'}>
            Before campus tanks run dry.
          </strong>
        </motion.p>

        {/* CTA Group */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4"
        >
          <Link
            href="/manager"
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-blue-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold text-base shadow-[0_0_30px_rgba(99,102,241,0.4)] hover:shadow-[0_0_45px_rgba(99,102,241,0.6)] transition-all hover:scale-105 active:scale-95 flex items-center justify-center space-x-2"
          >
            <span>Explore AquaOps</span>
            <ArrowRight className="w-5 h-5" />
          </Link>
          <Link
            href="/student"
            className={`w-full sm:w-auto px-8 py-4 rounded-2xl border font-semibold text-base transition-all hover:scale-105 flex items-center justify-center space-x-2 ${
              isDark
                ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm hover:border-slate-300'
            }`}
          >
            <span>Hostel Resident View</span>
          </Link>
        </motion.div>

        {/* Scroll Indicator */}
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ repeat: Infinity, duration: 2 }}
          className={`mt-16 text-xs font-mono flex flex-col items-center space-y-2 ${
            isDark ? 'text-slate-500' : 'text-slate-400'
          }`}
        >
          <span>SCROLL TO EXPLORE ARCHITECTURE</span>
          <div
            className={`w-5 h-9 rounded-full border-2 flex items-start justify-center p-1 ${
              isDark ? 'border-slate-800' : 'border-slate-300'
            }`}
          >
            <motion.div
              animate={{ y: [0, 14, 0] }}
              transition={{ repeat: Infinity, duration: 1.5 }}
              className="w-1.5 h-1.5 rounded-full bg-indigo-500"
            />
          </div>
        </motion.div>
      </motion.section>

      {/* DRIFTING PARALLAX BANNER */}
      <motion.div
        style={{ x: bannerX, rotate: bannerRotate }}
        className={`w-[160vw] -ml-[30vw] py-4 border-y backdrop-blur-xl font-mono text-sm tracking-widest uppercase flex items-center justify-around select-none shadow-xl ${
          isDark
            ? 'bg-gradient-to-r from-indigo-950/40 via-blue-950/40 to-violet-950/40 border-indigo-500/20 text-indigo-300'
            : 'bg-gradient-to-r from-indigo-50/80 via-blue-50/80 to-violet-50/80 border-indigo-200 text-indigo-800'
        }`}
      >
        <span>&bull; SENSE &bull;</span>
        <span>&bull; DETECT &bull;</span>
        <span>&bull; INVESTIGATE &bull;</span>
        <span>&bull; REASON &bull;</span>
        <span>&bull; ACT &bull;</span>
        <span>&bull; VERIFY &bull;</span>
        <span>&bull; REALTIME TELEMETRY &bull;</span>
        <span>&bull; HUMAN-IN-THE-LOOP &bull;</span>
      </motion.div>

      {/* SECTION 2: PROBLEM VS SOLUTION */}
      <motion.section
        style={{ scale: problemScale, y: problemY }}
        className="min-h-screen py-24 px-6 max-w-6xl mx-auto flex flex-col justify-center relative z-10"
      >
        <div className="text-center space-y-4 mb-16">
          <span
            className={`text-xs font-mono uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${
              isDark
                ? 'bg-rose-500/10 border-rose-500/20 text-rose-400'
                : 'bg-rose-50 border-rose-200 text-rose-600'
            }`}
          >
            The Operational Gap
          </span>
          <h2 className={`text-4xl md:text-6xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Water waste rarely announces itself.
          </h2>
          <p className={`text-base max-w-2xl mx-auto font-light ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            A sub-surface pipe rupture or overflowing hostel riser wastes thousands of litres before anyone notices.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Card 1: Legacy Problem */}
          <div
            className={`border rounded-3xl p-8 backdrop-blur-xl space-y-6 shadow-xl relative overflow-hidden transition-all ${
              isDark
                ? 'bg-gradient-to-br from-rose-950/20 to-slate-900/60 border-rose-900/30'
                : 'bg-gradient-to-br from-rose-50/80 to-white border-rose-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  Traditional Campus Response
                </h3>
                <span className="text-xs text-rose-500 font-mono">Slow &bull; Uncoordinated &bull; Expensive</span>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              {[
                'Pipeline leakage runs unnoticed during midnight & early morning hours',
                'Hostel water tanks drain completely dry before alarms trigger',
                'Emergency water tankers cost thousands and disrupt campus operations'
              ].map((text, i) => (
                <div
                  key={i}
                  className={`p-3.5 border rounded-2xl flex items-center space-x-3 ${
                    isDark
                      ? 'bg-slate-950/60 border-slate-800/80 text-slate-300'
                      : 'bg-white border-rose-100 text-slate-700 shadow-sm'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-rose-500 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Card 2: AquaOps Solution */}
          <div
            className={`border rounded-3xl p-8 backdrop-blur-xl space-y-6 shadow-2xl relative overflow-hidden transition-all ${
              isDark
                ? 'bg-gradient-to-br from-indigo-950/30 via-slate-900/80 to-violet-950/30 border-indigo-500/40'
                : 'bg-gradient-to-br from-indigo-50/90 via-white to-blue-50/90 border-indigo-200'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <CheckCircle2 className="w-6 h-6 text-indigo-500" />
              </div>
              <div>
                <h3 className={`text-xl font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  AquaOps Autonomous Mesh
                </h3>
                <span className="text-xs text-indigo-500 font-mono">Autonomous &bull; Verified &bull; Realtime</span>
              </div>
            </div>

            <div className="space-y-4 text-sm">
              {[
                'Statistical Z-score algorithms detect consumption spikes within seconds',
                'Agent cross-checks weather, historical baselines, and peer campus blocks',
                'Closed-loop verification certifies pump throttle and measures water saved'
              ].map((text, i) => (
                <div
                  key={i}
                  className={`p-3.5 border rounded-2xl flex items-center space-x-3 ${
                    isDark
                      ? 'bg-slate-950/70 border-indigo-500/20 text-slate-200'
                      : 'bg-white border-indigo-100 text-slate-800 shadow-sm'
                  }`}
                >
                  <span className="w-2 h-2 rounded-full bg-indigo-500 flex-shrink-0" />
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>

      {/* SECTION 3: AGENTIC 6-STEP CYCLE */}
      <motion.section
        style={{ rotateX: pipelineRotateX, scale: pipelineScale }}
        className="min-h-screen py-24 px-6 max-w-6xl mx-auto flex flex-col justify-center relative z-10"
      >
        <div className="text-center space-y-4 mb-16">
          <span
            className={`text-xs font-mono uppercase font-bold tracking-widest px-3 py-1 rounded-full border ${
              isDark
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                : 'bg-indigo-50 border-indigo-200 text-indigo-700'
            }`}
          >
            Continuous Operational Loop
          </span>
          <h2 className={`text-4xl md:text-6xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
            Not another chatbot. <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-500 to-violet-600">
              An AI Operations Agent.
            </span>
          </h2>
          <p className={`text-base max-w-xl mx-auto font-light ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Equipped with real tools, diagnostic capabilities, and operational actuators.
          </p>
        </div>

        {/* 6 Stage Interactive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              step: '01',
              title: 'Sense',
              icon: Activity,
              desc: 'Sub-second telemetry streams from ultrasonic tank meters and flow sensors.'
            },
            {
              step: '02',
              title: 'Detect',
              icon: Zap,
              desc: 'Statistical Z-score evaluations flag abnormal flow rates against 24-hour baselines.'
            },
            {
              step: '03',
              title: 'Investigate',
              icon: Cpu,
              desc: 'Agent invokes diagnostic tools: historical trends, peer blocks, and ambient weather.'
            },
            {
              step: '04',
              title: 'Reason',
              icon: Sparkles,
              desc: 'Synthesizes cross-block data to determine root cause and confidence score.'
            },
            {
              step: '05',
              title: 'Act',
              icon: Layers,
              desc: 'Manager approval gate dispatches pump throttling, maintenance tickets, and advisories.'
            },
            {
              step: '06',
              title: 'Verify',
              icon: CheckCircle2,
              desc: 'Closed-loop verification evaluator rechecks telemetry to certify stabilization.'
            }
          ].map((card) => (
            <motion.div
              key={card.step}
              whileHover={{ y: -6, scale: 1.02 }}
              className={`border rounded-3xl p-6 backdrop-blur-xl transition-all shadow-xl ${
                isDark
                  ? 'bg-slate-900/60 border-slate-800/80 hover:border-indigo-500/50'
                  : 'bg-white/80 border-slate-200/90 hover:border-indigo-300 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between mb-4">
                <span
                  className={`font-mono text-2xl font-black ${
                    isDark ? 'text-slate-700' : 'text-slate-300'
                  }`}
                >
                  {card.step}
                </span>
                <card.icon className="w-6 h-6 text-indigo-500" />
              </div>

              <h4 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>{card.title}</h4>
              <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>{card.desc}</p>
            </motion.div>
          ))}
        </div>
      </motion.section>

      {/* Clean Footer */}
      <footer
        className={`border-t py-12 px-6 text-center text-xs font-mono relative z-10 transition-colors ${
          isDark ? 'border-slate-800/80 text-slate-500' : 'border-slate-200 text-slate-500'
        }`}
      >
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-2">
            <Droplets className="w-4 h-4 text-indigo-500" />
            <span className={isDark ? 'text-slate-300 font-semibold' : 'text-slate-700 font-semibold'}>AquaOps</span>
            <span>&bull; Intelligent Water Infrastructure</span>
          </div>
          <div>All operational rights reserved &copy; 2026</div>
        </div>
      </footer>
    </div>
  );
}
