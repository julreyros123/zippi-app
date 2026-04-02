import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { UserPlus, Mail, Lock, User, Eye, EyeOff, CheckCircle2, XCircle } from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function getPasswordStrength(password) {
  let score = 0;
  const checks = {
    length:   password.length >= 8,
    upper:    /[A-Z]/.test(password),
    lower:    /[a-z]/.test(password),
    number:   /[0-9]/.test(password),
    special:  /[^A-Za-z0-9]/.test(password),
  };
  score = Object.values(checks).filter(Boolean).length;
  if (score <= 1) return { score, label: 'Very Weak', color: 'bg-red-500', textColor: 'text-red-400' };
  if (score === 2) return { score, label: 'Weak', color: 'bg-orange-500', textColor: 'text-orange-400' };
  if (score === 3) return { score, label: 'Fair', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
  if (score === 4) return { score, label: 'Strong', color: 'bg-blue-500', textColor: 'text-blue-400' };
  return { score, label: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
}

const CRITERIA = [
  { key: 'length',  label: 'At least 8 characters', test: (p) => p.length >= 8 },
  { key: 'upper',   label: 'Uppercase letter',       test: (p) => /[A-Z]/.test(p) },
  { key: 'lower',   label: 'Lowercase letter',       test: (p) => /[a-z]/.test(p) },
  { key: 'number',  label: 'Number',                 test: (p) => /[0-9]/.test(p) },
  { key: 'special', label: 'Special character',      test: (p) => /[^A-Za-z0-9]/.test(p) },
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [nickname, setNickname] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showCriteria, setShowCriteria] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await axios.post(`${API_URL}/api/auth/register`, { username, email, password, nickname });
      login(res.data.user, res.data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[100dvh] w-full bg-gray-950 font-sans">
      
      {/* LEFT SIDE - BRANDING/HERO (Hidden on Mobile) */}
      <div className="hidden lg:flex flex-col relative w-5/12 max-w-[600px] bg-gray-900 border-r border-gray-800 overflow-hidden">
        
        <div className="relative z-10 flex flex-col justify-center h-full px-12 xl:px-20">
          <div className="w-20 h-20 rounded-md bg-indigo-600 flex items-center justify-center   mb-10">
            <span className="text-4xl font-extrabold text-white">Z</span>
          </div>
          
          <h1 className="text-4xl xl:text-5xl font-display font-extrabold text-white leading-tight mb-6">
            The ultimate <br/>
            <span className="text-blue-400">Study Hub</span>
          </h1>
          
          <p className="text-lg text-gray-400 leading-relaxed mb-12 max-w-md">
            Zippi combines real-time chat, collaborative split-screen notebooks, and shared resource vaults into one effortless experience.
          </p>

          {/* Floating UI Elements / Social Proof */}
          <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-md max-w-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center font-bold text-white text-sm">SJ</div>
               <div>
                 <p className="font-bold text-gray-200">Sarah J.</p>
                 <p className="text-xs text-gray-400">Computer Science Major</p>
               </div>
            </div>
            <p className="text-sm text-gray-300 italic leading-relaxed">
              "The real-time collaborative notebook completely changed how my study group prepares for exams. No more app switching."
            </p>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="flex-1 flex flex-col items-center relative px-6 py-12 lg:px-16 overflow-y-auto lg:h-[100dvh]">

        <div className="z-10 w-full max-w-[420px] mx-auto my-auto pt-4 pb-12">
          
          {/* Mobile Logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="w-16 h-16 rounded-md bg-gray-800 flex items-center justify-center  ">
              <span className="text-3xl font-extrabold text-white">Z</span>
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold text-white mb-2">Create Account</h2>
            <p className="text-gray-400 text-sm">Join thousands of students on Zippi.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded bg-gray-900 border border-red-900 text-red-400 text-sm font-medium flex items-center gap-3  ">
              <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">

            {/* Username */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold ml-1">Username</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors"><User size={18} /></div>
                <input
                  type="text" required autoComplete="username"
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded pl-11 pr-4 py-3.5 focus:outline-none   focus:border-blue-500 transition-all text-sm placeholder-gray-600 shadow-sm"
                  placeholder="cool_username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                />
              </div>
            </div>

            {/* Display Name */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold ml-1">Display Name <span className="text-gray-600">(optional)</span></label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors"><User size={18} /></div>
                <input
                  type="text" autoComplete="nickname"
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded pl-11 pr-4 py-3.5 focus:outline-none   focus:border-blue-500 transition-all text-sm placeholder-gray-600 shadow-sm"
                  placeholder="How others will see you"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <label className="text-xs text-gray-400 font-semibold ml-1">Email</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors"><Mail size={18} /></div>
                <input
                  type="email" required autoComplete="email"
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded pl-11 pr-4 py-3.5 focus:outline-none   focus:border-blue-500 transition-all text-sm placeholder-gray-600 shadow-sm"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-1.5 pt-1">
              <label className="text-xs text-gray-400 font-semibold ml-1">Password</label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors"><Lock size={18} /></div>
                <input
                  type={showPassword ? 'text' : 'password'} required autoComplete="new-password"
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded pl-11 pr-12 py-3.5 focus:outline-none   focus:border-blue-500 transition-all text-sm placeholder-gray-600 shadow-sm"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setShowCriteria(true); }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Password strength bar */}
              {showCriteria && password.length > 0 && (
                <div className="mt-3 bg-gray-900/80 p-3 rounded-lg border border-gray-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex gap-1 flex-1">
                      {[1, 2, 3, 4, 5].map(i => (
                        <div key={i} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${i <= strength.score ? strength.color : 'bg-gray-800'}`} />
                      ))}
                    </div>
                    <span className={`text-[10px] uppercase tracking-wide font-bold ml-3 ${strength.textColor}`}>{strength.label}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-x-2 gap-y-1.5">
                    {CRITERIA.map(c => {
                      const ok = c.test(password);
                      return (
                        <div key={c.key} className={`flex items-center gap-1.5 text-[11px] sm:text-xs transition-colors duration-300 ${ok ? 'text-emerald-400 font-medium' : 'text-gray-500'}`}>
                          {ok ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                          {c.label}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full mt-6 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-2.5 px-4 rounded transition-colors flex justify-center items-center gap-2 text-sm"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create Account
                  <UserPlus size={18} className="group-hover:translate-x-1 group-hover:scale-110 transition-all" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center lg:text-left text-sm text-gray-500">
            Already have an account?{' '}
            <Link to="/login" className="text-white hover:text-blue-400 font-bold transition-colors">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
