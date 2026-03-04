"use client";

import Link from 'next/link';
import { Store, ShoppingCart, MapPin, ShieldCheck } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 font-sans">
      
      {/* Logo y Eslogan */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-6">
          <div className="bg-white p-6 rounded-3xl border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <Store size={60} className="text-orange-600" />
          </div>
        </div>
        <h1 className="text-5xl font-black text-black tracking-tighter uppercase italic">
          Local<span className="text-orange-600">Market</span>
        </h1>
        <div className="flex items-center justify-center gap-2 mt-2">
          <span className="bg-black text-white text-[10px] font-black px-2 py-1 uppercase tracking-widest">Cali - Valle del Lili</span>
          <p className="text-gray-500 font-bold text-xs flex items-center gap-1 uppercase">
            <MapPin size={14} className="text-red-500" /> Comercio de Barrio
          </p>
        </div>
      </div>

      {/* Botones de Acción */}
      <div className="w-full max-w-sm space-y-6">
        
        {/* RUTA PARA EL CLIENTE (Vitrinas) */}
        <Link href="/cliente" className="group flex items-center justify-between bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
          <div className="flex flex-col items-start">
            <span className="text-2xl font-black uppercase tracking-tight">Quiero Comprar</span>
            <span className="text-gray-500 font-bold text-xs uppercase">Ver vitrina de productos</span>
          </div>
          <ShoppingCart className="text-black group-hover:scale-110 transition-transform" size={40} />
        </Link>

        {/* RUTA PARA EL TENDERO (Login/Registro) */}
        <Link href="/login" className="group flex items-center justify-between bg-orange-500 border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all">
          <div className="flex flex-col items-start text-white">
            <span className="text-2xl font-black uppercase tracking-tight">Soy Tendero</span>
            <span className="text-orange-100 font-bold text-xs uppercase">Gestionar mi negocio</span>
          </div>
          <Store className="text-white group-hover:scale-110 transition-transform" size={40} />
        </Link>

      </div>

      {/* Acceso Rápido Admin (Opcional para pruebas) */}
      <div className="mt-12 opacity-30 hover:opacity-100 transition-opacity">
         <Link href="/login" className="flex items-center gap-2 text-[10px] font-black uppercase text-gray-400">
            <ShieldCheck size={12}/> Acceso Administrativo
         </Link>
      </div>

      {/* Pie de página de seguridad */}
      <footer className="mt-16 text-[10px] text-gray-400 text-center font-bold uppercase tracking-widest leading-loose">
        Protección de datos bajo Ley 1581 <br />
        Desarrollado para LocalMarket Cali © 2026
      </footer>
    </div>
  );
}