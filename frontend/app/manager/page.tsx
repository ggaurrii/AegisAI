'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Droplets,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Play,
  RotateCcw,
  Sliders,
  Shield,
  Layers,
  Sparkles,
  ArrowRight,
  TrendingDown,
  Cpu,
  Radio,
  Zap,
  Award,
  Sun,
  Moon
} from 'lucide-react';
import { Building, Incident, AgentToolLog } from '@/lib/types';
import { fetchApi } from '@/lib/api';

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
    const timer = setInterval(loadData, 3500);
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
      await fetchApi('/api/v1/telemetry/readings', {
        method: 'POST',
        body: JSON.stringify({
          buildingId: 'BLD-C',
          tankLevelPct: 48.0,
          inflowLph: 300.0,
          outflowLph: 460.0,
          isSimulated: true
        })
      });
      await fetchApi(`/api/v1/incidents/${incidentId}/verify`, { method: 'POST' });
      await loadData();

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#6366f1', '#3b82f6', '#10b981']
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
  const totalWaterSaved = incidents.reduce((acc, i) => acc + (i.waterSavedLitres || 0), 0);
  const isDark = theme === 'dark';

  return (
    <div
      className={`min-h-screen flex flex-col font-sans transition-colors duration-300 ${
        isDark ? 'bg-[#030712] text-slate-100' : 'bg-[#f8fafc] text-slate-900'
      }`}
    >
      {/* Top Header */}
      <header
        className={`border-b backdrop-blur-2xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between transition-colors duration-300 ${
          isDark
            ? 'border-slate-800/80 bg-slate-950/80'
            : 'border-slate-200/90 bg-white/80 shadow-sm'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Link href="/" className="flex items-center space-x-3 group">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/25 group-hover:rotate-12 transition-transform">
              <Droplets className="w-5 h-5 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className={`font-black text-xl tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                  AquaOps
                </span>
                <span className="text-[10px] uppercase font-mono font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">
                  Command Center
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-mono">Autonomous Water Management Mesh</p>
            </div>
          </Link>
        </div>

        <div className="flex items-center space-x-3">
          {/* Dark / Light Toggle */}
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

          <button
            onClick={resetAll}
            className={`flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border text-xs transition active:scale-95 ${
              isDark
                ? 'border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white'
                : 'border-slate-200 bg-white hover:bg-slate-50 text-slate-700 shadow-sm'
            }`}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Demo</span>
          </button>

          <Link
            href="/student"
            className="text-xs px-3.5 py-2 rounded-xl border border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 transition font-semibold"
          >
            Resident View &rarr;
          </Link>
        </div>
      </header>

      {/* Main Grid */}
      <main className="flex-1 p-6 max-w-7xl mx-auto w-full space-y-6">
        {/* KPI Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {[
            {
              title: 'Campus Storage Total',
              val: `${Math.round(currentTotalWater).toLocaleString()} L`,
              sub: `Capacity: ${totalCapacity.toLocaleString()} L (${Math.round((currentTotalWater / totalCapacity) * 100)}%)`,
              icon: Droplets,
              color: 'text-indigo-400'
            },
            {
              title: 'Current Flow Rate',
              val: `${buildings.reduce((acc, b) => acc + b.currentOutflowLph, 0).toFixed(0)} L/hr`,
              sub: 'Aggregated flow demand across all zones',
              icon: Activity,
              color: 'text-blue-400'
            },
            {
              title: 'Active Incidents',
              val: `${activeIncidents.length}`,
              sub: activeIncidents.length > 0 ? 'Requires attention' : 'All campus blocks optimal',
              icon: AlertTriangle,
              color: activeIncidents.length > 0 ? 'text-rose-400' : 'text-slate-400'
            },
            {
              title: 'Water Saved by Agent',
              val: `+${totalWaterSaved.toLocaleString()} L`,
              sub: 'Certified prevented losses',
              icon: Sparkles,
              color: 'text-emerald-400'
            }
          ].map((kpi, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -4 }}
              className={`border rounded-3xl p-5 backdrop-blur-xl shadow-lg relative overflow-hidden ${
                isDark
                  ? 'bg-slate-900/60 border-slate-800/80'
                  : 'bg-white border-slate-200/90 shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                <span>{kpi.title}</span>
                <kpi.icon className={`w-4 h-4 ${kpi.color}`} />
              </div>
              <div className={`text-3xl font-black tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>
                {kpi.val}
              </div>
              <div className="text-[11px] text-slate-400 mt-2 font-mono">{kpi.sub}</div>
            </motion.div>
          ))}
        </div>

        {/* Interactive Leak Simulator Strip */}
        <div
          className={`border rounded-3xl p-5 flex flex-col md:flex-row items-center justify-between gap-4 shadow-xl ${
            isDark
              ? 'bg-gradient-to-r from-indigo-950/30 via-slate-900/90 to-blue-950/30 border-indigo-500/30'
              : 'bg-gradient-to-r from-indigo-50 via-white to-blue-50 border-indigo-200'
          }`}
        >
          <div className="flex items-center space-x-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-500 flex-shrink-0">
              <Sliders className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <h3 className={`text-sm font-bold flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                <span>Interactive Anomaly Injection Panel</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400">
                  LIVE CONTROLS
                </span>
              </h3>
              <p className="text-xs text-slate-400 font-light">
                Trigger synthetic pipeline ruptures to test autonomous agent detection and recovery.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => triggerSimulation('LEAK')}
              disabled={simulating}
              className="px-5 py-2.5 bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-400 rounded-2xl text-xs font-bold flex items-center space-x-2 transition shadow-lg"
            >
              <AlertTriangle className="w-4 h-4" />
              <span>Simulate Leak — Block C (+53% Outflow)</span>
            </motion.button>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => triggerSimulation('NORMAL')}
              disabled={simulating}
              className={`px-5 py-2.5 border rounded-2xl text-xs font-bold flex items-center space-x-2 transition ${
                isDark
                  ? 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                  : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700 shadow-sm'
              }`}
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>Restore Baseline Normal</span>
            </motion.button>
          </div>
        </div>

        {/* Building Health Grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Infrastructure Blocks
            </h2>
            <span className="text-xs text-slate-500 font-mono">4 Monitored Zones</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {buildings.map((b) => {
              const isAlert = b.currentStatus !== 'OPTIMAL';
              return (
                <motion.div
                  key={b.buildingId}
                  whileHover={{ y: -4 }}
                  className={`border rounded-3xl p-5 transition relative overflow-hidden backdrop-blur-xl ${
                    isAlert
                      ? 'bg-rose-950/20 border-rose-500/50 shadow-xl'
                      : isDark
                      ? 'bg-slate-900/60 border-slate-800/80'
                      : 'bg-white border-slate-200 shadow-sm'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className={`font-bold text-sm ${isDark ? 'text-white' : 'text-slate-900'}`}>{b.name}</h4>
                      <p className="text-[11px] text-slate-400 font-mono">{b.residentCount} Residents</p>
                    </div>
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-0.5 rounded-full border ${
                        isAlert
                          ? 'bg-rose-500/20 border-rose-500/50 text-rose-400 animate-pulse'
                          : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                      }`}
                    >
                      {b.currentStatus}
                    </span>
                  </div>

                  <div className="space-y-1.5 mb-4">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-mono">Tank Reservoir</span>
                      <span className={`font-bold font-mono ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        {b.currentTankLevelPct}%
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 dark:bg-slate-800 h-2.5 rounded-full overflow-hidden p-0.5">
                      <div
                        className={`h-full rounded-full transition-all duration-700 ${
                          b.currentTankLevelPct < 50
                            ? 'bg-gradient-to-r from-rose-500 to-amber-500'
                            : 'bg-gradient-to-r from-indigo-500 to-blue-500'
                        }`}
                        style={{ width: `${b.currentTankLevelPct}%` }}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs border-t border-slate-200 dark:border-slate-800/80 pt-3">
                    <div>
                      <span className="text-slate-400 text-[10px] block font-mono">Inflow</span>
                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {b.currentInflowLph} L/h
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-400 text-[10px] block font-mono">Outflow</span>
                      <span className={`font-bold ${isAlert ? 'text-rose-500 font-mono' : isDark ? 'text-slate-200' : 'text-slate-700'}`}>
                        {b.currentOutflowLph} L/h
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>

        {/* Operational Incident & Agent Center Dual Column */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Incident Inspection (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Active Incident &amp; Autonomous Resolution
            </h2>

            {selectedIncident ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`border rounded-3xl p-6 backdrop-blur-2xl space-y-5 shadow-xl relative overflow-hidden ${
                  isDark
                    ? 'bg-slate-900/80 border-slate-800/80'
                    : 'bg-white border-slate-200 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800/80 pb-4">
                  <div className="flex items-center space-x-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-500">
                      <AlertTriangle className="w-6 h-6 animate-pulse" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <h3 className={`font-black text-base ${isDark ? 'text-white' : 'text-slate-900'}`}>
                          Incident #{selectedIncident.incidentId}
                        </h3>
                        <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold bg-rose-500/15 text-rose-500">
                          {selectedIncident.severity}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        {selectedIncident.buildingId} &bull; Type: {selectedIncident.type}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`text-xs px-3 py-1 rounded-full border font-bold font-mono ${
                      selectedIncident.status === 'STABILIZED'
                        ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                        : selectedIncident.status === 'ACTION_EXECUTED'
                        ? 'bg-indigo-500/10 border-indigo-500/30 text-indigo-400'
                        : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                    }`}
                  >
                    {selectedIncident.status}
                  </span>
                </div>

                {/* AI Root Cause Card */}
                <div
                  className={`border rounded-2xl p-5 space-y-3 ${
                    isDark
                      ? 'bg-slate-950/70 border-slate-800/80'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs text-indigo-500 font-semibold font-mono">
                    <span className="flex items-center space-x-1.5">
                      <Cpu className="w-4 h-4" />
                      <span>Strands Agent Root-Cause Assessment</span>
                    </span>
                    <span>Confidence: {selectedIncident.confidencePct}%</span>
                  </div>
                  <p className={`text-xs leading-relaxed font-light ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                    {selectedIncident.agentAssessment}
                  </p>

                  <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-200 dark:border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Baseline Expected</span>
                      <span className={`font-bold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                        {selectedIncident.baselineExpectedLph} L/h
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Observed</span>
                      <span className="text-rose-500 font-bold">{selectedIncident.observedLph} L/h</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block font-mono">Anomaly Score</span>
                      <span className="text-amber-500 font-bold">
                        {(selectedIncident.anomalyScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Recommended Actions */}
                <div className="space-y-2">
                  <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-wider">
                    Recommended Operational Actions
                  </h4>

                  <div className="space-y-2">
                    {selectedIncident.recommendedActions.map((act) => (
                      <div
                        key={act.actionId}
                        className={`border rounded-2xl p-3.5 flex items-center justify-between ${
                          isDark
                            ? 'bg-slate-950/50 border-slate-800/60'
                            : 'bg-white border-slate-200 shadow-sm'
                        }`}
                      >
                        <div>
                          <div className={`text-xs font-bold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                            {act.title}
                          </div>
                          <div className="text-[11px] text-slate-400 font-light">{act.description}</div>
                        </div>
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${
                            act.status === 'EXECUTED'
                              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500'
                              : 'bg-amber-500/10 border-amber-500/30 text-amber-500'
                          }`}
                        >
                          {act.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Verification Result Banner */}
                {selectedIncident.verificationResult && (
                  <motion.div
                    initial={{ scale: 0.95, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="bg-emerald-500/10 border border-emerald-500/40 rounded-2xl p-5 flex items-center space-x-3.5"
                  >
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                        Verification Certified
                      </h4>
                      <p className="text-xs text-emerald-700 dark:text-emerald-300 font-light leading-relaxed">
                        Flow reduced to {selectedIncident.verificationResult.postInterventionLph} L/h (
                        {selectedIncident.verificationResult.recoveryDeltaPct}% reduction). Certified ~
                        {selectedIncident.waterSavedLitres?.toLocaleString()} Litres saved.
                      </p>
                    </div>
                  </motion.div>
                )}

                {/* Actions Button */}
                <div className="flex items-center space-x-3 pt-2">
                  {selectedIncident.status === 'PENDING_APPROVAL' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => approveActions(selectedIncident.incidentId)}
                      disabled={executing}
                      className="flex-1 bg-gradient-to-r from-indigo-500 via-blue-600 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white font-bold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-indigo-500/30 flex items-center justify-center space-x-2"
                    >
                      <Shield className="w-4 h-4" />
                      <span>{executing ? 'Executing...' : 'Approve & Execute Actions (Human-in-Loop)'}</span>
                    </motion.button>
                  )}

                  {selectedIncident.status === 'ACTION_EXECUTED' && (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => runVerification(selectedIncident.incidentId)}
                      disabled={verifying}
                      className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white font-bold py-3.5 rounded-2xl text-xs transition shadow-lg shadow-emerald-500/30 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{verifying ? 'Verifying...' : 'Trigger Recheck Verification'}</span>
                    </motion.button>
                  )}

                  {selectedIncident.status === 'STABILIZED' && (
                    <div className="flex-1 text-center py-3 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-center space-x-2">
                      <Award className="w-4 h-4" />
                      <span>Incident Fully Resolved &bull; Hydraulic Grid Stabilized</span>
                    </div>
                  )}
                </div>
              </motion.div>
            ) : (
              <div
                className={`border rounded-3xl p-10 text-center text-xs font-mono ${
                  isDark ? 'bg-slate-900/40 border-slate-800/60 text-slate-500' : 'bg-white border-slate-200 text-slate-400'
                }`}
              >
                No active incidents. Trigger "Simulate Leak — Block C" above to initiate workflow.
              </div>
            )}
          </div>

          {/* Agent Tool Audit Log (5 cols) */}
          <div className="lg:col-span-5 space-y-3">
            <h2 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Agent Tool Execution Stream
            </h2>

            <div
              className={`border rounded-3xl p-4 backdrop-blur-2xl h-[580px] overflow-y-auto space-y-3 shadow-xl ${
                isDark ? 'bg-slate-900/80 border-slate-800/80' : 'bg-white border-slate-200 shadow-sm'
              }`}
            >
              {logs.length > 0 ? (
                logs.map((log) => (
                  <motion.div
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    key={log.logId}
                    className={`border rounded-2xl p-3.5 space-y-1.5 transition ${
                      isDark
                        ? 'bg-slate-950/70 border-slate-800/60 hover:border-indigo-500/40'
                        : 'bg-slate-50 border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-bold text-indigo-500 flex items-center space-x-1.5">
                        <Cpu className="w-3.5 h-3.5" />
                        <span>{log.toolName}()</span>
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString()}
                      </span>
                    </div>

                    <p className={`text-[11px] font-mono break-words leading-tight ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {log.resultSummary}
                    </p>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1.5 border-t border-slate-200 dark:border-slate-800/40 font-mono">
                      <span>Input: {log.inputSummary}</span>
                      <span className="text-emerald-500 font-bold">{log.status}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center py-20 text-slate-400 text-xs font-mono">No tool executions logged yet.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
