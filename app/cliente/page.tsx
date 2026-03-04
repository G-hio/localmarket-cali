'use client';
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment } from 'firebase/firestore';
import { ArrowLeft, MessageCircle, Search, Store, Tag, Flame, PackageX } from 'lucide-react';
import Link from 'next/link';

export default function PaginaCliente() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Todas']);
  const [tiendasBloqueadas, setTiendasBloqueadas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [catSeleccionada, setCatSeleccionada] = useState('Todas');
  const [loading, setLoading] = useState(true);

  // Iconos rápidos para las categorías dinámicas
  const getIcono = (cat: string) => {
    const iconos: { [key: string]: string } = {
      'Panadería': '🥐', 'Lácteos': '🥛', 'Frutas/Verduras': '🍎', 
      'Aseo': '🧼', 'Restaurante': '🍲', 'Moda': '👕', 'Tecnología': '💻', 'Ofertas': '🔥'
    };
    return iconos[cat] || '📦';
  };

  useEffect(() => {
    // 1. Escuchar Categorías Dinámicas desde el Admin
    const unsubCats = onSnapshot(doc(db, "configuracion", "categorias"), (docSnap) => {
      if (docSnap.exists()) {
        setCategorias(['Todas', ...docSnap.data().lista]);
      }
    });

    // 2. Escuchar Tiendas para filtrar las bloqueadas
    const unsubTiendas = onSnapshot(collection(db, "tiendas"), (snapshot) => {
      const bloqueadas = snapshot.docs
        .filter(d => d.data().bloqueada === true)
        .map(d => d.data().nombreNegocio);
      setTiendasBloqueadas(bloqueadas);
    });

    // 3. Escuchar Productos
    const q = query(collection(db, "productos"), orderBy("fecha", "desc"));
    const unsubProds = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(docs);
      setLoading(false);
    });

    return () => { unsubCats(); unsubTiendas(); unsubProds(); };
  }, []);

  const hacerPedido = async (producto: any) => {
    // Registrar el clic en la base de datos para el Admin/Tendero
    await updateDoc(doc(db, "productos", producto.id), {
      clics: increment(1)
    });

    const { nombre, precio, whatsapp, nombreTienda } = producto;
    const numeroDestino = whatsapp || "573000000000"; 
    const mensaje = `¡Hola ${nombreTienda}! Vi en LocalMarket Cali que tienes "${nombre}" a $${precio.toLocaleString()}. Me gustaría hacer un pedido.`;
    window.open(`https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const productosFiltrados = productos.filter(p => {
    const coincideNombre = p.nombre.toLowerCase().includes(busqueda.toLowerCase()) || 
                           p.nombreTienda?.toLowerCase().includes(busqueda.toLowerCase());
    const coincideCat = catSeleccionada === 'Todas' || p.categoria === catSeleccionada;
    const noBloqueado = !tiendasBloqueadas.includes(p.nombreTienda);
    
    return coincideNombre && coincideCat && noBloqueado;
  });

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white font-black uppercase italic">
      Cargando Vitrina de Cali...
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 pb-20 font-sans border-x-4 border-black max-w-md mx-auto shadow-2xl">
      
      {/* Header Estilo Brutalista */}
      <div className="bg-white p-5 sticky top-0 z-20 border-b-4 border-black">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/" className="hover:scale-110 transition-transform">
            <ArrowLeft className="text-black" size={32} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tighter italic leading-none uppercase">LOCAL MARKET</h1>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1">Vitrina Comunitaria Cali</p>
          </div>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3.5 text-black" size={18} />
          <input 
            type="text"
            placeholder="Buscar producto o tienda..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black rounded-none text-black font-black placeholder:text-gray-400 outline-none focus:bg-yellow-50 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar scroll-smooth">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCatSeleccionada(cat)}
              className={`px-4 py-1.5 border-2 border-black whitespace-nowrap font-black text-[10px] uppercase transition-all shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none ${
                catSeleccionada === cat ? 'bg-orange-500 text-white' : 'bg-white text-black'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Listado de Productos */}
      <div className="p-4 grid gap-6">
        {productosFiltrados.map((item) => (
          <div 
            key={item.id} 
            className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden transition-all ${item.agotado ? 'opacity-60 grayscale' : ''}`}
          >
            
            {/* Visual de Categoría / Oferta */}
            <div className={`h-24 border-b-2 border-black flex items-center justify-center text-5xl ${item.oferta ? 'bg-orange-100' : 'bg-orange-50'}`}>
              {item.oferta ? '🔥' : getIcono(item.categoria)}
            </div>

            {/* TAGS SUPERIORES */}
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
               {item.oferta && (
                 <span className="bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 border-2 border-black uppercase animate-pulse">
                   ¡OFERTA!
                 </span>
               )}
               <span className="bg-black text-white text-[9px] font-black px-3 py-1 border-2 border-black uppercase italic">
                 {item.categoria}
               </span>
            </div>

            <div className="p-5">
              <div className="mb-4">
                <h3 className="font-black text-black text-2xl uppercase tracking-tighter leading-none mb-1">
                  {item.nombre}
                </h3>
                
                <div className="flex items-center gap-1 text-gray-500 mb-3">
                  <Store size={14} className="text-orange-600" />
                  <p className="text-[10px] font-black uppercase truncate italic">
                    {item.nombreTienda || "Vendedor Local"}
                  </p>
                </div>

                <div className="flex items-baseline gap-2">
                  <p className="text-black font-black text-3xl leading-none">
                    ${Number(item.precio).toLocaleString()}
                  </p>
                  {item.clics > 0 && (
                    <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">
                      {item.clics} interesados
                    </span>
                  )}
                </div>
              </div>

              <button 
                disabled={item.agotado}
                onClick={() => hacerPedido(item)}
                className={`w-full py-4 font-black uppercase flex items-center justify-center gap-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-colors active:translate-y-1 active:shadow-none ${
                  item.agotado 
                    ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none translate-y-1' 
                    : 'bg-green-500 text-white hover:bg-black'
                }`}
              >
                {item.agotado ? (
                  <><PackageX size={24} /> Agotado</>
                ) : (
                  <><MessageCircle size={24} strokeWidth={3} /> Pedir por WhatsApp</>
                )}
              </button>
            </div>
          </div>
        ))}

        {productosFiltrados.length === 0 && (
          <div className="text-center py-20 bg-white border-4 border-dashed border-gray-300">
            <p className="font-black uppercase text-gray-400 italic">No encontramos productos...</p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-8 text-center">
        <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em]">
          Apoyando el comercio de Cali Sur <br/> LocalMarket {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}