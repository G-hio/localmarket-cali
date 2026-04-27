"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc, deleteDoc, query, orderBy, addDoc } from "firebase/firestore"; // Añadí addDoc
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { 
  Trash2, LogOut, Store, Plus, 
  Printer, Loader2, Search, Ban, CheckCircle, 
  ShieldCheck, LayoutGrid as LayoutGridIcon, MessageSquare, 
  Send, Users, Key, PackagePlus, Save // Añadí Save
} from "lucide-react";

// --- INTERFACES ---
interface Ticket {
  id: string;
  remitente: string;
  whatsapp: string;
  rol: "tendero" | "cliente";
  mensaje: string;
  estado: "pendiente" | "resuelto";
  respuestaAdmin?: string;
  fecha: string;
}

interface Usuario {
  id: string;
  nombre: string;
  email: string;
  rol: "tendero" | "cliente" | "admin";
  whatsapp?: string;
}

export default function AdminPanel() {
  // --- ESTADOS ORIGINALES ---
  const [productos, setProductos] = useState<any[]>([]);
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]); 
  const [tickets, setTickets] = useState<Ticket[]>([]); 
  const [filtroSoporte, setFiltroSoporte] = useState<"tendero" | "cliente">("tendero");
  const [activeTab, setActiveTab] = useState<"inventario" | "usuarios">("inventario"); 
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  // --- NUEVOS ESTADOS PARA EL MODAL (SIN BORRAR NADA) ---
  const [showModal, setShowModal] = useState(false);
  const [subiendoProducto, setSubiendoProducto] = useState(false);
  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    precio: "",
    categoria: "",
    idTienda: "",
  });

  const ADMIN_EMAIL = "admin@localmarket.com";

  // --- TU LÓGICA DE FILTRADO Y MÉTRICAS (MANTENIDA) ---
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => 
      (p.nombre?.toLowerCase() || "").includes(busqueda.toLowerCase()) || 
      (p.nombreTienda?.toLowerCase() || "").includes(busqueda.toLowerCase()) ||
      (p.categoria?.toLowerCase() || "").includes(busqueda.toLowerCase())
    );
  }, [productos, busqueda]);

  const usuariosFiltrados = useMemo(() => {
    return usuarios.filter(u => 
      (u.nombre?.toLowerCase() || "").includes(busqueda.toLowerCase()) || 
      (u.email?.toLowerCase() || "").includes(busqueda.toLowerCase())
    );
  }, [usuarios, busqueda]);

  const statsDinamicas = useMemo(() => {
    const sumaPrecios = productosFiltrados.reduce((acc, curr) => acc + (Number(curr.precio) || 0), 0);
    const clics = productosFiltrados.reduce((acc, curr) => acc + (Number(curr.clics) || 0), 0);
    return {
      totalProductos: productosFiltrados.length,
      totalTiendas: new Set(productosFiltrados.map(p => p.nombreTienda)).size,
      valorInventario: sumaPrecios,
      totalClics: clics
    };
  }, [productosFiltrados]);

  // --- USE EFFECT COMPLETO (MANTENIDO) ---
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace("/admin-login"); 
        return;
      }

      const unsubCats = onSnapshot(doc(db, "configuracion", "categorias"), (docSnap) => {
        if (docSnap.exists()) setCategorias(docSnap.data().lista || []);
      });

      const unsubTiendas = onSnapshot(collection(db, "tiendas"), (snap) => {
        setTiendas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      });

      const unsubProds = onSnapshot(collection(db, "productos"), (snap) => {
        setProductos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });
      
      const unsubTickets = onSnapshot(query(collection(db, "tickets"), orderBy("fecha", "desc")), (snap) => {
        setTickets(snap.docs.map(d => ({ id: d.id, ...d.data() } as Ticket)));
      });

      const unsubUsers = onSnapshot(collection(db, "usuarios"), (snap) => {
        setUsuarios(snap.docs.map(d => ({ id: d.id, ...d.data() } as Usuario)));
      });

      return () => { 
        unsubCats(); unsubTiendas(); unsubProds(); unsubTickets(); unsubUsers();
      };
    });

    return () => unsubscribeAuth();
  }, [router]);

  // --- FUNCIONES DE ACCIÓN (MANTENIDAS) ---
  const responderTicket = async (ticket: Ticket) => {
    const mensajeAdmin = `Hola ${ticket.remitente}, soporte LocalMarket: "${ticket.mensaje}".`;
    const urlWhatsApp = `https://wa.me/57${ticket.whatsapp}?text=${encodeURIComponent(mensajeAdmin)}`;
    try {
      await updateDoc(doc(db, "tickets", ticket.id), { estado: "resuelto", respuestaAdmin: "WA_SENT" });
      window.open(urlWhatsApp, '_blank');
      toast.success("CHAT INICIADO");
    } catch (e) { toast.error("ERROR AL RESPONDER"); }
  };

  const eliminarProducto = async (id: string, nombre: string) => {
    if (confirm(`¿ELIMINAR "${nombre.toUpperCase()}"?`)) {
      await deleteDoc(doc(db, "productos", id));
      toast.success("PRODUCTO ELIMINADO");
    }
  };

  const eliminarUsuario = async (id: string, nombre: string) => {
    if (confirm(`¿BORRAR ACCESO DE ${nombre.toUpperCase()}?`)) {
      await deleteDoc(doc(db, "usuarios", id));
      toast.success("USUARIO ELIMINADO");
    }
  };

  const toggleBloqueoTienda = async (tiendaId: string, estadoActual: boolean) => {
    if (confirm(estadoActual ? "¿Desbloquear tienda?" : "¿BLOQUEAR TIENDA?")) {
      await updateDoc(doc(db, "tiendas", tiendaId), { bloqueada: !estadoActual });
      toast.success(estadoActual ? "ACTIVA" : "BLOQUEADA");
    }
  };

  // --- NUEVA FUNCIÓN PARA EL MODAL ---
  const guardarProductoModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.idTienda || !nuevoProducto.nombre || !nuevoProducto.precio) {
      toast.error("FALTAN DATOS");
      return;
    }
    setSubiendoProducto(true);
    try {
      const tienda = tiendas.find(t => t.id === nuevoProducto.idTienda);
      await addDoc(collection(db, "productos"), {
        ...nuevoProducto,
        nombre: nuevoProducto.nombre.toUpperCase(),
        precio: Number(nuevoProducto.precio),
        nombreTienda: tienda?.nombreNegocio || "Tienda Desconocida",
        clics: 0,
        imagen: "https://via.placeholder.com/150",
        fechaCreacion: new Date().toISOString()
      });
      toast.success("PRODUCTO AGREGADO");
      setShowModal(false);
      setNuevoProducto({ nombre: "", precio: "", categoria: "", idTienda: "" });
    } catch (error) {
      toast.error("ERROR AL GUARDAR");
    } finally {
      setSubiendoProducto(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-blue-600 font-bold">
      <Loader2 className="animate-spin mb-4" size={40} />
      <p className="uppercase tracking-widest text-[10px]">Sincronizando Consola Maestra...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800 font-sans p-4 md:p-8">
      
      {/* HEADER COMPLETO */}
      <header className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
            <LayoutGridIcon size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight leading-none text-slate-900">
              Admin<span className="text-blue-600">Console</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">LocalMarket Cali | Control Central</p>
          </div>
        </div>

        {/* SELECTOR DE TABS */}
        <div className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200">
          <button 
            onClick={() => setActiveTab("inventario")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'inventario' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Store size={14}/> Inventario
          </button>
          <button 
            onClick={() => setActiveTab("usuarios")}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${activeTab === 'usuarios' ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
          >
            <Users size={14}/> Usuarios
          </button>
        </div>

        <div className="flex gap-3">
          <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center gap-2">
            <Printer size={16}/> Reporte PDF
          </button>
          <button onClick={() => { auth.signOut(); router.push("/"); }} className="bg-white border-2 border-slate-200 hover:text-red-500 px-5 py-2.5 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center gap-2">
            <LogOut size={16}/> Salir
          </button>
        </div>
      </header>

      {/* MÉTRICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatBox label="Total Productos" val={statsDinamicas.totalProductos} color="text-blue-600" />
        <StatBox label="Tiendas Registradas" val={statsDinamicas.totalTiendas} color="text-indigo-600" />
        <StatBox label="Interacciones" val={statsDinamicas.totalClics} color="text-cyan-600" />
        <StatBox label="Valor Total" val={`$${statsDinamicas.valorInventario.toLocaleString()}`} color="text-emerald-600" />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* COLUMNA IZQUIERDA: TICKETS */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-black uppercase text-blue-600 mb-4 flex items-center gap-2 text-sm italic border-b border-slate-50 pb-3">
              <MessageSquare size={18}/> Centro de Tickets
            </h2>
            <div className="flex gap-2 mb-4 bg-slate-100 p-1 rounded-xl">
              {["tendero", "cliente"].map((r) => (
                <button 
                  key={r}
                  onClick={() => setFiltroSoporte(r as any)}
                  className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-lg transition-all ${filtroSoporte === r ? 'bg-white shadow-sm text-blue-600' : 'text-slate-400'}`}
                >
                  {r}s
                </button>
              ))}
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {tickets.filter(t => t.rol === filtroSoporte).map(t => (
                <div key={t.id} className={`p-4 rounded-2xl border transition-all ${t.estado === 'resuelto' ? 'bg-slate-50 opacity-50' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <p className="text-[11px] font-black uppercase text-slate-800">{t.remitente}</p>
                  <p className="text-xs text-slate-600 leading-snug my-2 italic">"{t.mensaje}"</p>
                  {t.estado === 'pendiente' ? (
                    <button onClick={() => responderTicket(t)} className="w-full bg-blue-600 text-white text-[10px] py-3 rounded-xl uppercase font-black flex items-center justify-center gap-2 transition-all">
                      <Send size={14} /> Atender WA
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-500 uppercase"><CheckCircle size={12}/> Gestionado</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* LISTA DE TIENDAS */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-black uppercase text-blue-600 mb-4 flex items-center gap-2 text-sm italic border-b border-slate-50 pb-3">
              <Store size={18}/> Status de Tiendas
            </h2>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
              {tiendas.map(t => (
                <div key={t.id} className="flex gap-2">
                  <button onClick={() => setBusqueda(t.nombreNegocio)} className={`flex-1 text-left px-4 py-2.5 text-[10px] font-bold rounded-xl uppercase transition-all ${busqueda === t.nombreNegocio ? 'bg-blue-600 text-white' : 'hover:bg-slate-50'}`}>{t.nombreNegocio}</button>
                  <button onClick={() => toggleBloqueoTienda(t.id, !!t.bloqueada)} className={`px-3 rounded-xl border transition-all ${t.bloqueada ? 'bg-red-50 border-red-200 text-red-500' : 'bg-emerald-50 border-emerald-200 text-emerald-500'}`}>
                    {t.bloqueada ? <Ban size={14}/> : <ShieldCheck size={14}/>}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* COLUMNA DERECHA: TABLA DINÁMICA */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            <div className="p-6 border-b border-slate-50 flex justify-between items-center gap-4">
              <div className="relative flex-1">
                <Search size={18} className="absolute left-4 top-3 text-slate-400" />
                <input 
                  value={busqueda} 
                  onChange={(e) => setBusqueda(e.target.value)} 
                  placeholder={activeTab === 'inventario' ? "BUSCAR PRODUCTO..." : "BUSCAR USUARIO..."} 
                  className="w-full pl-12 pr-4 py-3 bg-slate-50 rounded-2xl text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-100 transition-all" 
                />
              </div>
              {activeTab === 'inventario' && (
                <button 
                  onClick={() => setShowModal(true)} // CAMBIADO PARA ABRIR MODAL
                  className="bg-blue-600 text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-blue-100 hover:scale-105 transition-all"
                >
                  <PackagePlus size={16} /> Global Add
                </button>
              )}
            </div>
            
            <div className="overflow-x-auto">
              {activeTab === 'inventario' ? (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="p-6">Producto / Categoría</th>
                      <th className="p-6">Negocio</th>
                      <th className="p-6 text-right">Clicks</th>
                      <th className="p-6 text-right">Precio</th>
                      <th className="p-6 text-center">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold uppercase text-slate-700">
                    {productosFiltrados.map((p) => (
                      <tr key={p.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                        <td className="p-6">
                          <span className="block text-slate-900">{p.nombre}</span>
                          <span className="text-[9px] text-slate-400">{p.categoria || 'GENERAL'}</span>
                        </td>
                        <td className="p-6"><span className="bg-blue-50 text-blue-600 px-3 py-1 rounded-lg text-[9px] font-black">{p.nombreTienda}</span></td>
                        <td className="p-6 text-right font-mono text-blue-500">{p.clics || 0}</td>
                        <td className="p-6 text-right font-black text-slate-900">${Number(p.precio).toLocaleString()}</td>
                        <td className="p-6 text-center">
                          <button onClick={() => eliminarProducto(p.id, p.nombre)} className="text-slate-300 hover:text-red-500 transition-all">
                            <Trash2 size={18}/>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="w-full text-left">
                  <thead className="bg-slate-50 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                    <tr>
                      <th className="p-6">Usuario / Contacto</th>
                      <th className="p-6 text-center">Rol</th>
                      <th className="p-6 text-center">Gestión TI</th>
                    </tr>
                  </thead>
                  <tbody className="text-xs font-bold uppercase text-slate-700">
                    {usuariosFiltrados.map((u) => (
                      <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                        <td className="p-6">
                          <span className="block text-slate-900">{u.nombre}</span>
                          <span className="text-[9px] text-slate-400">{u.email}</span>
                        </td>
                        <td className="p-6 text-center">
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black ${u.rol === 'tendero' ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'}`}>{u.rol}</span>
                        </td>
                        <td className="p-6 text-center flex justify-center gap-4">
                          <button onClick={() => toast.success(`LINK ENVIADO A ${u.email}`)} className="text-slate-400 hover:text-blue-500 transition-all" title="Reset Password"><Key size={18}/></button>
                          <button onClick={() => eliminarUsuario(u.id, u.nombre)} className="text-slate-400 hover:text-red-500 transition-all" title="Borrar Usuario"><Trash2 size={18}/></button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- EL MODAL (VENTANA PEQUEÑA) --- */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden border border-slate-100 animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <PackagePlus size={18}/> Global Product Add
              </h3>
              <button onClick={() => setShowModal(false)} className="hover:rotate-90 transition-transform">
                <Ban size={20}/>
              </button>
            </div>
            
            <form onSubmit={guardarProductoModal} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 ml-1 italic">1. Tienda de Destino</label>
                <select 
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-100 appearance-none"
                  onChange={(e) => setNuevoProducto({...nuevoProducto, idTienda: e.target.value})}
                >
                  <option value="">-- Seleccionar Comercio --</option>
                  {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombreNegocio}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 ml-1 italic">2. Nombre del Artículo</label>
                <input 
                  placeholder="EJ: TOMATE CHONTO"
                  required
                  className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase outline-none focus:ring-2 focus:ring-blue-100"
                  onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 ml-1 italic">3. Precio</label>
                  <input 
                    type="number"
                    placeholder="0.00"
                    required
                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase outline-none"
                    onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-400 mb-1 ml-1 italic">4. Categoría</label>
                  <input 
                    placeholder="EJ: FRUTAS"
                    className="w-full p-3.5 bg-slate-50 border border-slate-100 rounded-2xl text-[10px] font-bold uppercase outline-none"
                    onChange={(e) => setNuevoProducto({...nuevoProducto, categoria: e.target.value})}
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase hover:bg-slate-50 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={subiendoProducto}
                  className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-100 hover:bg-blue-700 transition-all flex items-center justify-center gap-2"
                >
                  {subiendoProducto ? <Loader2 className="animate-spin" size={14}/> : <><Save size={14}/> Guardar</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}

function StatBox({ label, val, color }: any) {
  return (
    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">{label}</p>
      <p className={`text-2xl font-black italic tracking-tight ${color}`}>{val}</p>
    </div>
  );
}