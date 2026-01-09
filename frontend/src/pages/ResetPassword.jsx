import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Lock, ArrowLeft, Sprout, CheckCircle, Eye, EyeOff } from 'lucide-react';
import { api } from '../api/axiosInstance';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [validatingToken, setValidatingToken] = useState(true);
  const [tokenValid, setTokenValid] = useState(false);
  const [success, setSuccess] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Valida token all'apertura della pagina
  useEffect(() => {
    const validateToken = async () => {
      if (!token) {
        setError('Token mancante nell\'URL');
        setValidatingToken(false);
        return;
      }

      try {
        const response = await api.get(
          `/api/auth/validate-reset-token/${token}`
        );
        
        if (response.data.valid) {
          setTokenValid(true);
        } else {
          setError(response.data.reason || 'Token non valido');
        }
      } catch (err) {
        setError('Errore durante la validazione del token');
      } finally {
        setValidatingToken(false);
      }
    };

    validateToken();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    // Validazione client-side
    if (newPassword !== confirmPassword) {
      setError('Le password non coincidono');
      return;
    }

    if (!newPassword) {
      setError('La password non può essere vuota');
      return;
    }

    setLoading(true);

    try {
      const response = await api.post(
        '/api/auth/reset-password',
        {
          token: token,
          newPassword: newPassword
        }
      );

      setSuccess(true);
      setMessage(response.data.message);

    } catch (err) {
      setError(err.response?.data?.detail || 'Errore durante il reset della password');
    } finally {
      setLoading(false);
    }
  };

  // Mostra loading durante validazione token
  if (validatingToken) {
    return (
      <div className="min-h-screen flex items-center justify-center relative py-10 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 -z-20"></div>
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-emerald-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Validazione token in corso...</p>
        </div>
      </div>
    );
  }

  // Mostra errore se token non valido
  if (!tokenValid) {
    return (
      <div className="min-h-screen flex items-center justify-center relative py-10 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 -z-20"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[100px] -z-10"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="glass bg-white/70 p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 border border-white text-center">
            <div className="text-red-500 text-6xl mb-6">❌</div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Link Non Valido</h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <button
              onClick={() => navigate('/forgot-password')}
              className="w-full bg-emerald-600 text-white px-6 py-3 rounded-2xl font-semibold hover:bg-emerald-700 transition"
            >
              Richiedi Nuovo Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Mostra schermata di successo
  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center relative py-10 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 -z-20"></div>
        <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[100px] -z-10"></div>

        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-10">
            <div className="inline-flex bg-gradient-to-br from-emerald-500 to-teal-500 p-5 rounded-3xl shadow-xl mb-6">
              <CheckCircle className="h-12 w-12 text-white" />
            </div>
            <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
              Password Aggiornata! ✅
            </h2>
            <p className="text-gray-600 font-medium">
              La tua password è stata reimpostata con successo
            </p>
          </div>

          <div className="glass bg-white/70 p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 border border-white">
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-6">
              <p className="text-emerald-700 font-medium text-center">
                {message}
              </p>
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/30 transition"
            >
              Vai al Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Form per inserire nuova password
  return (
    <div className="min-h-screen flex items-center justify-center relative py-10 px-4 overflow-hidden">
      {/* Sfondo decorativo */}
      <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 to-teal-50 -z-20"></div>
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-emerald-200/30 rounded-full blur-[100px] -z-10"></div>

      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-10">
          <div className="inline-flex bg-gradient-to-br from-emerald-500 to-teal-500 p-5 rounded-3xl shadow-xl mb-6 transform rotate-6">
            <Sprout className="h-10 w-10 text-white" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-tight mb-2">
            Reimposta Password
          </h2>
          <p className="text-gray-600 font-medium">
            Inserisci la tua nuova password
          </p>
        </div>

        <div className="glass bg-white/70 p-10 rounded-[2.5rem] shadow-2xl shadow-emerald-900/10 border border-white">
          {/* Messaggi di errore */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-sm font-bold text-center">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nuova Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-1">
                Nuova Password
              </label>
              <div className="relative">
                <Lock className="absolute left-5 top-4 h-5 w-5 text-gray-400" />
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-100 transition-all font-medium text-gray-800"
                  placeholder="Inserisci nuova password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-5 top-4 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Conferma Password */}
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 ml-1">
                Conferma Password
              </label>
              <div className="relative">
                <Lock className="absolute left-5 top-4 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full pl-12 pr-12 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-4 focus:ring-emerald-100 transition-all font-medium text-gray-800"
                  placeholder="Ripeti la password"
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-5 top-4 text-gray-400 hover:text-emerald-600 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Bottone */}
            <button
              type="submit"
              disabled={loading}
              className="btn-bouncy w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-4 rounded-2xl shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 text-lg disabled:bg-gray-400"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4" 
                      fill="none"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                  Aggiornamento...
                </>
              ) : (
                'Reimposta Password'
              )}
            </button>
          </form>
        </div>

        {/* Link torna al login */}
        <div className="text-center mt-8">
          <button
            onClick={() => navigate('/login')}
            className="text-emerald-700 font-bold hover:underline inline-flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Torna al Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
