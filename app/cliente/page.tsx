"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, orderBy, addDoc, doc, updateDoc, increment } from "firebase/firestore";
import { 
  Store, MessageCircle, PackageX, HelpCircle, 
  X, Send, Search, Flame, ShoppingCart, Trash2, Plus, Minus, Home, ArrowLeft,
  Image as ImageIcon // Importamos el icono para cuando no hay imagen
} from "lucide-react";
import toast from 'react-hot-toast';

// 1. TIPADOS
interface Tienda {
  id: string;
  nombreNegocio: string;
  categoria: string;
  whatsapp?: string;
  imagen?: string;
}

interface Producto {
  id: string;
  nombre: string;
  precio: number;
  categoria: string;
  idTienda: string; 
  nombreTienda?: string;
  whatsapp?: string;
  clics: number;
  agotado: boolean;
  oferta?: boolean;
  imagen?: string; // Añadido soporte para URL de imagen
}

interface CartItem extends Producto {
  cantidad: number;
}

const CATEGORIAS_TIENDAS = ["TODO", "SUPERMERCADOS", "FRUVER", "CARNICERÍAS", "PANADERÍAS", "DROGUERÍAS"];

export default function ClientView() {
  const [tiendas, setTiendas] = useState<Tienda[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [busqueda, setBusqueda] = useState("");
  const [categoriaSel, setCategoriaSel] = useState("TODO");
  const [mostrarSoporte, setMostrarSoporte] = useState(false);
  const [ticketForm, setTicketForm] = useState({ nombre: "", whatsapp: "", mensaje: "" });
  
  const [tiendaSel, setTiendaSel] = useState<Tienda | null>(null);
  const [carrito, setCarrito] = useState<CartItem[]>([]);
  const [mostrarCarrito, setMostrarCarrito] = useState(false);
  
  const [metodoPago, setMetodoPago] = useState<string>("EFECTIVO");

  const formatoCOP = (valor: number) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(valor);
  };

  // Función fallback por si la imagen de la tienda o producto no existe
  const getIcono = (cat: string) => {
    const c = cat?.toUpperCase();
    if (c?.includes("CARNE")) return "🥩";
    if (c?.includes("FRUTA") || c?.includes("VERDURA")) return "🥦";
    if (c?.includes("LÁCTEO") || c?.includes("HUEVO")) return "🥚";
    if (c?.includes("BEBIDA")) return "🥤";
    if (c?.includes("ASEO")) return "🧼";
    return "📦";
  };

  useEffect(() => {
    const qTiendas = query(collection(db, "tiendas"), orderBy("nombreNegocio", "asc"));
    const unsubTiendas = onSnapshot(qTiendas, (snap) => {
      setTiendas(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tienda)));
    });

    const qProds = query(collection(db, "productos"), orderBy("nombre", "asc"));
    const unsubProds = onSnapshot(qProds, (snap) => {
      setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() } as Producto)));
    });

    return () => { unsubTiendas(); unsubProds(); };
  }, []);

  const datosMostrados = useMemo(() => {
    const term = busqueda.toLowerCase();
    if (!tiendaSel) {
      return tiendas.filter(t => 
        t.nombreNegocio?.toLowerCase().includes(term) && 
        (categoriaSel === "TODO" || t.categoria === categoriaSel)
      );
    } else {
      return productos.filter(p => 
        p.idTienda === tiendaSel.id &&
        p.nombre.toLowerCase().includes(term)
      );
    }
  }, [tiendas, productos, busqueda, categoriaSel, tiendaSel]);

  const agregarAlCarrito = (p: Producto) => {
    toast.success(`${p.nombre} añadido`);
    setCarrito(prev => {
      const existe = prev.find(item => item.id === p.id);
      if (existe) {
        return prev.map(item => item.id === p.id ? { ...item, cantidad: item.cantidad + 1 } : item);
      }
      return [...prev, { ...p, cantidad: 1 }];
    });
  };

  const vaciarCarrito = () => {
    if (window.confirm("¿VACIAR TODA LA CANASTA?")) {
      setCarrito([]);
      toast.error("Canasta vaciada");
    }
  };

  const actualizarCantidad = (id: string, delta: number) => {
    setCarrito(prev => prev.map(item => {
      if (item.id === id) {
        const nuevaCant = Math.max(1, item.cantidad + delta);
        return { ...item, cantidad: nuevaCant };
      }
      return item;
    }));
  };

  const eliminarDelCarrito = (id: string) => {
    setCarrito(prev => prev.filter(item => item.id !== id));
    toast.error("Eliminado");
  };

  const totalCarrito = carrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const enviarPedidoWhatsApp = async () => {
    if (carrito.length === 0) return;
    const loading = toast.loading("Preparando pedido...");
    try {
      for (const item of carrito) {
        const prodRef = doc(db, "productos", item.id);
        await updateDoc(prodRef, { clics: increment(1) });
      }
      
      const listaProd = carrito.map(item => `- ${item.cantidad}x ${item.nombre.toUpperCase()}`).join('%0A');
      const mensaje = `¡Hola! Te adjunto un nuevo pedido:%0A${listaProd}%0A%0A*MÉTODO DE PAGO:* ${metodoPago}%0A*TOTAL: ${formatoCOP(totalCarrito)}*`;
      const numDestino = tiendaSel?.whatsapp || carrito[0].whatsapp || "3000000000";
      
      toast.success("¡Listo!", { id: loading });
      window.open(`https://wa.me/57${numDestino}?text=${mensaje}`, '_blank');
    } catch (e) {
      toast.error("Error", { id: loading });
    }
  };

  const enviarAyuda = async () => {
    if (!ticketForm.nombre || !ticketForm.whatsapp || !ticketForm.mensaje) {
      toast.error("CAMPOS INCOMPLETOS");
      return;
    }
    try {
      await addDoc(collection(db, "tickets"), {
        ...ticketForm,
        rol: "cliente",
        estado: "pendiente",
        fecha: new Date().toLocaleString('es-CO'),
      });
      toast.success("ENVIADO");
      setTicketForm({ nombre: "", whatsapp: "", mensaje: "" });
      setMostrarSoporte(false);
    } catch (e) {
      toast.error("ERROR");
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] font-sans selection:bg-orange-500 selection:text-white">
      
      <header className="bg-white border-b-4 border-black p-6 sticky top-0 z-40 text-black">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-3">
            {tiendaSel ? (
              <button 
                onClick={() => { setTiendaSel(null); setBusqueda(""); }}
                className="p-2 border-4 border-black bg-white hover:bg-black hover:text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all"
              >
                <ArrowLeft size={24} strokeWidth={3} />
              </button>
            ) : (
              <button 
                onClick={() => window.location.href = '/'}
                className="p-2 border-4 border-black bg-orange-500 text-white shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:bg-black transition-all active:translate-y-1"
              >
                <Home size={24} strokeWidth={3} />
              </button>
            )}

            <div className="bg-black border-4 border-black p-2 shadow-[4px_4px_0px_0px_rgba(255,165,0,1)]">
              <Store size={32} color="white" strokeWidth={3} />
            </div>
            <div>
              <h1 className="font-black text-3xl uppercase italic tracking-tighter leading-none">
                {tiendaSel ? tiendaSel.nombreNegocio : <>Local<span className="text-orange-600">Market</span></>}
              </h1>
              <p className="text-[10px] font-black bg-black text-white px-2 py-0.5 mt-1 uppercase">
                {tiendaSel ? tiendaSel.categoria : "Cali Sur • Canasta Local"}
              </p>
            </div>
          </div>

          <div className="relative w-full md:w-96">
            <Search className="absolute left-4 top-3.5 text-black" size={20} />
            <input 
              type="text"
              placeholder={tiendaSel ? `BUSCAR EN ${tiendaSel.nombreNegocio.toUpperCase()}...` : "¿QUÉ TIENDA BUSCAS?..."}
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-white border-4 border-black p-3 pl-12 text-sm font-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] outline-none focus:translate-x-1 focus:translate-y-1 focus:shadow-none transition-all text-black"
            />
          </div>
        </div>
      </header>

      {!tiendaSel && (
        <div className="max-w-6xl mx-auto p-4 overflow-x-auto">
          <div className="flex gap-3 pb-2">
            {CATEGORIAS_TIENDAS.map((cat) => (
              <button 
                key={cat}
                onClick={() => setCategoriaSel(cat)}
                className={`px-6 py-3 border-4 border-black font-black uppercase text-[10px] whitespace-nowrap transition-all shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:shadow-none active:translate-y-1 ${categoriaSel === cat ? 'bg-black text-white' : 'bg-white text-black hover:bg-orange-50'}`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      )}

      <main className="max-w-6xl mx-auto p-4">
        {!tiendaSel ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {datosMostrados.map((tienda: any) => (
              <div 
                key={tienda.id} 
                onClick={() => { setTiendaSel(tienda); setBusqueda(""); }}
                className="bg-white border-4 border-black p-6 cursor-pointer hover:-translate-y-2 hover:shadow-[10px_10px_0px_0px_rgba(255,165,0,1)] transition-all shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] flex flex-col items-center text-center"
              >
                <div className="h-24 w-24 bg-orange-100 rounded-full border-4 border-black flex items-center justify-center text-4xl mb-4 overflow-hidden">
                  {tienda.imagen ? (
                    <img src={tienda.imagen} alt={tienda.nombreNegocio} className="w-full h-full object-cover" />
                  ) : "🏪"}
                </div>
                <h3 className="font-black text-xl text-black uppercase leading-none mb-2">{tienda.nombreNegocio}</h3>
                <span className="text-[10px] font-black bg-black text-white px-2 py-1 uppercase">{tienda.categoria}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {datosMostrados.map((item: any) => (
              <div key={item.id} className={`bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] ${item.agotado ? 'opacity-60 grayscale' : ''}`}>
                
                {/* ETIQUETA DE OFERTA */}
                {item.oferta && (
                  <div className="absolute top-4 right-4 z-10 bg-yellow-400 border-2 border-black font-black px-3 py-1 text-[10px] uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center gap-1">
                    <Flame size={14} /> Oferta
                  </div>
                )}

                {/* IMAGEN DEL PRODUCTO CON SOPORTE PARA URL REAL */}
                <div className={`h-48 border-b-4 border-black flex items-center justify-center bg-slate-50 overflow-hidden`}>
                  {item.imagen ? (
                    <img src={item.imagen} alt={item.nombre} className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center opacity-20">
                      <span className="text-6xl">{getIcono(item.categoria)}</span>
                      <p className="font-black text-[8px] uppercase mt-2">Sin foto real</p>
                    </div>
                  )}
                </div>

                <div className="p-6 flex flex-col flex-grow text-black">
                  <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">{item.categoria}</p>
                  <h3 className="font-black text-2xl uppercase tracking-tighter leading-none mb-2">{item.nombre}</h3>
                  <p className="font-black text-4xl mb-6">{formatoCOP(item.precio)}</p>
                  
                  <button 
                    disabled={item.agotado} 
                    onClick={() => agregarAlCarrito(item)} 
                    className={`w-full py-3 font-black uppercase border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 active:shadow-none transition-all ${item.agotado ? 'bg-slate-300 cursor-not-allowed' : 'bg-orange-500 text-white hover:bg-black'}`}
                  >
                    {item.agotado ? 'Agotado' : 'Añadir a la Canasta'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* CARRITO Y SOPORTE (SE MANTIENE IGUAL) */}
      {mostrarCarrito && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setMostrarCarrito(false)} />
          <div className="relative w-full max-w-md bg-white border-l-8 border-black h-full flex flex-col shadow-[-10px_0px_0px_0px_rgba(0,0,0,1)] text-black">
            <div className="p-6 border-b-4 border-black flex justify-between items-center bg-orange-500 text-white">
              <div className="flex items-center gap-4">
                <h2 className="font-black text-2xl uppercase italic">Tu Canasta</h2>
                {carrito.length > 0 && (
                  <button onClick={vaciarCarrito} className="p-2 bg-black border-2 border-white hover:bg-red-600 transition-all shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">
                    <Trash2 size={18} />
                  </button>
                )}
              </div>
              <button onClick={() => setMostrarCarrito(false)} className="bg-black p-2 border-2 border-white shadow-[3px_3px_0px_0px_rgba(255,255,255,1)]">
                <X size={24} />
              </button>
            </div>
            
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
              {carrito.length === 0 ? (
                <div className="text-center py-20 opacity-20 uppercase font-black">
                  <PackageX size={64} className="mx-auto mb-4" />
                  <p>Canasta Vacía</p>
                </div>
              ) : (
                carrito.map(item => (
                  <div key={item.id} className="border-4 border-black p-3 flex gap-4 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
                    {/* Miniatura en el carrito */}
                    <div className="w-16 h-16 border-2 border-black flex-shrink-0 bg-slate-50 overflow-hidden flex items-center justify-center">
                      {item.imagen ? <img src={item.imagen} className="w-full h-full object-cover" /> : <span className="text-2xl">{getIcono(item.categoria)}</span>}
                    </div>
                    <div className="flex-grow">
                      <h4 className="font-black uppercase text-sm truncate">{item.nombre}</h4>
                      <p className="font-black text-orange-600">{formatoCOP(item.precio * item.cantidad)}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <div className="flex border-2 border-black font-black">
                          <button onClick={() => actualizarCantidad(item.id, -1)} className="px-2 bg-slate-100 border-r-2 border-black hover:bg-black hover:text-white">-</button>
                          <span className="px-3 py-1 bg-white">{item.cantidad}</span>
                          <button onClick={() => actualizarCantidad(item.id, 1)} className="px-2 bg-slate-100 border-l-2 border-black hover:bg-black hover:text-white">+</button>
                        </div>
                        <button onClick={() => eliminarDelCarrito(item.id)} className="text-red-500 hover:scale-110 transition-all"><Trash2 size={18}/></button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {carrito.length > 0 && (
              <div className="p-6 border-t-8 border-black bg-white">
                <div className="mb-6 p-4 border-4 border-black bg-slate-50">
                  <p className="font-black text-[10px] uppercase mb-3 flex items-center gap-2">
                    <span className="bg-orange-500 text-white p-1">💰</span> ¿Cómo vas a pagar?
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    <button onClick={() => setMetodoPago("EFECTIVO")} className={`p-3 border-4 border-black font-black text-[10px] uppercase transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${metodoPago === "EFECTIVO" ? 'bg-black text-white' : 'bg-white'}`}>💵 Efectivo</button>
                    <button onClick={() => setMetodoPago("NEQUI")} className={`p-3 border-4 border-black font-black text-[10px] uppercase transition-all shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] ${metodoPago === "NEQUI" ? 'bg-[#73318F] text-white' : 'bg-white'}`}>📱 Nequi</button>
                  </div>
                </div>
                <div className="flex justify-between items-end mb-6">
                  <span className="font-black uppercase text-xs">Total:</span>
                  <span className="font-black text-3xl italic">{formatoCOP(totalCarrito)}</span>
                </div>
                <button onClick={enviarPedidoWhatsApp} className="w-full bg-[#25D366] border-4 border-black p-4 font-black uppercase flex items-center justify-center gap-3 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all">
                  <Send size={24} /> Confirmar Pedido
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* BOTONES FLOTANTES (SOPORTE Y CARRITO) */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-4">
        <button onClick={() => setMostrarCarrito(true)} className="relative p-5 bg-orange-500 text-white border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all hover:bg-black">
          <ShoppingCart size={32} strokeWidth={4} />
          {carrito.length > 0 && <span className="absolute -top-2 -right-2 bg-black text-white border-2 border-white px-2 py-1 flex items-center justify-center font-black text-xs shadow-[2px_2px_0px_0px_rgba(255,255,255,1)]">{carrito.length}</span>}
        </button>
        <button onClick={() => setMostrarSoporte(!mostrarSoporte)} className={`p-5 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] transition-all ${mostrarSoporte ? 'bg-black text-white' : 'bg-white text-black'}`}>
          {mostrarSoporte ? <X size={32} strokeWidth={4} /> : <HelpCircle size={32} strokeWidth={4} />}
        </button>
      </div>
      
      {/* MODAL SOPORTE */}
      {mostrarSoporte && (
        <div className="fixed bottom-24 right-6 z-50 bg-white border-4 border-black p-6 shadow-[10px_10px_0px_0px_rgba(0,0,0,1)] w-80">
          <div className="flex justify-between items-center mb-4 border-b-4 border-black pb-3 text-black">
            <h3 className="font-black uppercase italic text-xs flex items-center gap-2"><HelpCircle size={18} className="text-orange-600" /> Soporte Local</h3>
          </div>
          <div className="space-y-4">
            <input type="text" placeholder="TU NOMBRE..." value={ticketForm.nombre} onChange={(e) => setTicketForm({...ticketForm, nombre: e.target.value})} className="w-full px-3 py-3 border-2 border-black text-[10px] font-black outline-none bg-white uppercase text-black" />
            <input type="number" placeholder="WHATSAPP..." value={ticketForm.whatsapp} onChange={(e) => setTicketForm({...ticketForm, whatsapp: e.target.value})} className="w-full px-3 py-3 border-2 border-black text-[10px] font-black outline-none bg-white text-black" />
            <textarea value={ticketForm.mensaje} onChange={(e) => setTicketForm({...ticketForm, mensaje: e.target.value})} placeholder="¿EN QUÉ PODEMOS AYUDARTE?" className="w-full p-3 border-2 border-black text-[10px] font-black outline-none h-24 bg-orange-50 text-black uppercase resize-none" />
            <button onClick={enviarAyuda} className="w-full bg-orange-500 text-white font-black text-[10px] py-4 border-2 border-black uppercase shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black flex items-center justify-center gap-2">
              <Send size={16} /> Enviar Reporte
            </button>
          </div>
        </div>
      )}

      <footer className="p-12 text-center border-t-4 border-black bg-white mt-10">
        <p className="text-[10px] font-black text-black uppercase tracking-[0.3em]">
          LOCALMARKET CALI • PROYECTO UNICUCES <br/>
          &copy; {new Date().getFullYear()} - INGENIERÍA DE SISTEMAS
        </p>
      </footer>
    </div>
  );
}