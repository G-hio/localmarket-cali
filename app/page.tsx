import Link from 'next/link';
import { Store, ShoppingCart, MapPin } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 font-sans">
      {/* Logo y Eslogan */}
      <div className="text-center mb-12">
        <div className="flex justify-center mb-4">
          <div className="bg-orange-500 p-4 rounded-full shadow-lg">
            <Store size={48} color="white" />
          </div>
        </div>
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">
          Local<span className="text-orange-500">Market</span>
        </h1>
        <p className="text-gray-500 mt-2 flex items-center justify-center gap-1">
          <MapPin size={16} /> Valle del Lili & Sur de Cali
        </p>
      </div>

      {/* Botones de Acción */}
      <div className="w-full max-w-sm space-y-4">
        <Link href="/comerciante" className="group flex items-center justify-between bg-orange-500 hover:bg-orange-600 text-white p-6 rounded-2xl transition-all shadow-xl active:scale-95">
          <div className="flex flex-col items-start">
            <span className="text-lg font-bold">Soy Tendero</span>
            <span className="text-orange-100 text-sm">Gestionar mi inventario</span>
          </div>
          <Store className="opacity-80" size={32} />
        </Link>

        <Link href="/cliente" className="group flex items-center justify-between bg-gray-900 hover:bg-black text-white p-6 rounded-2xl transition-all shadow-xl active:scale-95">
          <div className="flex flex-col items-start">
            <span className="text-lg font-bold">Quiero Comprar</span>
            <span className="text-gray-400 text-sm">Ver productos cercanos</span>
          </div>
          <ShoppingCart className="opacity-80" size={32} />
        </Link>
      </div>

      {/* Pie de página de seguridad (Visión Oscar) */}
      <footer className="mt-16 text-xs text-gray-400 text-center">
        Protección de datos bajo Ley 1581 <br />
        © 2026 LocalMarket Cali
      </footer>
    </div>
  );
}