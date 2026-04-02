import React, { useEffect, useState } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import useAuthStore from './store/authStore';
import { MessageSquare, Users, Calendar, UserPlus, Smartphone, Shield, ArrowRight, CheckCircle2, LayoutDashboard } from 'lucide-react';
import Login from './pages/Login';
import Register from './pages/Register';
import ChatInterface from './pages/ChatInterface';
import Dashboard from './pages/Dashboard';
import ForgotPassword from './pages/ForgotPassword';

function ProtectedRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  if (isAuthenticated) return <Navigate to="/dashboard" replace />;
  return children;
}

function App() {
  const { checkAuth, token, user } = useAuthStore();
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      if (token && !user) await checkAuth();
      setIsInitializing(false);
    };
    initAuth();
  }, [token, user, checkAuth]);

  if (isInitializing) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-950 text-white gap-3">
        <svg className="animate-spin h-6 w-6 text-blue-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
        </svg>
        <span className="text-gray-400 text-lg">Loading...</span>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/register" element={<GuestRoute><Register /></GuestRoute>} />
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/chat" element={<ProtectedRoute><ChatInterface /></ProtectedRoute>} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

const FEATURES = [
  {
    icon: <MessageSquare size={22} className="text-white" />,
    title: 'Real-time Group Chat',
    desc: 'Instant messaging with channels, reactions, file sharing, and typing indicators.'
  },
  {
    icon: <Users size={22} className="text-white" />,
    title: 'Study Groups',
    desc: 'Create private or public study rooms for any subject, with tags to make them discoverable.'
  },
  {
    icon: <Calendar size={22} className="text-white" />,
    title: 'Events & Announcements',
    desc: 'Schedule study sessions, post class updates, and keep your whole network in sync.'
  },
  {
    icon: <UserPlus size={22} className="text-white" />,
    title: 'Connect with Classmates',
    desc: 'Find study partners, send connection requests, and build your academic network.'
  },
  {
    icon: <Smartphone size={22} className="text-white" />,
    title: 'Cross-Platform',
    desc: 'Use Zippi on web or mobile — your data is always in sync across all your devices.'
  },
  {
    icon: <Shield size={22} className="text-white" />,
    title: 'Private & Secure',
    desc: 'JWT-authenticated, rate-limited, and CORS-protected so only your group can access your data.'
  }
];

function Landing() {
  const { isAuthenticated } = useAuthStore();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#0A0A0A] text-gray-100 flex flex-col font-sans selection:bg-indigo-500/30">
      
      {/* Navbar */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrolled ? 'bg-[#0A0A0A]/80 backdrop-blur-md border-b border-gray-800/50' : 'bg-transparent pt-2'}`}>
        <div className="max-w-7xl mx-auto px-6 md:px-10 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-extrabold text-sm">Z</span>
            </div>
            <span className="font-bold text-xl text-white tracking-tight">Zippi</span>
          </div>
          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <Link to="/dashboard" className="px-5 py-2 rounded-md bg-white text-black font-semibold text-sm hover:bg-gray-100 transition-colors flex items-center gap-2">
                <LayoutDashboard size={16} />
                Dashboard
              </Link>
            ) : (
              <>
                <Link to="/login" className="hidden sm:block px-4 py-2 text-gray-400 hover:text-white font-medium text-sm transition-colors">
                  Log in
                </Link>
                <Link to="/register" className="px-5 py-2 rounded-md bg-white text-black hover:bg-gray-100 font-semibold text-sm transition-colors shadow-sm">
                  Sign up
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative flex flex-col items-center justify-center text-center min-h-[90vh] pt-24 pb-16 px-6 overflow-hidden">
        {/* Subtle grid background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff05_1px,transparent_1px),linear-gradient(to_bottom,#ffffff05_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto flex flex-col items-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-indigo-500/20 bg-indigo-500/10 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-8">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
            Introducing Zippi 1.0
          </div>

          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold text-white tracking-tight mb-8 leading-[1.1]">
            Your entire academic life, <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">
              organized in one place.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-gray-400 max-w-2xl leading-relaxed mb-10">
            Zippi brings your study groups, real-time chats, course announcements, and class materials together into a single, lightning-fast workspace.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-auto">
            <Link to={isAuthenticated ? '/dashboard' : '/register'}
              className="w-full sm:w-auto px-8 py-3.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-base transition-all flex items-center justify-center gap-2 shadow-[0_0_40px_-10px_rgba(79,70,229,0.5)]">
              {isAuthenticated ? 'Open Dashboard' : 'Get Started for Free'}
              <ArrowRight size={18} />
            </Link>
            {!isAuthenticated && (
              <Link to="/login" className="w-full sm:w-auto px-8 py-3.5 rounded-md border border-gray-800 hover:bg-gray-900 text-white font-semibold text-base transition-all flex items-center justify-center">
                Sign in to your account
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Trust/Social Proof Strip */}
      <div className="border-y border-gray-800/50 bg-[#0A0A0A]/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-6 sm:py-8 flex flex-col md:flex-row items-center justify-between gap-6 opacity-70">
          <p className="text-sm font-medium text-gray-500 uppercase tracking-widest">Trusted by students at</p>
          <div className="flex items-center justify-center gap-8 flex-wrap grayscale contrast-200 opacity-60">
            {/* Generic placeholder university names styled nicely */}
            <span className="font-serif text-xl font-bold tracking-tighter">Stanford</span>
            <span className="font-sans text-xl font-black tracking-tight">MIT</span>
            <span className="font-serif text-xl italic tracking-tight">Harvard</span>
            <span className="font-sans text-lg font-bold tracking-widest">BERKELEY</span>
            <span className="font-serif text-xl font-bold tracking-tight">Oxford</span>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <section className="py-24 md:py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-16 md:mb-24">
            <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Everything you need to <br/> ace your semester.</h2>
            <p className="text-gray-400 text-lg md:text-xl max-w-2xl">Zippi eliminates context-switching by combining messaging, scheduling, and collaboration in a distraction-free environment.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-12">
            {FEATURES.map((f, i) => (
              <div key={i} className="group relative">
                <div className="w-12 h-12 rounded-lg bg-gray-900 border border-gray-800 flex items-center justify-center mb-6 group-hover:border-indigo-500/50 transition-colors shadow-sm">
                  {f.icon}
                </div>
                <h3 className="font-bold text-white text-xl mb-3 tracking-tight">{f.title}</h3>
                <p className="text-gray-400 text-base leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-24 px-6 border-t border-gray-800/60 bg-[#0c0c0e]">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">Stop juggling apps. <br className="hidden sm:block"/>Start studying smarter.</h2>
          <p className="text-gray-400 text-lg mb-10">Set up your first study group in less than 60 seconds.</p>
          <Link to={isAuthenticated ? '/dashboard' : '/register'}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-md bg-white hover:bg-gray-100 text-black font-bold text-lg transition-colors">
            {isAuthenticated ? 'Go to Dashboard' : 'Sign Up Free'}
            <ArrowRight size={20} />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800/80 py-12 px-6 bg-[#0A0A0A]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-2.5">
            <div className="w-6 h-6 rounded bg-indigo-600 flex items-center justify-center">
              <span className="text-white font-bold text-xs">Z</span>
            </div>
            <span className="font-bold text-gray-300">Zippi</span>
          </div>
          <div className="flex items-center gap-6 text-sm font-medium text-gray-500">
             <Link to="/login" className="hover:text-gray-300 transition-colors">Log in</Link>
             <Link to="/register" className="hover:text-gray-300 transition-colors">Sign up</Link>
          </div>
          <p className="text-gray-600 text-sm">© {new Date().getFullYear()} Zippi Inc. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}

function NotFound() {
  return (
    <div className="flex h-screen bg-gray-950 text-gray-100 flex-col items-center justify-center gap-6 px-4">
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[20%] left-[20%] w-[50%] h-[50%] rounded-full bg-blue-900/10 blur-[120px]" />
      </div>
      <div className="relative text-center">
        <div className="text-[120px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 leading-none mb-4">404</div>
        <h2 className="text-2xl font-bold text-white mb-2">Page not found</h2>
        <p className="text-gray-500 mb-8">Looks like this page doesn't exist or has been moved.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/" className="px-6 py-3 rounded-full bg-blue-600 hover:bg-blue-500 text-white font-semibold transition-colors shadow-lg shadow-blue-500/20">
            ← Go Home
          </Link>
          <Link to="/dashboard" className="px-6 py-3 rounded-full border border-gray-700 hover:border-gray-500 text-gray-300 hover:text-white font-semibold transition-colors">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

export default App;
