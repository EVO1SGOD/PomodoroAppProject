import { useState, useEffect, useCallback, useRef } from 'react';

type Mode = 'focus' | 'shortBreak' | 'longBreak';
type Theme = 'light' | 'dark';

interface Settings {
  focus: number;
  shortBreak: number;
  longBreak: number;
}

interface SessionRecord {
  date: string;
  duration: number;
  completedAt: string;
}

interface Stats {
  sessions: SessionRecord[];
}

const DEFAULT_SETTINGS: Settings = {
  focus: 25,
  shortBreak: 5,
  longBreak: 15,
};

const MODE_LABELS: Record<Mode, string> = {
  focus: 'Focus',
  shortBreak: 'Short Break',
  longBreak: 'Long Break',
};

interface ModeColors {
  light: { bg: string; ring: string; text: string; btn: string; btnHover: string };
  dark: { bg: string; ring: string; text: string; btn: string; btnHover: string };
}

const MODE_COLORS: Record<Mode, ModeColors> = {
  focus: {
    light: {
      bg: 'bg-gradient-to-br from-rose-50 to-orange-50',
      ring: 'stroke-rose-500',
      text: 'text-rose-600',
      btn: 'bg-rose-500',
      btnHover: 'hover:bg-rose-600',
    },
    dark: {
      bg: 'bg-gradient-to-br from-gray-900 to-gray-950',
      ring: 'stroke-rose-400',
      text: 'text-rose-400',
      btn: 'bg-rose-600',
      btnHover: 'hover:bg-rose-500',
    },
  },
  shortBreak: {
    light: {
      bg: 'bg-gradient-to-br from-emerald-50 to-teal-50',
      ring: 'stroke-emerald-500',
      text: 'text-emerald-600',
      btn: 'bg-emerald-500',
      btnHover: 'hover:bg-emerald-600',
    },
    dark: {
      bg: 'bg-gradient-to-br from-gray-900 to-gray-950',
      ring: 'stroke-emerald-400',
      text: 'text-emerald-400',
      btn: 'bg-emerald-600',
      btnHover: 'hover:bg-emerald-500',
    },
  },
  longBreak: {
    light: {
      bg: 'bg-gradient-to-br from-blue-50 to-indigo-50',
      ring: 'stroke-blue-500',
      text: 'text-blue-600',
      btn: 'bg-blue-500',
      btnHover: 'hover:bg-blue-600',
    },
    dark: {
      bg: 'bg-gradient-to-br from-gray-900 to-gray-950',
      ring: 'stroke-blue-400',
      text: 'text-blue-400',
      btn: 'bg-blue-600',
      btnHover: 'hover:bg-blue-500',
    },
  },
};

function getToday(): string {
  return new Date().toISOString().split('T')[0];
}

function loadSettings(): Settings {
  try {
    const saved = localStorage.getItem('pomodoro-settings');
    if (saved) return JSON.parse(saved);
  } catch {}
  return DEFAULT_SETTINGS;
}

function loadStats(): Stats {
  try {
    const saved = localStorage.getItem('pomodoro-stats');
    if (saved) return JSON.parse(saved);
  } catch {}
  return { sessions: [] };
}

function loadTheme(): Theme {
  try {
    const saved = localStorage.getItem('pomodoro-theme');
    if (saved === 'dark' || saved === 'light') return saved;
  } catch {}
  // Check system preference
  if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
    return 'dark';
  }
  return 'light';
}

function saveSettings(settings: Settings) {
  localStorage.setItem('pomodoro-settings', JSON.stringify(settings));
}

function saveStats(stats: Stats) {
  localStorage.setItem('pomodoro-stats', JSON.stringify(stats));
}

function saveTheme(theme: Theme) {
  localStorage.setItem('pomodoro-theme', theme);
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

function getTodaySessions(stats: Stats): SessionRecord[] {
  const today = getToday();
  return stats.sessions.filter(s => s.date === today);
}

export default function App() {
  const [settings, setSettings] = useState<Settings>(loadSettings);
  const [stats, setStats] = useState<Stats>(loadStats);
  const [theme, setTheme] = useState<Theme>(loadTheme);
  const [mode, setMode] = useState<Mode>('focus');
  const [timeLeft, setTimeLeft] = useState(settings.focus * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [tempSettings, setTempSettings] = useState<Settings>(loadSettings);
  const intervalRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);

  const isDark = theme === 'dark';
  const colors = MODE_COLORS[mode][theme];

  const totalSeconds = settings[mode === 'focus' ? 'focus' : mode === 'shortBreak' ? 'shortBreak' : 'longBreak'] * 60;
  const progress = (totalSeconds - timeLeft) / totalSeconds;

  // Apply theme to html element
  useEffect(() => {
    document.documentElement.classList.toggle('dark', isDark);
  }, [isDark]);

  // Timer logic
  useEffect(() => {
    if (isRunning) {
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
      intervalRef.current = window.setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);
            if (intervalRef.current) clearInterval(intervalRef.current);

            if (mode === 'focus' && startTimeRef.current) {
              const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
              const newStats: Stats = {
                ...stats,
                sessions: [
                  ...stats.sessions,
                  {
                    date: getToday(),
                    duration: elapsed,
                    completedAt: new Date().toISOString(),
                  },
                ],
              };
              setStats(newStats);
              saveStats(newStats);
            }

            startTimeRef.current = null;
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, mode, stats]);

  // Update document title
  useEffect(() => {
    document.title = `${formatTime(timeLeft)} - ${MODE_LABELS[mode]} | Pomodoro`;
  }, [timeLeft, mode]);

  const toggleTheme = () => {
    const newTheme: Theme = isDark ? 'light' : 'dark';
    setTheme(newTheme);
    saveTheme(newTheme);
  };

  const handleModeChange = useCallback((newMode: Mode) => {
    setIsRunning(false);
    startTimeRef.current = null;
    setMode(newMode);
    const duration = newMode === 'focus' ? settings.focus : newMode === 'shortBreak' ? settings.shortBreak : settings.longBreak;
    setTimeLeft(duration * 60);
  }, [settings]);

  const handleStart = () => {
    if (timeLeft > 0) {
      setIsRunning(true);
      if (!startTimeRef.current) {
        startTimeRef.current = Date.now();
      }
    }
  };

  const handlePause = () => {
    setIsRunning(false);
  };

  const handleReset = () => {
    setIsRunning(false);
    startTimeRef.current = null;
    const duration = mode === 'focus' ? settings.focus : mode === 'shortBreak' ? settings.shortBreak : settings.longBreak;
    setTimeLeft(duration * 60);
  };

  const handleSaveSettings = () => {
    setSettings(tempSettings);
    saveSettings(tempSettings);
    setShowSettings(false);
    if (!isRunning) {
      const duration = mode === 'focus' ? tempSettings.focus : mode === 'shortBreak' ? tempSettings.shortBreak : tempSettings.longBreak;
      setTimeLeft(duration * 60);
    }
  };

  const handleOpenSettings = () => {
    setTempSettings(settings);
    setShowSettings(true);
  };

  const todaySessions = getTodaySessions(stats);
  const todayPomodoros = todaySessions.length;
  const todayFocusMinutes = Math.round(todaySessions.reduce((sum, s) => sum + s.duration, 0) / 60);
  const todayFocusHours = Math.floor(todayFocusMinutes / 60);
  const remainingMinutes = todayFocusMinutes % 60;

  // SVG circle parameters
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className={`min-h-screen ${colors.bg} transition-colors duration-500 flex flex-col`}>
      {/* Header */}
      <header className="p-4 sm:p-6 flex justify-between items-center">
        <h1 className={`text-xl sm:text-2xl font-bold ${isDark ? 'text-gray-100' : 'text-gray-800'} flex items-center gap-2 transition-colors duration-300`}>
          <span className="text-2xl">🍅</span>
          <span>Pomodoro</span>
        </h1>
        <div className="flex items-center gap-2">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              isDark
                ? 'hover:bg-white/10 text-gray-300 hover:text-yellow-300'
                : 'hover:bg-black/5 text-gray-600 hover:text-gray-800'
            }`}
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? (
              // Sun icon
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
            ) : (
              // Moon icon
              <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            )}
          </button>
          {/* Settings Button */}
          <button
            onClick={handleOpenSettings}
            className={`p-2 rounded-lg transition-colors duration-200 ${
              isDark
                ? 'hover:bg-white/10 text-gray-300 hover:text-gray-100'
                : 'hover:bg-black/5 text-gray-600 hover:text-gray-800'
            }`}
            title="Settings"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 pb-8">
        {/* Mode Tabs */}
        <div className={`flex gap-2 mb-8 rounded-xl p-1.5 shadow-sm backdrop-blur-sm transition-colors duration-300 ${
          isDark ? 'bg-white/5' : 'bg-white/50'
        }`}>
          {(Object.keys(MODE_LABELS) as Mode[]).map((m) => (
            <button
              key={m}
              onClick={() => handleModeChange(m)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                mode === m
                  ? `${MODE_COLORS[m][theme].btn} text-white shadow-md`
                  : isDark
                    ? 'text-gray-300 hover:bg-white/10'
                    : 'text-gray-600 hover:bg-white/60'
              }`}
            >
              {MODE_LABELS[m]}
            </button>
          ))}
        </div>

        {/* Timer Circle */}
        <div className="relative mb-8">
          <svg width="280" height="280" className="transform -rotate-90">
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              stroke="currentColor"
              className={`transition-colors duration-300 ${isDark ? 'text-gray-700' : 'text-gray-200'}`}
              strokeWidth="8"
            />
            <circle
              cx="140"
              cy="140"
              r={radius}
              fill="none"
              className={`${colors.ring} transition-all duration-1000`}
              strokeWidth="8"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className={`text-5xl sm:text-6xl font-mono font-bold ${colors.text} tracking-tight transition-colors duration-300`}>
              {formatTime(timeLeft)}
            </span>
            <span className={`text-sm mt-2 font-medium uppercase tracking-wide transition-colors duration-300 ${
              isDark ? 'text-gray-400' : 'text-gray-500'
            }`}>
              {MODE_LABELS[mode]}
            </span>
          </div>
        </div>

        {/* Controls */}
        <div className="flex gap-4 mb-10">
          {!isRunning ? (
            <button
              onClick={handleStart}
              disabled={timeLeft === 0}
              className={`${colors.btn} ${colors.btnHover} text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100`}
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
                Start
              </span>
            </button>
          ) : (
            <button
              onClick={handlePause}
              className="bg-amber-500 hover:bg-amber-600 text-white px-8 py-3 rounded-xl font-semibold text-lg shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
            >
              <span className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                </svg>
                Pause
              </span>
            </button>
          )}
          <button
            onClick={handleReset}
            className={`px-6 py-3 rounded-xl font-semibold text-lg shadow-lg border transition-all duration-200 transform hover:scale-105 active:scale-95 ${
              isDark
                ? 'bg-gray-800 hover:bg-gray-700 text-gray-200 border-gray-600'
                : 'bg-white hover:bg-gray-50 text-gray-700 border-gray-200'
            }`}
          >
            <span className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Reset
            </span>
          </button>
        </div>

        {/* Today's Statistics */}
        <div className={`w-full max-w-md rounded-2xl p-6 shadow-sm border backdrop-blur-sm transition-colors duration-300 ${
          isDark
            ? 'bg-gray-800/70 border-gray-700/50'
            : 'bg-white/70 border-white/50'
        }`}>
          <h2 className={`text-lg font-semibold mb-4 flex items-center gap-2 transition-colors duration-300 ${
            isDark ? 'text-gray-100' : 'text-gray-800'
          }`}>
            <svg xmlns="http://www.w3.org/2000/svg" className={`w-5 h-5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Today's Focus
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div className={`rounded-xl p-4 text-center transition-colors duration-300 ${
              isDark ? 'bg-gray-700/60' : 'bg-white/80'
            }`}>
              <div className={`text-3xl font-bold transition-colors duration-300 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>{todayPomodoros}</div>
              <div className={`text-sm mt-1 transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Pomodoros</div>
            </div>
            <div className={`rounded-xl p-4 text-center transition-colors duration-300 ${
              isDark ? 'bg-gray-700/60' : 'bg-white/80'
            }`}>
              <div className={`text-3xl font-bold transition-colors duration-300 ${isDark ? 'text-gray-100' : 'text-gray-800'}`}>
                {todayFocusHours > 0 ? `${todayFocusHours}h ` : ''}{remainingMinutes}m
              </div>
              <div className={`text-sm mt-1 transition-colors duration-300 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Focus Time</div>
            </div>
          </div>
          {todayPomodoros > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {todaySessions.map((session, i) => (
                <div
                  key={i}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors duration-300 ${
                    isDark ? 'bg-rose-900/50' : 'bg-rose-100'
                  }`}
                  title={`Session ${i + 1}: ${Math.round(session.duration / 60)} min`}
                >
                  🍅
                </div>
              ))}
            </div>
          )}
          {todayPomodoros === 0 && (
            <p className={`mt-4 text-center text-sm transition-colors duration-300 ${
              isDark ? 'text-gray-500' : 'text-gray-400'
            }`}>
              No sessions yet today. Start your first pomodoro!
            </p>
          )}
        </div>
      </main>

      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowSettings(false)}>
          <div className={`rounded-2xl p-6 w-full max-w-sm shadow-2xl transition-colors duration-300 ${
            isDark ? 'bg-gray-800 border border-gray-700' : 'bg-white'
          }`} onClick={(e) => e.stopPropagation()}>
            <h2 className={`text-xl font-bold mb-6 flex items-center gap-2 transition-colors duration-300 ${
              isDark ? 'text-gray-100' : 'text-gray-800'
            }`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
              </svg>
              Timer Settings
            </h2>
            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Focus Duration (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="120"
                  value={tempSettings.focus}
                  onChange={(e) => setTempSettings({ ...tempSettings, focus: Math.max(1, Math.min(120, parseInt(e.target.value) || 1)) })}
                  className={`w-full px-4 py-2 rounded-lg outline-none transition-colors duration-200 ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-2 focus:ring-rose-500 border'
                      : 'border border-gray-300 focus:ring-2 focus:ring-rose-500 focus:border-transparent'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Short Break (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="30"
                  value={tempSettings.shortBreak}
                  onChange={(e) => setTempSettings({ ...tempSettings, shortBreak: Math.max(1, Math.min(30, parseInt(e.target.value) || 1)) })}
                  className={`w-full px-4 py-2 rounded-lg outline-none transition-colors duration-200 ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-2 focus:ring-emerald-500 border'
                      : 'border border-gray-300 focus:ring-2 focus:ring-emerald-500 focus:border-transparent'
                  }`}
                />
              </div>
              <div>
                <label className={`block text-sm font-medium mb-1 transition-colors duration-300 ${
                  isDark ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  Long Break (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={tempSettings.longBreak}
                  onChange={(e) => setTempSettings({ ...tempSettings, longBreak: Math.max(1, Math.min(60, parseInt(e.target.value) || 1)) })}
                  className={`w-full px-4 py-2 rounded-lg outline-none transition-colors duration-200 ${
                    isDark
                      ? 'bg-gray-700 border-gray-600 text-gray-100 focus:ring-2 focus:ring-blue-500 border'
                      : 'border border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                  }`}
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowSettings(false)}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  isDark
                    ? 'border border-gray-600 text-gray-300 hover:bg-gray-700'
                    : 'border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Cancel
              </button>
              <button
                onClick={handleSaveSettings}
                className={`flex-1 px-4 py-2 rounded-lg font-medium transition-colors duration-200 ${
                  isDark
                    ? 'bg-gray-200 text-gray-900 hover:bg-gray-100'
                    : 'bg-gray-800 text-white hover:bg-gray-900'
                }`}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className={`p-4 text-center text-sm transition-colors duration-300 ${
        isDark ? 'text-gray-500' : 'text-gray-400'
      }`}>
        Stay focused, one pomodoro at a time 🎯
      </footer>
    </div>
  );
}
