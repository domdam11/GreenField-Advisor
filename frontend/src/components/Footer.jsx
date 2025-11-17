
import React from 'react';
import { Leaf, Facebook, Instagram, Youtube, } from 'lucide-react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#155E3C] text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">

        {/* Contenuto centrato */}
        <div className="flex flex-col items-center text-center">

          {/* Logo e nome */}
          <div className="flex items-center space-x-2 mb-3">
            <Leaf className="h-7 w-7 text-emerald-300" />
            <span className="font-bold text-lg">Home Gardening</span>
          </div>

          {/* Descrizione */}
          <p className="text-emerald-100 mb-4 text-sm max-w-xl">
            La piattaforma completa per gestire il tuo giardino con intelligenza artificiale
            e strumenti innovativi. Coltiva il futuro, oggi.
          </p>

          {/* Social Icons - navigazione interna */}
          <div className="flex space-x-3 mb-4">
            <Link
              to="/facebook"
              aria-label="Facebook"
              className="bg-emerald-700 p-2 rounded-full hover:bg-emerald-600 transition-colors"
            >
              <Facebook className="h-4 w-4" />
            </Link>

            <Link
              to="/instagram"
              aria-label="Instagram"
              className="bg-emerald-700 p-2 rounded-full hover:bg-emerald-600 transition-colors"
            >
              <Instagram className="h-4 w-4" />
            </Link>

            <Link
              to="/youtube"
              aria-label="YouTube"
              className="bg-emerald-700 p-2 rounded-full hover:bg-emerald-600 transition-colors"
            >
              <Youtube className="h-4 w-4" />
            </Link>
          </div>

          {/* Copyright */}
          <div className="border-t border-emerald-700 w-full pt-4">
            <p className="text-emerald-100 text-xs text-center">
              © 2025 Home Gardening. Tutti i diritti riservati.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;