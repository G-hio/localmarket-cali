"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, doc, updateDoc, increment, query, where, getDocs } from "firebase/firestore";
import { ShoppingBag, MessageCircle, Search, Flame, Store, Tag, Info } from "lucide-react";

export default function VitrinaCliente() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [tiendasBloqueadas, setTiendasBloqueadas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroCat, setFiltroCat] = useState("TODOS");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Escuchar Categorías Dinámicas
    const unsubCats = onSnapshot(doc(db, "configuracion", "categorias"), (doc) => {
      if (doc.exists()) setCategorias(doc.data().lista);
    });

    // 2. Identificar Tiendas Bloqueadas para no mostrarlas
    const unsubTiendas = onSnapshot(collection(db, "tiendas"), (snapshot) => {
      const bloqueadas = snapshot.docs
        .filter(d => d.data().bloqueada === true)
        .map(d => d.data().nombreNegocio);
      setTiendasBloqueadas(bloqueadas);
    });

    // 3. Escuchar Productos en tiempo real
    const unsubProds = onSnapshot(collection(db, "productos"), (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(docs);
      setLoading(false);
    });

    return () => { unsubCats(); unsubTiendas(); unsubProds(); };
  }, []);

  const registrarClic = async (id: string, whatsapp: string, nombreProd: string) => {
    // Incrementa el contador de clics en Firebase
    await updateDoc(doc(db, "productos", id), {
      clics: increment(1)
    });
    
    // Abrir WhatsApp
    const mensaje = `Hola! Vi el producto "${nombreProd}" en LocalMarket Cali y me interesa.`;
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const prodsVisibles = productos.filter(p => {
    const coincideBusqueda = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                             p.nombreTienda.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCat = filtroCat === "TODOS" || p.categoria === filtroCat;
    const noEstaBloqueada = !tiendasBloqueadas.includes(p.nombreTienda);
    
    return coincideBusqueda && coincideCat && noEstaBloqueada;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-16 h-16 border-8 border-black border-t-orange-500 rounded-full animate-spin mb-4"></div>
        <p className="font-black uppercase tracking-widest italic">Abriendo la Vitrina...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-white font-sans text-black pb-20">
      
      {/* HEADER TIPO REVISTA */}
      <header className="p-6 border-b-4 border-black sticky top-0 bg-white z-50">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div>
            <h1 className="text-5xl font-black uppercase italic tracking-tighter leading-none">
              LOCAL MARKET <span className="text-orange-600">CALI</span>
            </h1>
            <p className="font-bold text-[10px] uppercase tracking-[0.3em] mt-1">Directo del barrio a tu casa</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="¿QUÉ BUSCAS HOY?"
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border-4 border-black font-black uppercase text-xs outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all"
            />
          </div>
        </div>
      </header>

      {/* BARRA DE CATEGORÍAS */}
      <div className="bg-black p-3 overflow-x-auto whitespace-nowrap scrollbar-hide">
        <div className="max-w-6xl mx-auto flex gap-4 px-4">
          <button 
            onClick={() => setFiltroCat("TODOS")}
            className={`px-4 py-1 font-black text-[10px] uppercase border-2 ${filtroCat === 'TODOS' ? 'bg-orange-500 border-white text-white' : 'bg-transparent border-gray-700 text-gray-400'}`}
          >
            TODO EL BARRIO
          </button>
          {categorias.map(cat => (
            <button 
              key={cat}
              onClick={() => setFiltroCat(cat)}
              className={`px-4 py-1 font-black text-[10px] uppercase border-2 ${filtroCat === cat ? 'bg-orange-500 border-white text-white' : 'bg-transparent border-gray-700 text-gray-400'}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* GRILLA DE PRODUCTOS */}
      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {prodsVisibles.map((prod) => (
          <div 
            key={prod.id} 
            className={`relative group bg-white border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] transition-all ${prod.agotado ? 'opacity-60 grayscale' : 'hover:-translate-y-2'}`}
          >
            {/* TAG DE OFERTA */}
            {prod.oferta && (
              <div className="absolute -top-4 -right-2 bg-orange-600 text-white font-black px-3 py-1 border-2 border-black rotate-12 flex items-center gap-1 text-xs">
                <Flame size={14} fill="white" /> OFERTA
              </div>
            )}

            {/* INFO TIENDA */}
            <div className="flex items-center gap-2 mb-3">
              <div className="bg-black text-white p-1"><Store size={14}/></div>
              <span className="text-[10px] font-black uppercase tracking-widest truncate">{prod.nombreTienda}</span>
            </div>

            {/* NOMBRE Y PRECIO */}
            <h2 className="text-2xl font-black uppercase italic leading-tight mb-1">{prod.nombre}</h2>
            <div className="flex items-baseline gap-2 mb-4">
              <p className="text-3xl font-black text-black">${Number(prod.precio).toLocaleString()}</p>
              <span className="text-[10px] font-bold text-gray-400 uppercase italic">/ Unidad</span>
            </div>

            {/* BOTÓN WHATSAPP */}
            <button 
              disabled={prod.agotado}
              onClick={() => registrarClic(prod.id, prod.whatsapp, prod.nombre)}
              className={`w-full py-4 border-2 border-black font-black uppercase text-sm flex items-center justify-center gap-3 transition-all ${prod.agotado ? 'bg-gray-200 cursor-not-allowed' : 'bg-green-400 hover:bg-black hover:text-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none'}`}
            >
              {prod.agotado ? (
                <> <PackageX size={20}/> AGOTADO </>
              ) : (
                <> <MessageCircle size={20}/> PEDIR POR WHATSAPP </>
              )}
            </button>
            
            <div className="mt-4 flex justify-between items-center opacity-40">
              <span className="text-[9px] font-black uppercase"><Tag size={10} className="inline mr-1"/> {prod.categoria}</span>
              {prod.clics > 0 && <span className="text-[9px] font-black">{prod.clics} INTERESADOS</span>}
            </div>
          </div>
        ))}
      </main>

      {/* MENSAJE SI NO HAY NADA */}
      {prodsVisibles.length === 0 && (
        <div className="py-20 text-center">
          <Info size={48} className="mx-auto mb-4 text-gray-300" />
          <p className="font-black uppercase italic text-gray-400">No encontramos productos en esta categoría por ahora.</p>
        </div>
      )}

      {/* BARRA INFERIOR / FOOTER */}
      <footer className="fixed bottom-0 left-0 right-0 bg-white border-t-4 border-black p-4 text-center z-50">
        <p className="text-[10px] font-black uppercase italic">LocalMarket Cali v2.0 - Apoyando la economía del barrio</p>
      </footer>
    </div>
  );
}

// Icono extra que faltaba
function PackageX({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8V21H3V8" /><path d="M1 3H23V8H1V3Z" /><path d="M10 12L14 16" /><path d="M14 12L10 16" />
    </svg>
  );
}