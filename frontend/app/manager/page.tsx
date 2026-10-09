'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Droplets,
  AlertTriangle,
  Activity,
  CheckCircle2,
  RotateCcw,
  Sliders,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Cpu,
  Radio,
  Sun,
  Moon,
  Award
} from 'lucide-react';
import { Building, Incident, AgentToolLog } from '@/lib/types';
import { fetchApi } from '@/lib/api';
import WaterTank from '@/components/WaterTank';

export default function ManagerDashboard() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [logs, setLogs] = useState<AgentToolLog[]>([]);
  const [selectedIncident, setSelectedIncident] = useState<Incident | null>(null);
  const [simulating, setSimulating] = useState(false);
  const [executing, setExecuting] = useState(false);
  const [verifying, setVerifying] = useState(false);

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

  const loadData = async () => {
    try {
      const [bData, iData, lData] = await Promise.all([
        fetchApi<Building[]>('/api/v1/buildings'),
        fetchApi<Incident[]>('/api/v1/incidents'),
        fetchApi<AgentToolLog[]>('/api/v1/agent/activity?limit=30')
      ]);
      setBuildings(bData);
      setIncidents(iData);
      setLogs(lData);
      if (iData.length > 0 && !selectedIncident) {
        setSelectedIncident(iData[0]);
      } else if (selectedIncident) {
        const updated = iData.find((i) => i.incidentId === selectedIncident.incidentId);
        if (updated) setSelectedIncident(updated);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 3000);
    return () => clearInterval(timer);
  }, []);

  const triggerSimulation = async (mode: 'LEAK' | 'NORMAL') => {
    setSimulating(true);
    try {
      await fetchApi('/api/v1/simulation/mode', {
        method: 'POST',
        body: JSON.stringify({ buildingId: 'BLD-C', mode })
      });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setSimulating(false);
    }
  };

  const resetAll = async () => {
    try {
      await fetchApi('/api/v1/simulation/reset', { method: 'POST' });
      setSelectedIncident(null);
      await loadData();
    } catch (e) {
      console.error(e);
    }
  };

  const approveActions = async (incidentId: string) => {
    setExecuting(true);
    try {
      await fetchApi(`/api/v1/incidents/${incidentId}/actions/approve`, { method: 'POST' });
      await loadData();
    } catch (e) {
      console.error(e);
    } finally {
      setExecuting(false);
    }
  };

  const runVerification = async (incidentId: string) => {
    setVerifying(true);
    try {
      // Simulate post-intervention flow drop
      await fetchApi('/api/v1/telemetry/readings', {
        method: 'POST',
        body: JSON.stringify({
          buildingId: 'BLD-C',
          tankLevelPct: 55.0,
          inflowLph: 300.0,
          outflowLph: 460.0,
          isSimulated: true
        })
      });
      await fetchApi(`/api/v1/incidents/${incidentId}/verify`, { method: 'POST' });
      await loadData();

      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#06b6d4', '#3b82f6', '#10b981', '#a855f7']
      });
    } catch (e) {
      console.error(e);
    } finally {
      setVerifying(false);
    }
  };

  const totalCapacity = buildings.reduce((acc, b) => acc + b.tankCapacityLitres, 0);
  const currentTotalWater = buildings.reduce((acc, b) => acc + (b.tankCapacityLitres * b.currentTankLevelPct) / 100, 0);
  const activeIncidents = incidents.filter((i) => i.status !== 'STABILIZED');
  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#060c18] text-slate-100' : 'bg-[#f4f7fb] text-slate-900'
      }`}
    >
      {/* Top Header */}
      <header
        className={`border-b backdrop-blur-2xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-colors ${
          isDark ? 'border-slate-800/80 bg-slate-950/80' : 'border-slate-200/90 bg-white/85 shadow-sm'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/25 group-hover:rotate-12 transition-transform">
              <Droplets className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  AquaOps
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                  Command Center
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Live Hydraulic Telemetry Mesh</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          {/* Simulation Quick Trigger in Nav */}
          <button
            onClick={() => triggerSimulation('LEAK')}
            disabled={simulating}
            className="px-4 py-2 bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-400 hover:to-pink-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-500/20 flex items-center space-x-1.5 transition active:scale-95"
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Simulate Leak — Block C</span>
          </button>

          <button
            onClick={resetAll}
            className={`flex items-center space-x-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition active:scale-95 ${
              isDark
                ? 'border-slate-800 bg-slate-900/70 hover:bg-slate-800 text-slate-300'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset</span>
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            aria-label="Toggle Theme"
            className={`p-2.5 rounded-xl border transition-all ${
              isDark
                ? 'border-slate-800 bg-slate-900/80 text-amber-400'
                : 'border-slate-200 bg-white text-slate-700 shadow-sm'
            }`}
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <Link
            href="/student"
            className="text-xs px-3.5 py-2 rounded-xl border border-cyan-500/30 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 font-semibold transition"
          >
            Student View &rarr;
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        
        {/* Top Hero Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className={`text-2xl md:text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
              Campus Water Infrastructure
            </h1>
            <p className="text-xs md:text-sm text-slate-400 font-light mt-0.5">
              Real-time ultrasonic reservoir telemetry and autonomous agent investigation.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <div className={`px-4 py-2 rounded-2xl border text-xs font-mono font-medium flex items-center space-x-2 ${
              isDark ? 'bg-slate-900/60 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700 shadow-sm'
            }`}>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
              <span>Telemetry Stream: Active</span>
            </div>
          </div>
        </div>

        {/* 2-Column Main Section: Left = 4 Water Tanks, Right = Autonomous Agent Log */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: 4 Cylindrical Water Tanks (8 Cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
                Monitored Storage Reservoirs
              </h2>
              <span className="text-xs text-slate-400 font-mono">
                Total Available: {Math.round(currentTotalWater).toLocaleString()} L ({Math.round((currentTotalWater / totalCapacity) * 100)}%)
              </span>
            </div>

            {/* The 4 Glass Water Tanks Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
              {buildings.map((b) => {
                const isLeak = b.currentStatus !== 'OPTIMAL' && selectedIncident?.status !== 'STABILIZED';
                const isStabilized = selectedIncident?.buildingId === b.buildingId && selectedIncident?.status === 'STABILIZED';

                return (
                  <motion.div
                    key={b.buildingId}
                    whileHover={{ y: -4 }}
                    className={`border rounded-3xl p-4 flex flex-col items-center justify-between relative overflow-hidden backdrop-blur-xl transition-all shadow-xl ${
                      isLeak
                        ? 'bg-rose-950/25 border-rose-500/60 shadow-rose-950/30'
                        : isStabilized
                        ? 'bg-emerald-950/20 border-emerald-500/50 shadow-emerald-950/20'
                        : isDark
                        ? 'bg-slate-900/70 border-slate-800/80'
                        : 'bg-white border-slate-200/90 shadow-sm'
                    }`}
                  >
                    {/* Top Header Card */}
                    <div className="w-full flex items-center justify-between mb-2">
                      <div>
                        <h4 className={`font-bold text-sm leading-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {b.code}
                        </h4>
                        <span className="text-[10px] text-slate-400 block font-mono">{b.name.split('(')[0]}</span>
                      </div>
                      
                      <span
                        className={`text-[9px] font-mono font-bold px-2 py-0.5 rounded-full border ${
                          isLeak
                            ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                            : isStabilized
                            ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-400'
                        }`}
                      >
                        {isLeak ? 'Leak detected' : isStabilized ? 'Stabilized' : 'Normal'}
                      </span>
                    </div>

                    {/* Animated Realistic Glass Water Tank */}
                    <div className="w-full flex justify-center my-1">
                      <WaterTank
                        levelPct={b.currentTankLevelPct}
                        isLeaking={isLeak}
                        isStabilized={isStabilized}
                      />
                    </div>

                    {/* Tank Level Gauge Slider Bar */}
                    <div className="w-full mt-2 space-y-1">
                      <div className="w-full bg-slate-800/40 h-1.5 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${
                            isLeak ? 'bg-rose-500' : isStabilized ? 'bg-emerald-500' : 'bg-cyan-500'
                          }`}
                          style={{ width: `${b.currentTankLevelPct}%` }}
                        />
                      </div>
                    </div>

                    {/* Metrics Below Tank */}
                    <div className="w-full grid grid-cols-2 gap-2 text-center pt-3 mt-2 border-t border-slate-800/40 font-mono">
                      <div>
                        <div className={`text-base font-black ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          {b.currentTankLevelPct}%
                        </div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Tank level</span>
                      </div>

                      <div>
                        <div className={`text-base font-black ${isLeak ? 'text-rose-500 animate-pulse' : isDark ? 'text-white' : 'text-slate-900'}`}>
                          {(b.currentOutflowLph / 60).toFixed(1)} <span className="text-[10px] font-normal">L/m</span>
                        </div>
                        <span className="text-[9px] text-slate-400 uppercase tracking-wider block">Outflow</span>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Human-in-the-Loop Operational Gate Card */}
            {selectedIncident && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`border rounded-3xl p-5 backdrop-blur-2xl space-y-4 shadow-2xl relative overflow-hidden ${
                  selectedIncident.status === 'STABILIZED'
                    ? 'bg-emerald-950/20 border-emerald-500/40'
                    : 'bg-slate-900/80 border-slate-800/80'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                      <Cpu className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        Incident #{selectedIncident.incidentId} &bull; {selectedIncident.buildingId}
                      </h3>
                      <p className="text-xs text-slate-400">
                        {selectedIncident.agentAssessment}
                      </p>
                    </div>
                  </div>

                  <span className="text-xs px-3 py-1 rounded-full font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                    {selectedIncident.status}
                  </span>
                </div>

                {/* Actions Button Gate */}
                <div className="flex items-center space-x-3 pt-1">
                  {selectedIncident.status === 'PENDING_APPROVAL' && (
                    <button
                      onClick={() => approveActions(selectedIncident.incidentId)}
                      disabled={executing}
                      className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold py-3 rounded-2xl text-xs transition shadow-lg shadow-cyan-500/25 flex items-center justify-center space-x-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>{executing ? 'Executing Actuators...' : 'Approve & Close Valve V2 (Human-in-Loop)'}</span>
                    </button>
                  )}

                  {selectedIncident.status === 'ACTION_EXECUTED' && (
                    <button
                      onClick={() => runVerification(selectedIncident.incidentId)}
                      disabled={verifying}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-3 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/25 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{verifying ? 'Verifying Flow...' : 'Verify Incident Recovery (T+30m Loop)'}</span>
                    </button>
                  )}

                  {selectedIncident.status === 'STABILIZED' && (
                    <div className="flex-1 text-center py-2.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center space-x-2">
                      <Award className="w-4 h-4" />
                      <span>Incident Stabilized &bull; Total water loss capped at ~{selectedIncident.waterSavedLitres?.toLocaleString()} L</span>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* RIGHT: Agent Log Timeline (4 Cols - As seen in Screenshot) */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Agent Operational Log
            </h2>

            <div
              className={`border rounded-3xl p-5 backdrop-blur-2xl h-[560px] overflow-y-auto space-y-4 shadow-2xl ${
                isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div className="border-b border-slate-800/60 pb-3">
                <h3 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>Agent Log</h3>
                <p className="text-[11px] text-slate-400">Each step appears as the agent works through it.</p>
              </div>

              {/* Step-by-Step Structured Agent Reasoning Timeline */}
              <div className="space-y-4">
                {/* 1. Detect */}
                <div className="relative pl-6 pb-2 border-l-2 border-cyan-500/40 space-y-1">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-400 font-mono">Detect</span>
                    <span className="text-[10px] text-slate-500 font-mono">03:10</span>
                  </div>
                  <p className="text-xs text-slate-300 font-light">
                    {selectedIncident
                      ? `Block C outflow surged to 12.0 L/min. Overnight baseline is ~7.8 L/min.`
                      : `Monitoring campus water lines. Telemetry streams optimal.`}
                  </p>
                </div>

                {/* 2. Investigate */}
                <div className="relative pl-6 pb-2 border-l-2 border-cyan-500/40 space-y-1">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.8)]" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-cyan-400 font-mono">Investigate</span>
                    <span className="text-[10px] text-slate-500 font-mono">03:11</span>
                  </div>
                  <p className="text-xs text-slate-300 font-light">
                    {selectedIncident
                      ? `About 840 L unaccounted for over last hour. Peer blocks normal. Pattern fits localized riser leak.`
                      : `Statistical variance within target +/- 5%.`}
                  </p>
                </div>

                {/* 3. Decide */}
                <div className="relative pl-6 pb-2 border-l-2 border-blue-500/40 space-y-1">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-400 font-mono">Decide</span>
                    <span className="text-[10px] text-slate-500 font-mono">03:11</span>
                  </div>
                  <p className="text-xs text-slate-300 font-light">
                    {selectedIncident
                      ? `Throttle pump inlet valve V2 by 40%. Dispatch hydraulics crew and broadcast advisory.`
                      : `No action required.`}
                  </p>
                </div>

                {/* 4. Act */}
                <div className="relative pl-6 pb-2 border-l-2 border-blue-500/40 space-y-1">
                  <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-400 font-mono">Act</span>
                    <span className="text-[10px] text-slate-500 font-mono">03:12</span>
                  </div>
                  <p className="text-xs text-slate-300 font-light">
                    {selectedIncident?.status !== 'PENDING_APPROVAL' && selectedIncident
                      ? `Valve V2 throttled. Plumber and hostel warden notified. Recheck scheduled.`
                      : `Awaiting manager clearance.`}
                  </p>
                </div>

                {/* 5. Verify */}
                <div className="relative pl-6 space-y-1">
                  <div className={`absolute -left-[5px] top-0 w-2 h-2 rounded-full ${
                    selectedIncident?.status === 'STABILIZED' ? 'bg-emerald-400 shadow-[0_0_8px_rgba(16,185,129,0.8)]' : 'bg-slate-600'
                  }`} />
                  <div className="flex items-center justify-between text-xs">
                    <span className={`font-bold font-mono ${selectedIncident?.status === 'STABILIZED' ? 'text-emerald-400' : 'text-slate-500'}`}>
                      Verify
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">03:17</span>
                  </div>
                  <p className="text-xs text-slate-300 font-light">
                    {selectedIncident?.status === 'STABILIZED'
                      ? `Outflow normalized back to baseline. Tank level stopped falling. Stabilization verified.`
                      : `Recheck cycle pending.`}
                  </p>
                </div>
              </div>

              {/* Stabilization Green Banner */}
              {selectedIncident?.status === 'STABILIZED' && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-6 p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-medium"
                >
                  Incident stabilized. Total loss capped at ~840 L.
                </motion.div>
              )}
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
