'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Droplets, Shield, ArrowRight, UserCheck } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [role, setRole] = useState<'manager' | 'student'>('manager');
  const [email, setEmail] = useState('manager@campus.edu');
  const [loading, setLoading] = useState(false);

  const handleRoleSelect = (selectedRole: 'manager' | 'student') => {
    setRole(selectedRole);
    setEmail(selectedRole === 'manager' ? 'manager@campus.edu' : 'student@campus.edu');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    localStorage.setItem('aquaops_role', role);
    localStorage.setItem('aquaops_email', email);
    
    // Redirect according to Cognito verified role
    setTimeout(() => {
      if (role === 'manager') {
        router.push('/manager');
      } else {
        router.push('/student');
      }
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#090d16] flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl relative overflow-hidden">
        {/* Glow accent */}
        <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center space-x-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white shadow-lg shadow-cyan-500/20">
            <Droplets className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">AquaOps</h1>
            <p className="text-xs text-slate-400">AWS Cognito Authentication</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-3 block">
            Select Demo Role Profile
          </label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => handleRoleSelect('manager')}
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                role === 'manager'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <Shield className="w-5 h-5 mb-1.5" />
              <span className="text-sm font-semibold">Facility Manager</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Command Center</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('student')}
              className={`p-3.5 rounded-xl border flex flex-col items-center justify-center transition-all ${
                role === 'student'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-300 ring-1 ring-cyan-500/30'
                  : 'border-slate-800 bg-slate-800/40 text-slate-400 hover:border-slate-700'
              }`}
            >
              <UserCheck className="w-5 h-5 mb-1.5" />
              <span className="text-sm font-semibold">Hostel Resident</span>
              <span className="text-[10px] text-slate-500 mt-0.5">Student View</span>
            </button>
          </div>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Email Identity</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950/60 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-500 transition-colors"
              required
            />
          </div>

          <div>
            <label className="text-xs text-slate-400 font-medium block mb-1.5">Cognito Token Simulation</label>
            <div className="bg-slate-950/40 border border-slate-800/60 rounded-xl px-4 py-2 text-xs font-mono text-slate-500 truncate">
              eyJuYmYiOjE2...custom:role=&quot;{role}&quot;
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-medium py-3 rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center space-x-2"
          >
            <span>{loading ? 'Authenticating...' : `Enter as ${role === 'manager' ? 'Manager' : 'Student'}`}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
