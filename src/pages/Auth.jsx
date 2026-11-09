import React, { useState, useEffect } from 'react';
import { Factory, Lock, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useApp } from '../context/AppContext.jsx';
import { Button } from '../components/UI.jsx';

export const SplashScreen = ({ onDone }) => {
  useEffect(() => {
    const timer = setTimeout(onDone, 2200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className="fixed inset-0 bg-gray-950 flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-6 animate-fade-in">
        <div className="relative">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-2xl shadow-blue-600/40">
            <Factory size={48} className="text-white" />
          </div>
          <div className="absolute inset-0 rounded-3xl bg-blue-500/20 animate-ping" />
        </div>
        <div className="text-center">
          <h1 className="text-3xl font-black text-white tracking-tight">Siam Plastic</h1>
          <p className="text-blue-400 font-semibold text-lg tracking-widest uppercase mt-1">Factory Manager</p>
          <p className="text-gray-500 text-sm mt-2">Production ERP System</p>
        </div>
        <div className="flex gap-1.5 mt-4">
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
      <p className="absolute bottom-8 text-gray-600 text-xs">© 2025 Siam Plastic Factory</p>
    </div>
  );
};

export const LoginPage = () => {
  const { login } = useApp();
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPin, setShowPin] = useState(false);

  const handlePinInput = (digit) => {
    if (pin.length < 4) {
      const newPin = pin + digit;
      setPin(newPin);
      setError('');
      if (newPin.length === 4) handleLogin(newPin);
    }
  };

  const handleLogin = async (p) => {
    setLoading(true);
    const success = await login(p || pin);
    if (!success) {
      setError('Incorrect PIN. Try again.');
      setPin('');
    }
    setLoading(false);
  };

  const handleClear = () => {
    setPin(pin.slice(0, -1));
    setError('');
  };

  const digits = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center shadow-xl shadow-blue-600/30 mb-4">
            <Factory size={40} className="text-white" />
          </div>
          <h1 className="text-2xl font-black text-white">Siam Plastic</h1>
          <p className="text-gray-400 text-sm mt-1">Factory Manager</p>
        </div>

        {/* PIN display */}
        <div className="bg-gray-900 border border-gray-700/50 rounded-2xl p-6 mb-6">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Lock size={16} className="text-gray-500" />
            <span className="text-gray-400 text-sm font-medium">Enter PIN</span>
          </div>
          <div className="flex justify-center gap-4 my-4">
            {[0,1,2,3].map(i => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 transition-all duration-150 ${
                  i < pin.length ? 'bg-blue-500 border-blue-500 scale-110' : 'bg-transparent border-gray-600'
                }`}
              />
            ))}
          </div>
          {error && (
            <p className="text-red-400 text-xs text-center font-medium">{error}</p>
          )}
        </div>

        {/* Numpad */}
        <div className="grid grid-cols-3 gap-3">
          {digits.map((d, i) => (
            <button
              key={i}
              onClick={() => d === '⌫' ? handleClear() : d !== '' ? handlePinInput(d) : null}
              disabled={loading || d === ''}
              className={`h-14 rounded-xl font-bold text-xl transition-all duration-150 active:scale-95 ${
                d === '' ? 'invisible' :
                d === '⌫' ? 'bg-gray-800 hover:bg-gray-700 text-gray-400 border border-gray-700' :
                'bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 hover:border-blue-500/50'
              } ${loading ? 'opacity-50' : ''}`}
            >
              {loading && d === pin[3] ? <Loader2 size={20} className="animate-spin mx-auto" /> : d}
            </button>
          ))}
        </div>

        <p className="text-center text-gray-600 text-xs mt-6">Default PIN: 1234</p>
      </div>
    </div>
  );
};
