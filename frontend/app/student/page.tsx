'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Droplets,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Bell,
  ArrowRight,
  TrendingDown,
  Shield,
  Clock,
  Compass
} from 'lucide-react';
import { Building, Incident, WaterReading } from '@/lib/types';
import { fetchApi } from '@/lib/api';

export default function StudentDashboard() {
  const [building, setBuilding] = useState<Building | null>(null);
  const [readings, setReadings] = useState<WaterReading[]>([]);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const [bData, rData, iData] = await Promise.all([
        fetchApi<Building>('/api/v1/buildings/BLD-C'),
        fetchApi<WaterReading[]>('/api/v1/buildings/BLD-C/readings?hours=12'),
        fetchApi<Incident[]>('/api/v1/incidents?building_id=BLD-C')
      ]);
      setBuilding(bData);
      setReadings(rData);
      setIncidents(iData);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const timer = setInterval(loadData, 4000);
    return () => clearInterval(timer);
  }, []);

  const activeIncident = incidents.find((i) => i.status !== 'STABILIZED');
  const resolvedCount = incidents.filter((i) => i.status === 'STABILIZED').length;

  return (
    <div className="min-h-screen bg-[#070b12] text-slate-100 flex flex-col font-sans">
      {/* Top Navigation */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-xl sticky top-0 z-50 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
            <Droplets className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-lg tracking-tight text-white">AquaOps</span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                Resident Portal
              </span>
            </div>
            <p className="text-xs text-slate-400">Hostel Water Advisory &bull; North Campus</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link
            href="/manager"
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-slate-300 hover:text-white transition"
          >
            Manager View &rarr;
          </Link>
        </div>
      </header>

      {/* Main Student Portal Layout */}
      <main className="flex-1 p-6 max-w-4xl mx-auto w-full space-y-6">
        {/* Welcome Greeting */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Good morning, Alex 👋</h1>
            <p className="text-sm text-slate-400">Camberley Hall (Block C) &bull; Room 312</p>
          </div>

          <div className="flex items-center space-x-2 bg-slate-900/80 border border-slate-800 rounded-xl px-4 py-2 text-xs">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                activeIncident ? 'bg-rose-500 animate-ping' : 'bg-emerald-400'
              }`}
            />
            <span className="text-slate-300 font-medium">
              Water Status: {activeIncident ? 'Operational Advisory in Effect' : 'Stable & Optimal'}
            </span>
          </div>
        </div>

        {/* Primary Alert Banner if Incident is Ongoing */}
        {activeIncident && (
          <div className="bg-rose-950/30 border border-rose-500/40 rounded-2xl p-5 flex items-start space-x-4 shadow-lg shadow-rose-950/20">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 flex-shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h3 className="text-sm font-bold text-white">AquaOps Automated Water Advisory</h3>
                <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-rose-500/20 text-rose-300">
                  {activeIncident.severity} PRIORITY
                </span>
              </div>
              <p className="text-xs text-rose-200/90 leading-relaxed">
                Abnormal consumption pattern detected in Block C. Autonomous agent has throttled the VFD pump and
                dispatched hydraulics crew. Estimated restoration window: 30–45 mins. Please minimize heavy usage.
              </p>
            </div>
          </div>
        )}

        {/* Status & Consumption Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tank Level Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Block C Reservoir</span>
              <Droplets className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {building?.currentTankLevelPct ?? 68}%
            </div>
            <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  (building?.currentTankLevelPct ?? 68) < 50 ? 'bg-rose-500' : 'bg-cyan-500'
                }`}
                style={{ width: `${building?.currentTankLevelPct ?? 68}%` }}
              />
            </div>
            <p className="text-[11px] text-slate-400">
              {(building?.currentTankLevelPct ?? 68) > 50 ? 'Ample water for daily activities' : 'Low water pressure possible'}
            </p>
          </div>

          {/* Today Demand Rate */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Current Flow</span>
              <Clock className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-3xl font-bold text-white">
              {building?.currentOutflowLph ?? 470}{' '}
              <span className="text-sm font-normal text-slate-400">L/hr</span>
            </div>
            <p className="text-xs text-slate-400">
              Baseline Target: {building?.normalBaselineLph ?? 470} L/hr
            </p>
            <div className="text-[11px] text-slate-400">Peak demand hours: 7:00 AM – 9:30 AM</div>
          </div>

          {/* Water Saved Card */}
          <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>Environmental Impact</span>
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-3xl font-bold text-emerald-400">
              +42 <span className="text-sm font-normal text-emerald-500">L/student</span>
            </div>
            <p className="text-xs text-slate-400">Personal conservation contribution this week</p>
            <div className="text-[11px] text-emerald-400/80">Campus total saved: 4,200L</div>
          </div>
        </div>

        {/* AI Recommendation Card */}
        <div className="bg-gradient-to-r from-cyan-950/20 via-slate-900/80 to-blue-950/20 border border-cyan-500/20 rounded-2xl p-5 space-y-2">
          <div className="flex items-center space-x-2 text-xs font-semibold text-cyan-400">
            <Sparkles className="w-4 h-4" />
            <span>AquaOps AI Resident Recommendation</span>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            {activeIncident
              ? 'Our sensors identified a localized pipe rupture on your block. Maintenance has been dispatched automatically. Please refrain from running laundry or continuous taps until service stabilizes.'
              : 'Supply is completely balanced across North Campus today. Ambient temperature is 22°C. No water restrictions or rationing expected for Block C.'}
          </p>
        </div>

        {/* Simple Consumption History List */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 space-y-4">
          <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Recent Telemetry Observations (Block C)
          </h3>
          <div className="space-y-2">
            {readings.slice(-5).reverse().map((r) => (
              <div
                key={r.readingId}
                className="bg-slate-950/50 border border-slate-800/60 rounded-xl px-4 py-2.5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center space-x-3">
                  <div className="w-2 h-2 rounded-full bg-cyan-400" />
                  <span className="font-mono text-slate-400">
                    {new Date(r.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <span className="text-slate-200">Demand: {r.outflowLph} L/hr</span>
                </div>
                <div className="text-slate-400 font-mono">Tank: {r.tankLevelPct}%</div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
