"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, onSnapshot, updateDoc, deleteDoc, query, orderBy, addDoc, serverTimestamp, increment } from "firebase/firestore";
import { useRouter } from "next/navigation";
import toast from 'react-hot-toast';
import { 
  Trash2, LogOut, Store, 
  Printer, Loader2, Search, Ban, CheckCircle, 
  ShieldCheck, LayoutGrid as LayoutGridIcon, MessageSquare, 
  Send, Users, Key, PackagePlus, Save, Edit3, History,
  Eye, RefreshCw, TrendingUp, AlertTriangle, Phone
} from "lucide-react";
import { where, getDocs, writeBatch } from "firebase/firestore";

const CATEGORIAS_OPTIMIZADAS = [
  "GRANOS Y ESTANTERÍA",
  "CARNES Y PROTEÍNA",
  "FRUTAS Y VERDURAS",
  "LÁCTEOS Y HUEVOS",
  "PANADERÍA Y SNACKS",
  "BEBIDAS",
  "ASEO Y HOGAR",
  "OTROS"
];

interface Ticket {
  id: string;
  remitente: string;
  destinatario?: string;
  whatsapp: string;
  rol: "tendero" | "cliente" | "interno";
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
  const [productos, setProductos] = useState<any[]>([]);
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]); 
  const [tickets, setTickets] = useState<Ticket[]>([]); 
  const [filtroSoporte, setFiltroSoporte] = useState<"tendero" | "cliente" | "interno">("tendero");
  const [activeTab, setActiveTab] = useState<"inventario" | "usuarios" | "logs" | "metricas">("inventario"); 
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const [showModal, setShowModal] = useState(false);
  const [subiendoProducto, setSubiendoProducto] = useState(false);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  
  // NUEVO: Estado para editar WhatsApp directamente en la tabla
  const [editWhastapp, setEditWhatsapp] = useState({ id: "", num: "" });
  const [editTiendaWa, setEditTiendaWa] = useState({ id: "", num: "" });

  const [nuevoProducto, setNuevoProducto] = useState({
    nombre: "",
    precio: "",
    categoria: "",
    idTienda: "",
    whatsapp: "" // Aseguramos que el producto lleve el WhatsApp
  });

  const [logs, setLogs] = useState<any[]>([]);
  const ADMIN_EMAIL = "admin@localmarket.com";

  // --- LÓGICA DE AUDITORÍA ---
  const registrarLog = async (accion: string, detalle: string, responsable: string = ADMIN_EMAIL) => {
    try {
      await addDoc(collection(db, "auditoria"), {
        admin: ADMIN_EMAIL,
        responsable: responsable.toLowerCase(),
        accion,
        detalle,
        fecha: new Date().toLocaleString('es-CO'),
        timestamp: serverTimestamp()
      });
    } catch (e) { console.error("Error log:", e); }
  };

// --- AÑADIDO: ACTUALIZAR WHATSAPP INDIVIDUAL (PRODUCTO) ---
  const corregirWhatsapp = async (id: string, nombreProd: string) => {
    try {
      await updateDoc(doc(db, "productos", id), { whatsapp: editWhastapp.num });
      await registrarLog("CORRECCIÓN", `WhatsApp actualizado en ${nombreProd}: ${editWhastapp.num}`);
      toast.success("NÚMERO ACTUALIZADO");
      setEditWhatsapp({ id: "", num: "" });
    } catch (e) { 
      toast.error("ERROR AL ACTUALIZAR"); 
    }
  };

  // --- AÑADIDO: ACTUALIZAR WHATSAPP TIENDA Y PRODUCTOS EN CASCADA ---
  const actualizarWaTienda = async (id: string, nombreTienda: string) => {
    if (!editTiendaWa.num) return;
    try {
      const nuevoNumero = editTiendaWa.num;
      const batch = writeBatch(db);

      // Actualiza la tienda
      const tiendaRef = doc(db, "tiendas", id);
      batch.update(tiendaRef, { whatsapp: nuevoNumero });

      // Busca productos de esa tienda para sincronizar
      const q = query(collection(db, "productos"), where("idTienda", "==", id));
      const querySnapshot = await getDocs(q);

      querySnapshot.forEach((productoDoc: any) => {
        batch.update(productoDoc.ref, { whatsapp: nuevoNumero });
      });

      await batch.commit();
      await registrarLog("CONFIGURACIÓN", `Sincronización total: ${nombreTienda}`);
      toast.success("TIENDA Y PRODUCTOS ACTUALIZADOS");
      setEditTiendaWa({ id: "", num: "" });
    } catch (e) { 
      console.error(e);
      toast.error("ERROR EN SINCRONIZACIÓN"); 
    }
  };

  // --- FILTRADOS Y STATS (MANTENIDOS) ---
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

  const logsFiltrados = useMemo(() => {
    return logs.filter(l => 
      (l.detalle?.toLowerCase() || "").includes(busqueda.toLowerCase()) || 
      (l.accion?.toLowerCase() || "").includes(busqueda.toLowerCase())
    );
  }, [logs, busqueda]);

  const statsDinamicas = useMemo(() => {
    const sumaPrecios = productos.reduce((acc, curr) => acc + (Number(curr.precio) || 0), 0);
    const clics = productos.reduce((acc, curr) => acc + (Number(curr.clics) || 0), 0);
    const ticketsPendientes = tickets.filter(t => t.estado === 'pendiente').length;
    
    return {
      totalProductos: productos.length,
      totalTiendas: tiendas.length,
      valorInventario: sumaPrecios,
      totalClics: clics,
      pendientes: ticketsPendientes
    };
  }, [productos, tiendas, tickets]);

  // --- SUSCRIPCIONES FIREBASE (MANTENIDAS) ---
  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        router.replace("/admin-login"); 
        return;
      }

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

      const unsubLogs = onSnapshot(query(collection(db, "auditoria"), orderBy("timestamp", "desc")), (snap) => {
        setLogs(snap.docs.slice(0, 50).map(d => ({ id: d.id, ...d.data() })));
      });

      return () => { 
        unsubTiendas(); unsubProds(); unsubTickets(); unsubUsers(); unsubLogs();
      };
    });

    return () => unsubscribeAuth();
  }, [router]);

  // --- ACCIONES DE GESTIÓN (MANTENIDAS) ---
  const responderTicket = async (ticket: Ticket) => {
    const mensajeAdmin = `Hola ${ticket.remitente}, soporte LocalMarket: "${ticket.mensaje}".`;
    const urlWhatsApp = `https://wa.me/57${ticket.whatsapp}?text=${encodeURIComponent(mensajeAdmin)}`;
    try {
      await updateDoc(doc(db, "tickets", ticket.id), { estado: "resuelto", respuestaAdmin: "WA_SENT" });
      window.open(urlWhatsApp, '_blank');
      toast.success("CHAT INICIADO");
    } catch (e) { toast.error("ERROR AL RESPONDER"); }
  };

  const cambiarRolUsuario = async (id: string, nuevoRol: any, nombre: string) => {
    try {
      await updateDoc(doc(db, "usuarios", id), { rol: nuevoRol });
      await registrarLog("PERMISOS", `Cambio de rol a ${nuevoRol}: ${nombre}`);
      toast.success(`ROL ACTUALIZADO A ${nuevoRol.toUpperCase()}`);
    } catch (e) { toast.error("ERROR AL CAMBIAR ROL"); }
  };

  const eliminarProducto = async (id: string, nombre: string) => {
    if (confirm(`¿ELIMINAR "${nombre.toUpperCase()}"?`)) {
      await deleteDoc(doc(db, "productos", id));
      await registrarLog("ELIMINACIÓN", `Se eliminó el producto: ${nombre}`);
      toast.success("PRODUCTO ELIMINADO");
    }
  };

  const eliminarUsuario = async (id: string, nombre: string) => {
    if (confirm(`¿BORRAR ACCESO DE ${nombre.toUpperCase()}?`)) {
      await deleteDoc(doc(db, "usuarios", id));
      await registrarLog("SEGURIDAD", `Usuario eliminado: ${nombre}`);
      toast.success("USUARIO ELIMINADO");
    }
  };

  const toggleBloqueoTienda = async (tiendaId: string, estadoActual: boolean, nombre: string) => {
    if (confirm(estadoActual ? "¿Desbloquear tienda?" : "¿BLOQUEAR TIENDA?")) {
      await updateDoc(doc(db, "tiendas", tiendaId), { bloqueada: !estadoActual });
      await registrarLog("ESTADO", `${estadoActual ? 'DESBLOQUEO' : 'BLOQUEO'} de tienda: ${nombre}`);
      toast.success(estadoActual ? "ACTIVA" : "BLOQUEADA");
    }
  };

  const guardarProductoModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoProducto.idTienda || !nuevoProducto.nombre || !nuevoProducto.precio) {
      toast.error("FALTAN DATOS OBLIGATORIOS");
      return;
    }
    setSubiendoProducto(true);
    try {
      const tiendaSeleccionada = tiendas.find(t => t.id === nuevoProducto.idTienda);
      const dataObj = {
        categoria: (nuevoProducto.categoria || "OTROS").toUpperCase().trim(),
        idTienda: nuevoProducto.idTienda,
        nombre: nuevoProducto.nombre.toUpperCase().trim(),
        nombreTienda: (tiendaSeleccionada?.nombreNegocio || "Tienda Desconocida").toUpperCase().trim(),
        precio: Number(nuevoProducto.precio),
        tenderoEmail: (tiendaSeleccionada?.email || ADMIN_EMAIL).toLowerCase().trim(),
        whatsapp: nuevoProducto.whatsapp || (tiendaSeleccionada?.whatsapp || "")
      };

      if (editandoId) {
        await updateDoc(doc(db, "productos", editandoId), dataObj);
        await registrarLog("EDICIÓN", `Producto: ${dataObj.nombre} (${dataObj.nombreTienda})`);
        toast.success("PRODUCTO ACTUALIZADO");
      } else {
        await addDoc(collection(db, "productos"), {
          ...dataObj,
          clics: 0,
          fecha: new Date().toLocaleString('es-CO'),
        });
        await registrarLog("CREACIÓN", `Producto: ${dataObj.nombre} (${dataObj.nombreTienda})`);
        toast.success("PRODUCTO AGREGADO EXITOSAMENTE");
      }
      setShowModal(false);
      setEditandoId(null);
      setNuevoProducto({ nombre: "", precio: "", categoria: "", idTienda: "", whatsapp: "" });
    } catch (error) {
      toast.error("ERROR EN BASE DE DATOS");
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
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 md:p-8 max-w-[1600px] mx-auto">
      <header className="flex flex-col xl:flex-row justify-between items-center mb-8 gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-100">
        <div className="flex items-center gap-4">
          <div className="bg-blue-600 p-3 rounded-2xl shadow-lg shadow-blue-200 text-white">
            <LayoutGridIcon size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase italic tracking-tight leading-none text-slate-900">
              Admin<span className="text-blue-600">Console</span>
            </h1>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">LocalMarket Cali | Control Central</p>
          </div>
        </div>

        <nav className="flex bg-slate-100 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto max-w-full">
          {(["inventario", "usuarios", "metricas", "logs"] as const).map((tab) => (
            <button 
              key={tab}
              onClick={() => { setActiveTab(tab); setBusqueda(""); }}
              className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all whitespace-nowrap ${activeTab === tab ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500 hover:text-slate-900'}`}
            >
              {tab === 'inventario' && <Store size={14}/>}
              {tab === 'usuarios' && <Users size={14}/>}
              {tab === 'metricas' && <TrendingUp size={14}/>}
              {tab === 'logs' && <History size={14}/>}
              {tab}
            </button>
          ))}
        </nav>

        <div className="flex gap-2">
          <button onClick={() => window.print()} className="bg-slate-100 hover:bg-slate-200 px-4 py-2.5 rounded-xl font-bold uppercase text-[10px] text-slate-900 transition-all flex items-center gap-2">
            <Printer size={16}/> PDF
          </button>
          <button onClick={() => { auth.signOut(); router.push("/"); }} className="bg-white border-2 border-slate-200 hover:text-red-500 text-slate-900 px-6 py-2.5 rounded-xl font-bold uppercase text-[10px] transition-all flex items-center gap-2 shadow-sm">
            <LogOut size={16}/> Salir
          </button>
        </div>
      </header>

      {/* STATS DINÁMICAS */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        <StatBox label="Productos" val={statsDinamicas.totalProductos} color="text-blue-600" />
        <StatBox label="Tiendas" val={statsDinamicas.totalTiendas} color="text-indigo-600" />
        <StatBox label="Interacciones" val={statsDinamicas.totalClics} color="text-cyan-600" />
        <StatBox label="Stock" val={`$${statsDinamicas.valorInventario.toLocaleString()}`} color="text-emerald-600" />
        <div className={`bg-white border-2 p-6 rounded-3xl shadow-sm transition-all ${statsDinamicas.pendientes > 0 ? 'border-orange-500 animate-pulse' : 'border-slate-100'}`}>
          <p className="text-[10px] font-black uppercase text-slate-400 mb-1">Tickets Pend.</p>
          <p className={`text-2xl font-black italic tracking-tight ${statsDinamicas.pendientes > 0 ? 'text-orange-600' : 'text-slate-300'}`}>{statsDinamicas.pendientes}</p>
        </div>
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        {/* PANEL LATERAL: SOPORTE Y TIENDAS */}
        <div className="lg:col-span-4 space-y-6">
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-black uppercase text-blue-600 mb-4 flex items-center gap-2 text-sm italic border-b border-slate-50 pb-3">
              <MessageSquare size={18}/> Centro de Soporte IT
            </h2>
            <div className="flex gap-1 mb-4 bg-slate-100 p-1 rounded-xl">
              {(["tendero", "cliente", "interno"] as const).map((r) => (
                <button key={r} onClick={() => setFiltroSoporte(r)} className={`flex-1 py-2 text-[9px] font-black uppercase rounded-lg transition-all ${filtroSoporte === r ? 'bg-white shadow-sm text-blue-600' : 'text-slate-500'}`}>
                  {r === 'interno' ? 'Monitoreo' : r + 's'}
                </button>
              ))}
            </div>
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {tickets.filter(t => (filtroSoporte === 'interno' ? t.rol === 'tendero' || t.rol === 'cliente' : t.rol === filtroSoporte)).map(t => (
                <div key={t.id} className={`p-4 rounded-2xl border transition-all ${t.estado === 'resuelto' ? 'bg-slate-50 opacity-50' : 'bg-white border-slate-100 shadow-sm'}`}>
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[9px] font-black px-2 py-0.5 rounded bg-slate-100 uppercase text-slate-500">{t.rol}</span>
                    <span className="text-[8px] text-slate-400 font-bold">{t.fecha.split(',')[0]}</span>
                  </div>
                  <p className="text-[11px] font-black uppercase text-slate-900">{t.remitente}</p>
                  <p className="text-xs text-slate-700 leading-snug my-2 italic font-bold">"{t.mensaje}"</p>
                  
                  {t.estado === 'pendiente' && filtroSoporte !== 'interno' ? (
                    <button onClick={() => responderTicket(t)} className="w-full bg-blue-600 text-white text-[10px] py-3 rounded-xl uppercase font-black flex items-center justify-center gap-2">
                      <Send size={14} /> Atender WhatsApp
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[9px] font-black text-emerald-600 uppercase"><CheckCircle size={12}/> Resuelto</span>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* SECCIÓN ACTUALIZADA: STATUS DE COMERCIOS CON EDICIÓN DE WHATSAPP */}
          <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
            <h2 className="font-black uppercase text-blue-600 mb-4 flex items-center gap-2 text-sm italic border-b border-slate-50 pb-3">
              <Store size={18}/> Status de Comercios
            </h2>
            <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
              {tiendas.map(t => (
                <div key={t.id} className="bg-slate-50 p-3 rounded-2xl border border-slate-100 shadow-sm">
                  <div className="flex justify-between items-center mb-2">
                    <button 
                      onClick={() => setBusqueda(t.nombreNegocio)} 
                      className={`text-[10px] font-black uppercase truncate max-w-[150px] transition-colors ${busqueda === t.nombreNegocio ? 'text-blue-600' : 'text-slate-900'}`}
                    >
                      {t.nombreNegocio}
                    </button>
                    <button 
                      onClick={() => toggleBloqueoTienda(t.id, !!t.bloqueada, t.nombreNegocio)} 
                      className={`p-1.5 rounded-lg border transition-all ${t.bloqueada ? 'bg-red-50 border-red-200 text-red-600' : 'bg-emerald-50 border-emerald-200 text-emerald-600'}`}
                    >
                      {t.bloqueada ? <Ban size={12}/> : <ShieldCheck size={12}/>}
                    </button>
                  </div>

                  <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-slate-100">
                    <Phone size={12} className="text-slate-400" />
                    {editTiendaWa.id === t.id ? (
                      <input 
                        className="flex-1 text-[10px] font-bold outline-none text-blue-600 bg-transparent"
                        value={editTiendaWa.num}
                        onChange={(e) => setEditTiendaWa({...editTiendaWa, num: e.target.value})}
                        onBlur={() => actualizarWaTienda(t.id, t.nombreNegocio)}
                        autoFocus
                      />
                    ) : (
                      <span 
                        onClick={() => setEditTiendaWa({id: t.id, num: t.whatsapp || ""})} 
                        className="flex-1 text-[10px] font-bold text-slate-500 cursor-pointer hover:text-blue-600 flex justify-between items-center"
                      >
                        {t.whatsapp || "SIN NÚMERO"} ✏️
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* CONTENIDO PRINCIPAL SEGÚN TABS */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
            
            {activeTab !== 'metricas' ? (
              <>
                <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
                  <div className="relative flex-1 w-full">
                    <Search size={18} className="absolute left-4 top-3.5 text-slate-500" />
                    <input 
                      value={busqueda} 
                      onChange={(e) => setBusqueda(e.target.value)} 
                      placeholder={`BUSCAR EN ${activeTab.toUpperCase()}...`} 
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 rounded-2xl text-[10px] font-bold uppercase outline-none text-slate-900 placeholder:text-slate-500" 
                    />
                  </div>
                  {activeTab === 'inventario' && (
                    <button 
                      onClick={() => { setEditandoId(null); setNuevoProducto({nombre: "", precio: "", categoria: "", idTienda: "", whatsapp: ""}); setShowModal(true); }}
                      className="w-full md:w-auto bg-blue-600 text-white px-6 py-3.5 rounded-2xl text-[10px] font-black uppercase flex items-center justify-center gap-2 shadow-lg hover:scale-105 transition-all"
                    >
                      <PackagePlus size={16} /> Nuevo Producto
                    </button>
                  )}
                </div>
                
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead className="bg-slate-50 text-slate-900 text-[10px] font-black uppercase border-b border-slate-200">
                      <tr>
                        {activeTab === 'inventario' ? (
                          <>
                            <th className="p-6">Producto / Categoría</th>
                            <th className="p-6 text-center">Tienda / WhatsApp</th>
                            <th className="p-6 text-center">Interés</th>
                            <th className="p-6 text-center">Acciones</th>
                          </>
                        ) : activeTab === 'usuarios' ? (
                          <>
                            <th className="p-6">Nombre / Email</th>
                            <th className="p-6 text-center">Gestión de Rol</th>
                            <th className="p-6 text-center">Seguridad</th>
                          </>
                        ) : (
                          <>
                            <th className="p-6">Evento / Fecha</th>
                            <th className="p-6 text-center">Descripción</th>
                            <th className="p-6 text-center">Autor</th>
                          </>
                        )}
                      </tr>
                    </thead>
                    <tbody className="text-xs font-bold uppercase text-slate-800">
                      {activeTab === 'inventario' && productosFiltrados.map((p) => (
                        <tr key={p.id} className="border-b border-slate-50 hover:bg-blue-50/30 transition-colors">
                          <td className="p-6">
                            <span className="block text-slate-900 text-sm">{p.nombre}</span>
                            <span className="text-[9px] text-blue-600 font-black tracking-widest">{p.categoria || 'OTROS'}</span>
                          </td>
                          <td className="p-6 text-center">
                            <span className="block bg-blue-50 text-blue-700 px-3 py-1 rounded-lg text-[9px] font-black mb-1">{p.nombreTienda}</span>
                            <div className="flex items-center justify-center gap-1">
                                <Phone size={10} className="text-slate-400" />
                                {editWhastapp.id === p.id ? (
                                    <input 
                                        className="border border-blue-600 px-2 py-0.5 rounded text-[10px] outline-none w-24"
                                        value={editWhastapp.num}
                                        onChange={(e) => setEditWhatsapp({...editWhastapp, num: e.target.value})}
                                        onBlur={() => corregirWhatsapp(p.id, p.nombre)}
                                        autoFocus
                                    />
                                ) : (
                                    <span 
                                        onClick={() => setEditWhatsapp({id: p.id, num: p.whatsapp || ""})} 
                                        className="text-[9px] text-slate-500 cursor-pointer hover:text-blue-600 hover:underline underline-offset-2"
                                    >
                                        {p.whatsapp || "SIN NÚMERO"} ✏️
                                    </span>
                                )}
                            </div>
                          </td>
                          <td className="p-6 text-center font-black text-blue-600">{p.clics || 0}</td>
                          <td className="p-6 text-center flex justify-center gap-3">
                            <button onClick={() => { setEditandoId(p.id); setNuevoProducto({nombre: p.nombre, precio: p.precio.toString(), categoria: p.categoria, idTienda: p.idTienda, whatsapp: p.whatsapp || ""}); setShowModal(true); }} className="p-2 bg-slate-100 rounded-lg text-slate-600 hover:text-blue-600 transition-all">
                              <Edit3 size={16}/>
                            </button>
                            <button onClick={() => eliminarProducto(p.id, p.nombre)} className="p-2 bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-all">
                              <Trash2 size={16}/>
                            </button>
                          </td>
                        </tr>
                      ))}

                      {activeTab === 'usuarios' && usuariosFiltrados.map((u) => (
                        <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="p-6">
                            <span className="block text-slate-900">{u.nombre}</span>
                            <span className="text-[9px] text-slate-400 lowercase font-bold">{u.email}</span>
                          </td>
                          <td className="p-6 text-center">
                            <select value={u.rol} onChange={(e) => cambiarRolUsuario(u.id, e.target.value, u.nombre)} className={`px-3 py-2 rounded-xl text-[10px] font-black border-none outline-none ${u.rol === 'tendero' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-700'}`}>
                              <option value="cliente">CLIENTE</option>
                              <option value="tendero">TENDERO</option>
                              <option value="admin">ADMIN</option>
                            </select>
                          </td>
                          <td className="p-6 text-center flex justify-center gap-2">
                            <button onClick={() => toast.success("ENLACE DE RESET ENVIADO")} className="p-2 text-slate-400 hover:text-blue-600"><Key size={18}/></button>
                            <button onClick={() => eliminarUsuario(u.id, u.nombre)} className="p-2 text-slate-400 hover:text-red-500"><Trash2 size={18}/></button>
                          </td>
                        </tr>
                      ))}

                      {activeTab === 'logs' && logsFiltrados.map((l) => (
                        <tr key={l.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                          <td className="p-6">
                            <span className={`block font-black ${l.accion === 'ELIMINACIÓN' ? 'text-red-600' : l.accion === 'CREACIÓN' ? 'text-emerald-600' : 'text-blue-600'}`}>{l.accion}</span>
                            <span className="text-[9px] text-slate-400 font-bold italic">{l.fecha}</span>
                          </td>
                          <td className="p-6 text-center text-[11px] text-slate-600 normal-case italic">"{l.detalle}"</td>
                          <td className="p-6 text-center">
                            <div className="flex flex-col items-center">
                              <ShieldCheck size={14} className="text-blue-600 mb-1"/>
                              <span className="text-[9px] font-black text-slate-500">{l.responsable?.split('@')[0]}</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : (
              <div className="p-8 space-y-8">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="font-black uppercase text-blue-600 text-lg italic">Inteligencia de Negocio</h3>
                  <p className="text-[10px] text-slate-400 font-bold">PRODUCTOS CON MAYOR INTERÉS EN LOCALMARKET</p>
                </div>
                <div className="grid gap-6">
                  {productos
                    .sort((a, b) => (b.clics || 0) - (a.clics || 0))
                    .slice(0, 5)
                    .map((p, idx) => (
                      <div key={p.id} className="flex items-center gap-4">
                        <span className="font-black text-slate-200 text-4xl">0{idx + 1}</span>
                        <div className="flex-1">
                          <div className="flex justify-between mb-1">
                            <span className="font-black uppercase text-xs">{p.nombre} ({p.nombreTienda})</span>
                            <span className="text-blue-600 font-black text-xs">{p.clics || 0} CLICS</span>
                          </div>
                          <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden border border-slate-200">
                            <div 
                              className="bg-blue-600 h-full transition-all duration-1000" 
                              style={{ width: `${Math.min(((p.clics || 0) / (statsDinamicas.totalClics || 1)) * 100 * 2, 100)}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
            <div className="bg-blue-600 p-6 text-white flex justify-between items-center">
              <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">
                {editandoId ? <Edit3 size={18}/> : <PackagePlus size={18}/>} 
                {editandoId ? "Actualizar" : "Nuevo Registro"}
              </h3>
              <button onClick={() => { setShowModal(false); setEditandoId(null); }} className="hover:rotate-90 transition-all"><Ban size={20}/></button>
            </div>
            
            <form onSubmit={guardarProductoModal} className="p-6 space-y-4">
              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1 italic">Asignar Comercio</label>
                <select required value={nuevoProducto.idTienda} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase outline-none" onChange={(e) => setNuevoProducto({...nuevoProducto, idTienda: e.target.value})}>
                  <option value="">-- SELECCIONAR --</option>
                  {tiendas.map(t => <option key={t.id} value={t.id}>{t.nombreNegocio}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1 italic">Nombre</label>
                <input required value={nuevoProducto.nombre} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase outline-none" onChange={(e) => setNuevoProducto({...nuevoProducto, nombre: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 mb-1 italic">Precio ($)</label>
                  <input type="number" required value={nuevoProducto.precio} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase outline-none" onChange={(e) => setNuevoProducto({...nuevoProducto, precio: e.target.value})} />
                </div>
                <div>
                  <label className="block text-[9px] font-black uppercase text-slate-500 mb-1 italic">Categoría</label>
                  <select required value={nuevoProducto.categoria} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase outline-none" onChange={(e) => setNuevoProducto({...nuevoProducto, categoria: e.target.value})}>
                    <option value="">-- ELIGIR --</option>
                    {CATEGORIAS_OPTIMIZADAS.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-black uppercase text-slate-500 mb-1 italic">WhatsApp de contacto (Personalizado)</label>
                <input value={nuevoProducto.whatsapp} placeholder="Ej: 3001234567" className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-[10px] font-bold uppercase outline-none" onChange={(e) => setNuevoProducto({...nuevoProducto, whatsapp: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => { setShowModal(false); setEditandoId(null); }} className="flex-1 py-4 border-2 border-slate-100 text-slate-400 rounded-2xl text-[10px] font-black uppercase">Cerrar</button>
                <button type="submit" disabled={subiendoProducto} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-lg shadow-blue-100">
                  {subiendoProducto ? <Loader2 className="animate-spin" size={14}/> : <Save size={14}/>} {editandoId ? "Guardar" : "Publicar"}
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
    <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm group">
      <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">{label}</p>
      <p className={`text-2xl font-black italic tracking-tight ${color}`}>{val}</p>
    </div> 
    );
}  