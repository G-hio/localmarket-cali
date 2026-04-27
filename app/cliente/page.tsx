"use client";
import React, { useEffect, useState } from 'react';
import { db } from '@/lib/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, increment, addDoc } from 'firebase/firestore';
import { ArrowLeft, MessageCircle, Search, Store, PackageX, HelpCircle, X, Send, User, Phone } from 'lucide-react';
import Link from 'next/link';
import toast from 'react-hot-toast';

export default function PaginaCliente() {
  const [productos, setProductos] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>(['Todas']);
  const [tiendasBloqueadas, setTiendasBloqueadas] = useState<string[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [catSeleccionada, setCatSeleccionada] = useState('Todas');
  const [loading, setLoading] = useState(true);

  // --- ESTADO PARA CENTRO DE AYUDA ---
  const [mostrarSoporte, setMostrarSoporte] = useState(false);
  const [ticketForm, setTicketForm] = useState({
    nombre: "",
    whatsapp: "",
    mensaje: ""
  });

  // Función de iconos corregida para evitar errores de indexación en TS
  const getIcono = (cat: string) => {
    const iconos: Record<string, string> = {
      'Panadería': '🥐', 'Lácteos': '🥛', 'Frutas/Verduras': '🍎', 
      'Aseo': '🧼', 'Restaurante': '🍲', 'Moda': '👕', 'Tecnología': '💻', 'Ofertas': '🔥'
    };
    return iconos[cat] || '📦';
  };

  useEffect(() => {
    const unsubCats = onSnapshot(doc(db, "configuracion", "categorias"), (docSnap) => {
      if (docSnap.exists()) {
        setCategorias(['Todas', ...docSnap.data().lista]);
      }
    });

    const unsubTiendas = onSnapshot(collection(db, "tiendas"), (snapshot) => {
      const bloqueadas = snapshot.docs
        .filter(d => d.data().bloqueada === true)
        .map(d => d.data().nombreNegocio);
      setTiendasBloqueadas(bloqueadas);
    });

    const q = query(collection(db, "productos"), orderBy("fecha", "desc"));
    const unsubProds = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setProductos(docs);
      setLoading(false);
    });

    return () => { unsubCats(); unsubTiendas(); unsubProds(); };
  }, []);

  const hacerPedido = async (producto: any) => {
    await updateDoc(doc(db, "productos", producto.id), {
      clics: increment(1)
    });
    const { nombre, precio, whatsapp, nombreTienda } = producto;
    const numeroDestino = whatsapp || "573000000000"; 
    const mensaje = `¡Hola ${nombreTienda}! Vi en LocalMarket Cali que tienes "${nombre}" a $${precio.toLocaleString()}. Me gustaría hacer un pedido.`;
    window.open(`https://wa.me/${numeroDestino}?text=${encodeURIComponent(mensaje)}`, '_blank');
  };

  const enviarAyuda = async () => {
    const { nombre, whatsapp, mensaje } = ticketForm;

    if (!mensaje.trim() || !whatsapp.trim() || !nombre.trim()) {
      toast.error("LLENA TODOS LOS CAMPOS");
      return;
    }

    try {
      await addDoc(collection(db, "tickets"), {
        remitente: nombre.toUpperCase(),
        whatsapp: whatsapp,
        mensaje: mensaje.toUpperCase(),
        rol: "cliente",
        estado: "pendiente",
        fecha: new Date().toLocaleString()
      });

      setTicketForm({ nombre: "", whatsapp: "", mensaje: "" });
      setMostrarSoporte(false);
      toast.success("REPORTE ENVIADO CON ÉXITO");
    } catch (e) {
      toast.error("ERROR AL ENVIAR");
    }
  };

  const productosFiltrados = productos.filter(p => {
    const coincideNombre = (p.nombre?.toLowerCase() || "").includes(busqueda.toLowerCase()) || 
                           (p.nombreTienda?.toLowerCase() || "").includes(busqueda.toLowerCase());
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
    <div className="min-h-screen bg-slate-50 pb-20 font-sans border-x-4 border-black max-w-md mx-auto shadow-2xl relative">
      
      {/* Header y Buscador */}
      <div className="bg-white p-5 sticky top-0 z-20 border-b-4 border-black">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/" className="hover:scale-110 transition-transform text-black">
            <ArrowLeft size={32} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-black tracking-tighter italic leading-none uppercase">LOCAL MARKET</h1>
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest mt-1 text-left">Vitrina Comunitaria Cali</p>
          </div>
        </div>
        
        <div className="relative mb-4">
          <Search className="absolute left-3 top-3.5 text-black" size={18} />
          <input 
            type="text"
            placeholder="BUSCAR PRODUCTO O TIENDA..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white border-2 border-black text-black font-black placeholder:text-gray-400 outline-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] uppercase"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
          {categorias.map(cat => (
            <button
              key={cat}
              onClick={() => setCatSeleccionada(cat)}
              className={`px-4 py-1.5 border-2 border-black whitespace-nowrap font-black text-[10px] uppercase shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] active:translate-y-0.5 active:shadow-none transition-all ${
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
          <div key={item.id} className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden ${item.agotado ? 'opacity-60 grayscale' : ''}`}>
            <div className={`h-24 border-b-2 border-black flex items-center justify-center text-5xl ${item.oferta ? 'bg-orange-100' : 'bg-orange-50'}`}>
              {item.oferta ? '🔥' : getIcono(item.categoria)}
            </div>
            <div className="absolute top-2 right-2 flex flex-col items-end gap-1">
               {item.oferta && <span className="bg-orange-600 text-white text-[9px] font-black px-2 py-0.5 border-2 border-black uppercase animate-pulse">¡OFERTA!</span>}
               <span className="bg-black text-white text-[9px] font-black px-3 py-1 border-2 border-black uppercase italic">{item.categoria}</span>
            </div>
            <div className="p-5">
              <div className="mb-4">
                <h3 className="font-black text-black text-2xl uppercase tracking-tighter leading-none mb-1 text-left">{item.nombre}</h3>
                <div className="flex items-center gap-1 text-gray-500 mb-3">
                  <Store size={14} className="text-orange-600" />
                  <p className="text-[10px] font-black uppercase truncate italic">{item.nombreTienda || "Vendedor Local"}</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <p className="text-black font-black text-3xl leading-none">${Number(item.precio).toLocaleString()}</p>
                  {item.clics > 0 && <span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">{item.clics} interesados</span>}
                </div>
              </div>
              <button 
                disabled={item.agotado} 
                onClick={() => hacerPedido(item)} 
                className={`w-full py-4 font-black uppercase flex items-center justify-center gap-3 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${item.agotado ? 'bg-gray-300 text-gray-600 cursor-not-allowed shadow-none' : 'bg-green-500 text-white hover:bg-black'}`}
              >
                {item.agotado ? <><PackageX size={24} /> Agotado</> : <><MessageCircle size={24} strokeWidth={3} /> Pedir por WhatsApp</>}
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* --- BOTÓN FLOTANTE: CENTRO DE AYUDA --- */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
        {mostrarSoporte && (
          <div className="bg-white border-4 border-black p-4 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] w-80 mb-4 animate-in fade-in slide-in-from-bottom-4">
            <div className="flex justify-between items-center mb-3 border-b-2 border-black pb-2 text-black">
              <h3 className="font-black uppercase italic text-[10px] flex items-center gap-2">
                <HelpCircle size={14} className="text-orange-600" /> Centro de Ayuda
              </h3>
              <button onClick={() => setMostrarSoporte(false)} className="hover:rotate-90 transition-transform">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-3">
              <div className="relative text-black">
                <User size={12} className="absolute left-2 top-2.5" />
                <input 
                  type="text"
                  placeholder="TU NOMBRE..."
                  value={ticketForm.nombre}
                  onChange={(e) => setTicketForm({...ticketForm, nombre: e.target.value})}
                  className="w-full pl-7 pr-2 py-2 border-2 border-black text-[9px] font-black outline-none bg-white uppercase"
                />
              </div>

              <div className="relative text-black">
                <Phone size={12} className="absolute left-2 top-2.5" />
                <input 
                  type="number"
                  placeholder="WHATSAPP (SIN EL 57)..."
                  value={ticketForm.whatsapp}
                  onChange={(e) => setTicketForm({...ticketForm, whatsapp: e.target.value})}
                  className="w-full pl-7 pr-2 py-2 border-2 border-black text-[9px] font-black outline-none bg-white"
                />
              </div>

              <textarea 
                value={ticketForm.mensaje}
                onChange={(e) => setTicketForm({...ticketForm, mensaje: e.target.value})}
                placeholder="¿EN QUÉ PODEMOS AYUDARTE?"
                className="w-full p-2 border-2 border-black text-[9px] font-black outline-none h-20 bg-orange-50 text-black placeholder:text-gray-400 uppercase"
              />

              <button 
                onClick={enviarAyuda}
                className="w-full bg-black text-white font-black text-xs py-3 border-2 border-black uppercase flex items-center justify-center gap-2 hover:bg-orange-600 transition-colors shadow-[2px_2px_0px_0px_rgba(255,165,0,1)]"
              >
                <Send size={14} /> Enviar Reporte
              </button>
            </div>
          </div>
        )}
        <button 
          onClick={() => setMostrarSoporte(!mostrarSoporte)}
          className={`p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] transition-all active:shadow-none active:translate-y-1 ${mostrarSoporte ? 'bg-black text-white' : 'bg-orange-500 text-white'}`}
        >
          {mostrarSoporte ? <X size={28} strokeWidth={3} /> : <HelpCircle size={28} strokeWidth={3} />}
        </button>
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