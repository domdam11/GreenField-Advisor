import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Link, useNavigate } from 'react-router-dom';
import { Menu, X, Leaf, User, UserPlus, LogOut, ChevronDown } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Navbar({ overlay = false }) {
    const [openMobile, setOpenMobile] = useState(false);
    const [openPiante, setOpenPiante] = useState(false);
    const [openAI, setOpenAI] = useState(false);

    const mobileRef = useRef(null);
    const pianteRef = useRef(null);
    const aiRef = useRef(null);

    const navigate = useNavigate();
    const { isAuthenticated, user, logout } = useAuth();
    // Variabili derivate dall'utente
    const avatarUrl = user?.avatarUrl ?? null;
    const ruolo = user?.ruolo ?? 'utente';

    // Chiudi menu mobile e dropdown cliccando fuori o premendo Esc
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (mobileRef.current && !mobileRef.current.contains(event.target)) setOpenMobile(false);
            if (pianteRef.current && !pianteRef.current.contains(event.target)) setOpenPiante(false);
            if (aiRef.current && !aiRef.current.contains(event.target)) setOpenAI(false);
        };
        const handleEsc = (event) => {
            if (event.key === 'Escape') {
                setOpenMobile(false);
                setOpenPiante(false);
                setOpenAI(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEsc);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEsc);
        };
    }, []);

    // Classi base
    const wrapperClass = overlay
        ? 'absolute inset-x-0 top-0 z-50 bg-transparent'
        : 'relative z-50 bg-[#155E3C] shadow-[0_1px_12px_rgba(0,0,0,0.15)]';

    const linkBase = 'inline-flex items-center px-4 py-3 rounded-md text-lg font-medium transition-colors duration-150';
    const linkIdle = 'text-white/85 hover:text-white hover:bg-white/10';
    const linkActive = 'text-white bg-white/10';
    const logoRing = overlay ? 'bg-white/20' : 'bg-white/15';

    // Dropdown (nuovo stile più coerente con navbar)
    const dropPanel =
        'absolute left-0 mt-2 min-w-[220px] rounded-lg bg-[#134e35]/95 text-white border border-white/10 shadow-xl backdrop-blur-sm p-2';
    const dropItem =
        'block w-full text-left rounded-md px-3 py-2 text-[15px] font-medium text-white/90 ' +
        'hover:bg-emerald-600/30 hover:text-white transition-colors';


    // Bottoni (guest)
    const btnLogin =
        'inline-flex items-center gap-3 rounded-lg border px-5 py-3 text-lg font-semibold ' +
        (overlay ? 'border-white/70 text-white hover:bg-white/10' : 'border-white/60 text-white hover:bg-white/10');
    const btnRegister =
        'inline-flex items-center gap-3 rounded-lg px-5 py-3 text-lg font-semibold ' +
        (overlay ? 'bg-white text-[#155E3C] hover:bg-emerald-50' : 'bg-white text-[#155E3C] hover:bg-emerald-50');

    // Bottoni (logged)
    const btnGhost = 'inline-flex items-center gap-3 rounded-lg border px-5 py-3 text-lg font-semibold border-white/60 text-white hover:bg-white/10';
    const btnPrimary = 'inline-flex items-center gap-3 rounded-lg bg-white px-5 py-3 text-lg font-semibold text-[#155E3C] hover:bg-emerald-50';

    const initials = (user?.username || user?.email || 'U')
        .split(' ')
        .map((p) => p[0]?.toUpperCase())
        .join('')
        .slice(0, 2);

    const handleLogout = async () => {
        await logout();
        navigate('/', { replace: true });
    };

    return (
        <nav className={`${wrapperClass} border-b-2 border-emerald-800`}>
            <div className="w-full px-0">
                <div className="flex h-20 items-center">
                    {/* Logo sinistra */}
                    <Link to="/" className="flex items-center gap-3 pl-4">
            <span className={`inline-flex h-12 w-12 items-center justify-center rounded-full ${logoRing}`}>
              <Leaf className="h-7 w-7 text-emerald-200" />
            </span>
                        <span className="text-2xl font-semibold tracking-tight text-white">Home Gardening</span>
                    </Link>

                    {/* Nav centrale */}
                    <div className="hidden md:flex items-center gap-12 ml-8">
                        {!isAuthenticated ? (
                            <>
                                <NavLink to="/" end className={`${linkBase} ${linkIdle}`}>
                                    Home
                                </NavLink>
                                <a href="/#funzionalita" className={`${linkBase} ${linkIdle}`}>
                                    Funzionalità
                                </a>

                            </>
                        ) : (
                            <>
                                <NavLink to="/dashboard" className={({ isActive }) => `${linkBase} ${isActive ? linkActive : linkIdle}`}>
                                    Dashboard
                                </NavLink>

                                {/* Dropdown Piante */}
                                <div className="relative" ref={pianteRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpenPiante((v) => !v);
                                            setOpenAI(false);
                                        }}
                                        className={`${linkBase} ${linkIdle} gap-2`}
                                    >
                                        Piante <ChevronDown className={`h-4 w-4 transition-transform ${openPiante ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openPiante && (
                                        <div className={dropPanel}>
                                            <Link to="/piante" className={dropItem} onClick={() => setOpenPiante(false)}>
                                                Le mie piante
                                            </Link>

                                        </div>
                                    )}
                                </div>

                                {/* Dropdown AI Tools */}
                                <div className="relative" ref={aiRef}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setOpenAI((v) => !v);
                                            setOpenPiante(false);
                                        }}
                                        className={`${linkBase} ${linkIdle} gap-2`}
                                    >
                                        AI Tools <ChevronDown className={`h-4 w-4 transition-transform ${openAI ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openAI && (
                                        <div className={dropPanel}>

                                            <Link to="/ai/irrigazione" className={dropItem} onClick={() => setOpenAI(false)}>
                                                Previsione irrigazione
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            </>
                        )}
                    </div>

                    {/* Azioni destra */}
                    <div className="hidden md:flex items-center gap-4 ml-auto pr-4">
                        {!isAuthenticated ? (
                            <>
                                <Link to="/login" className={btnLogin}>
                                    <User className="h-5 w-5" /> Accedi
                                </Link>
                                <Link to="/register" className={btnRegister}>
                                    <UserPlus className="h-5 w-5" /> Registrati
                                </Link>
                            </>
                        ) : (
                            <>
                                {/* Avatar utente (DESKTOP) */}
                                <div className="hidden lg:flex items-center justify-center">
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt="Avatar"
                                            className="h-10 w-10 rounded-full border-2 border-white object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-white/15 text-white font-semibold flex items-center justify-center">
                                            {initials}
                                        </div>
                                    )}
                                </div>
                                <Link to="/profilo" className={btnGhost}>
                                    Profilo
                                </Link>
                                <button onClick={handleLogout} className={btnPrimary}>
                                    <LogOut className="h-5 w-5" /> Logout
                                </button>
                            </>
                        )}
                    </div>

                    {/* Bottone mobile */}
                    <button
                        className="md:hidden ml-auto mr-2 inline-flex items-center justify-center rounded-md p-3 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-white/60"
                        onClick={() => setOpenMobile((v) => !v)}
                        aria-label="Open menu"
                    >
                        {openMobile ? <X className="h-7 w-7" /> : <Menu className="h-7 w-7" />}
                    </button>
                </div>
            </div>

            {/* Mobile menu (invariato nella logica, leggero polish visivo) */}
            {openMobile && (
                <div ref={mobileRef} className="md:hidden border-t border-white/15 bg-[#165f3e]">
                    <div className="px-4 py-4 space-y-2">
                        {!isAuthenticated ? (
                            <>
                                <NavLink to="/" end onClick={() => setOpenMobile(false)} className="block rounded-md px-4 py-3 text-lg text-white/85 hover:bg-white/10">
                                    Home
                                </NavLink>
                                <a href="/#funzionalita" className={`${linkBase} ${linkIdle}`}>
                                    Funzionalità
                                </a>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <Link to="/login" onClick={() => setOpenMobile(false)} className={btnLogin}>
                                        <User className="h-5 w-5" /> Accedi
                                    </Link>
                                    <Link to="/register" onClick={() => setOpenMobile(false)} className={btnRegister}>
                                        <UserPlus className="h-5 w-5" /> Registrati
                                    </Link>
                                </div>
                            </>
                        ) : (
                            <>

                                {/* Header utente (MOBILE) */}
                                <div className="flex items-center gap-3 px-4 py-3">
                                    {avatarUrl ? (
                                        <img
                                            src={avatarUrl}
                                            alt="Avatar"
                                            className="h-10 w-10 rounded-full border border-white/40 object-cover"
                                        />
                                    ) : (
                                        <div className="h-10 w-10 rounded-full bg-white/15 text-white font-semibold flex items-center justify-center">
                                            {initials}
                                        </div>
                                    )}
                                    <div className="flex flex-col">
    <span className="text-white font-medium leading-tight">
      {user?.username || user?.email}
    </span>
                                        <span className="text-white/70 text-sm capitalize leading-tight">
      {ruolo}
    </span>
                                    </div>
                                </div>
                                <NavLink to="/dashboard" onClick={() => setOpenMobile(false)} className="block rounded-md px-4 py-3 text-lg text-white/85 hover:bg-white/10">
                                    Dashboard
                                </NavLink>

                                {/* Piante fisarmonica */}
                                <div className="border-t border-white/10 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setOpenPiante((v) => !v)}
                                        className="w-full flex items-center justify-between rounded-md px-4 py-3 text-lg text-white/90 hover:bg-white/10"
                                    >
                                        <span>Piante</span>
                                        <ChevronDown className={`h-5 w-5 transition-transform ${openPiante ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openPiante && (
                                        <div className="pl-4 py-2 space-y-1">
                                            <Link to="/piante" onClick={() => setOpenMobile(false)} className="block rounded-md px-3 py-2 text-white/85 hover:bg-white/10">
                                                Le mie piante
                                            </Link>

                                        </div>
                                    )}
                                </div>

                                {/* AI Tools fisarmonica */}
                                <div className="border-t border-white/10 pt-2">
                                    <button
                                        type="button"
                                        onClick={() => setOpenAI((v) => !v)}
                                        className="w-full flex items-center justify-between rounded-md px-4 py-3 text-lg text-white/90 hover:bg-white/10"
                                    >
                                        <span>AI Tools</span>
                                        <ChevronDown className={`h-5 w-5 transition-transform ${openAI ? 'rotate-180' : ''}`} />
                                    </button>
                                    {openAI && (
                                        <div className="pl-4 py-2 space-y-1">

                                            <Link to="/ai/irrigazione" onClick={() => setOpenMobile(false)} className="block rounded-md px-3 py-2 text-white/85 hover:bg-white/10">
                                                Previsione irrigazione
                                            </Link>


                                        </div>
                                    )}
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-3">
                                    <Link to="/profilo" onClick={() => setOpenMobile(false)} className={btnGhost}>
                                        Profilo
                                    </Link>
                                    <button
                                        onClick={() => {
                                            handleLogout();
                                            setOpenMobile(false);
                                        }}
                                        className={btnPrimary}
                                    >
                                        <LogOut className="h-5 w-5" /> Logout
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
}