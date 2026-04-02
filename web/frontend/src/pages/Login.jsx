import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import axios from 'axios';
import { LogIn, Mail, Lock, Eye, EyeOff, CheckSquare, Square } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const login = useAuthStore((state) => state.login);

  // Auto-fill email if previously remembered
  useEffect(() => {
    const savedEmail = localStorage.getItem('zippi_saved_email');
    if (savedEmail) {
      setEmail(savedEmail);
      setRememberMe(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const baseUrl = (import.meta.env.VITE_API_URL || 'http://localhost:5000').replace(/\/api\/?$/, '');
      const res = await axios.post(`${baseUrl}/api/auth/login`, { email, password });

      // Save or clear remembered email
      if (rememberMe) {
        localStorage.setItem('zippi_saved_email', email);
      } else {
        localStorage.removeItem('zippi_saved_email');
      }
      
      login(res.data.user, res.data.token, rememberMe);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to login. Please try again.');
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
            Welcome back to <br/>
            <span className="text-blue-400">Your Hub</span>
          </h1>
          
          <p className="text-lg text-gray-400 leading-relaxed mb-12 max-w-md">
            Dive right back into your study groups, continue your collaborative notes, and catch up with your classmates.
          </p>

          <div className="bg-gray-800 border border-gray-700/50 p-6 rounded-md max-w-sm">
            <div className="flex items-center gap-4 mb-3">
               <div className="w-10 h-10 rounded bg-gray-700 flex items-center justify-center font-bold text-white text-sm">MJ</div>
               <div>
                 <p className="font-bold text-gray-200">Marcus J.</p>
                 <p className="text-xs text-gray-400">Engineering</p>
               </div>
            </div>
            <p className="text-sm text-gray-300 italic leading-relaxed">
              "Zippi's split-screen setup means I can actually read the lecture PDFs and chat at the exact same time."
            </p>
          </div>
        </div>
      </div>
      
      {/* RIGHT SIDE - FORM */}
      <div className="flex-1 flex flex-col relative px-6 py-6 lg:px-16 overflow-y-auto h-[100dvh]">

        <div className="z-10 w-full max-w-[420px] m-auto py-12 flex-shrink-0">
          {/* Mobile Logo */}
          <div className="flex justify-center mb-8 lg:hidden">
            <div className="w-16 h-16 rounded-md bg-indigo-600 flex items-center justify-center  ">
              <span className="text-3xl font-extrabold text-white">Z</span>
            </div>
          </div>

          <div className="mb-8 text-center lg:text-left">
            <h2 className="text-3xl font-display font-bold text-white mb-2">Welcome Back</h2>
            <p className="text-gray-400 text-sm">Sign in to sync your study updates.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded bg-gray-900 border border-red-900 text-red-400 text-sm font-medium flex items-center gap-3  ">
              <div className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
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
              <div className="flex items-center justify-between ml-1">
                 <label className="text-xs text-gray-400 font-semibold">Password</label>
                 <Link to="/forgot-password" className="text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors">Forgot password?</Link>
              </div>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-500 group-focus-within:text-blue-500 transition-colors"><Lock size={18} /></div>
                <input
                  type={showPassword ? 'text' : 'password'} required autoComplete="current-password"
                  className="w-full bg-gray-950 border border-gray-800 text-white rounded pl-11 pr-12 py-3.5 focus:outline-none   focus:border-blue-500 transition-all text-sm placeholder-gray-600 shadow-sm"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-500 hover:text-gray-300 transition-colors">
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center mt-2">
              <button
                type="button"
                onClick={() => setRememberMe(!rememberMe)}
                className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors group"
                aria-pressed={rememberMe}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center transition-all ${
                  rememberMe 
                    ? 'bg-blue-600 border-blue-500 shadow-sm ' 
                    : 'border-gray-600 group-hover:border-gray-500'
                }`}>
                  {rememberMe && (
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2.5 6L5 8.5L9.5 3.5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className="select-none">Remember me</span>
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full mt-8 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold py-4 px-4 rounded   transition-all flex justify-center items-center gap-2 group text-sm"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Authenticating...
                </>
              ) : (
                <>
                  Sign In
                  <LogIn size={18} className="group-hover:translate-x-1 group-hover:scale-110 transition-all" />
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center lg:text-left text-sm text-gray-500">
            Don't have an account?{' '}
            <Link to="/register" className="text-white hover:text-emerald-400 font-bold transition-colors">
              Join Zippi
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
