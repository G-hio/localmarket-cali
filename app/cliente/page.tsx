'use client';
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { ShoppingBasket, ArrowLeft, MessageCircle, Search, Filter } from 'lucide-react';
import Link from 'next/link';

export default function PaginaCliente() {
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [catSeleccionada, setCatSeleccionada] = useState('Todas');

  const categorias = ['Todas', 'Panadería', 'Lácteos', 'Frutas/Verduras', 'Aseo', 'Varios'];

  useEffect(() => {
    const q = query(collection(db, "productos"), orderBy("fecha", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(docs);
    });
    return () => unsubscribe();
  }, []);

  // FILTRO DOBLE: Por palabra y por categoría
  const productosFiltrados = productos.filter(p => {
    const coincideNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCat = catSeleccionada === 'Todas' || p.categoria === catSeleccionada;
    return coincideNombre && coincideCat;
  });

  const hacerPedido = (nombre: string, precio: number) => {
    const mensaje = `Hola! Vi en LocalMarket que tienes ${nombre} a $${precio}. ¿Me envías uno?`;
    window.open(`https://wa.me/573000000000?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-20 font-sans border-x-2 border-black max-w-md mx-auto">
      {/* Header Fijo */}
      <div className="bg-white p-4 shadow-md sticky top-0 z-10 border-b-4 border-black">
        <div className="flex items-center gap-4 mb-3">
          <Link href="/"><ArrowLeft className="text-black" size={28} /></Link>
          <h1 className="text-2xl font-black text-black tracking-tighter italic">LOCAL MARKET</h1>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3 text-black" size={20} />
          <input 
            type="text"
            placeholder="¿Qué necesitas hoy?"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black rounded-xl text-black font-bold placeholder:text-gray-500 outline-none"
          />
        </div>

        {/* Selector de Categorías Horizontal */}
        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCatSeleccionada(cat)}
              className={`px-4 py-1.5 rounded-full border-2 border-black whitespace-nowrap font-black text-xs uppercase transition-colors ${
                catSeleccionada === cat ? 'bg-black text-white' : 'bg-white text-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Lista con Diseño de Alto Contraste */}
      <div className="p-4 grid gap-4">
        {productosFiltrados.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-3xl shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] border-2 border-black flex justify-between items-center">
            <div className="flex-1">
              <span className="text-[10px] font-black text-orange-600 uppercase tracking-widest">{item.categoria}</span>
              <h3 className="font-black text-black text-xl uppercase leading-none mb-2 mt-1">{item.nombre}</h3>
              <p className="text-black font-black text-2xl">${item.precio}</p>
            </div>
            <button 
              onClick={() => hacerPedido(item.nombre, item.precio)}
              className="ml-4 bg-green-500 border-2 border-black text-white p-4 rounded-2xl shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
            >
              <MessageCircle size={28} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}