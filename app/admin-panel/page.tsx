"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, doc, onSnapshot, setDoc, updateDoc } from "firebase/firestore";
import { useRouter } from "next/navigation";
import { 
  Trash2, LogOut, Store, Tag, Plus, 
  Printer, Loader2, Search, Ban, CheckCircle, 
  Zap, LayoutGrid as LayoutGridIcon, MousePointer2, Calendar
} from "lucide-react";

interface Stats {
  totalProductos: number;
  totalTiendas: number;
  valorInventario: number;
  totalClics: number;
}

export default function AdminPanel() {
  const [productos, setProductos] = useState<any[]>([]);
  const [tiendas, setTiendas] = useState<any[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [nuevaCat, setNuevaCat] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const ADMIN_EMAIL = "admin@localmarket.com";

  // --- LÓGICA DE FILTRADO DINÁMICO ---
  const productosFiltrados = useMemo(() => {
    return productos.filter(p => 
      (p.nombre?.toLowerCase() || "").includes(busqueda.toLowerCase()) || 
      (p.nombreTienda?.toLowerCase() || "").includes(busqueda.toLowerCase())
    );
  }, [productos, busqueda]);

  const nombreTiendaFiltrada = useMemo(() => {
    if (!busqueda) return null;
    const encontrada = tiendas.find(t => 
      t.nombreNegocio?.toLowerCase() === busqueda.toLowerCase()
    );
    return encontrada ? encontrada.nombreNegocio : null;
  }, [tiendas, busqueda]);

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

  useEffect(() => {
    const unsubscribeAuth = auth.onAuthStateChanged((user) => {
      if (!user || user.email !== ADMIN_EMAIL) {
        router.push("/login");
      } else {
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
        return () => { unsubCats(); unsubTiendas(); unsubProds(); };
      }
    });
    return () => unsubscribeAuth();
  }, [router]);

  const agregarCategoria = async () => {
    if (!nuevaCat.trim()) return;
    await setDoc(doc(db, "configuracion", "categorias"), { lista: [...categorias, nuevaCat.trim().toUpperCase()] });
    setNuevaCat("");
  };

  const eliminarCategoria = async (cat: string) => {
    if (confirm(`¿Eliminar categoría "${cat}"?`)) {
      await setDoc(doc(db, "configuracion", "categorias"), { lista: categorias.filter(c => c !== cat) });
    }
  };

  const toggleBloqueoTienda = async (tiendaId: string, estadoActual: boolean) => {
    if (confirm(estadoActual ? "¿Desbloquear tienda?" : "¿BLOQUEAR tienda?")) {
      await updateDoc(doc(db, "tiendas", tiendaId), { bloqueada: !estadoActual });
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-950 text-orange-500 font-black italic">
      <Loader2 className="animate-spin mb-4" size={60} />
      <p className="tracking-widest animate-pulse uppercase">Cargando Base de Datos...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans p-4 md:p-10">
      
      {/* HEADER EXCLUSIVO IMPRESIÓN */}
      <div className="hidden print:block text-black border-b-4 border-black pb-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter">REPORTE MAESTRO DE INVENTARIO</h1>
            <p className="text-[10px] font-bold text-gray-600 uppercase">LocalMarket Cali - Control de Auditoría Interna</p>
          </div>
          
          {/* RECUADRO PARA NOMBRE DE TIENDA FILTRADA */}
          <div className="border-2 border-black p-3 min-w-[220px] text-center">
            <p className="text-[8px] font-black uppercase mb-1">Entidad Seleccionada</p>
            <p className="text-xl font-black uppercase italic leading-none">
              {nombreTiendaFiltrada || "LOCALMARKET GLOBAL"}
            </p>
          </div>
        </div>
      </div>

      {/* DASHBOARD HEADER */}
      <header className="flex flex-col md:flex-row justify-between items-start mb-10 gap-6 print:hidden">
        <div>
          <div className="flex items-center gap-2 text-orange-500 mb-2 font-black text-[10px] uppercase tracking-[0.4em]">
            <Zap size={14} className="animate-pulse" /> Consola de Administración
          </div>
          <h1 className="text-6xl font-black uppercase italic tracking-tighter">
            MASTER<br/><span className="text-orange-600">ADMIN</span>
          </h1>
        </div>
        <div className="flex gap-4">
          <button onClick={() => window.print()} className="bg-blue-600 px-6 py-3 font-black uppercase border-2 border-white/20 flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg">
            <Printer size={20}/> Imprimir Filtro
          </button>
          <button onClick={() => { auth.signOut(); router.push("/"); }} className="bg-zinc-900 px-6 py-3 font-black uppercase border-2 border-orange-600 flex items-center gap-2 hover:bg-red-600 transition-all">
            <LogOut size={20}/> Salir
          </button>
        </div>
      </header>

      {/* MÉTRICAS (VISIBLES EN REPORTE Y DINÁMICAS) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 print:grid-cols-4 print:text-black">
        <StatBox label="Productos en Vista" val={statsDinamicas.totalProductos} color="text-blue-400" />
        <StatBox label="Tiendas Filtradas" val={statsDinamicas.totalTiendas} color="text-purple-400" />
        <StatBox label="Interacciones" val={statsDinamicas.totalClics} color="text-orange-500" />
        <StatBox label="Valor Selección" val={`$${statsDinamicas.valorInventario.toLocaleString()}`} color="text-green-400" />
      </div>

      <div className="grid lg:grid-cols-12 gap-8">
        
        {/* PANEL LATERAL: GESTIÓN Y FILTROS RÁPIDOS */}
        <div className="lg:col-span-4 space-y-6 print:hidden">
          
          <section className="bg-zinc-900 border border-white/10 p-5 rounded-sm shadow-xl">
            <h2 className="font-black uppercase text-orange-500 mb-4 flex items-center gap-2 italic border-b border-white/5 pb-2">
              <Store size={18}/> Filtro por Tienda
            </h2>
            <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-2">
              <button 
                onClick={() => setBusqueda("")}
                className={`w-full text-left p-2 text-[10px] font-black uppercase border transition-all ${busqueda === "" ? 'bg-orange-600 border-white' : 'bg-black border-white/5 hover:border-orange-500'}`}
              >
                MOSTRAR TODO
              </button>
              {tiendas.map(t => (
                <button 
                  key={t.id}
                  onClick={() => setBusqueda(t.nombreNegocio)}
                  className={`w-full text-left p-2 text-[10px] font-black uppercase border transition-all ${busqueda === t.nombreNegocio ? 'bg-orange-600 border-white' : 'bg-black border-white/5 hover:border-orange-500'}`}
                >
                  {t.nombreNegocio}
                </button>
              ))}
            </div>
          </section>

          <section className="bg-zinc-900 border border-white/10 p-5 rounded-sm">
            <h2 className="font-black uppercase text-orange-500 mb-4 flex items-center gap-2 italic border-b border-white/5 pb-2">
              <LayoutGridIcon size={18}/> Categorías
            </h2>
            <div className="flex gap-2 mb-4">
              <input value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} placeholder="NUEVA..." className="flex-1 bg-black p-2 border border-white/10 text-xs font-black uppercase outline-none focus:border-orange-500" />
              <button onClick={agregarCategoria} className="bg-orange-600 px-3"><Plus size={18}/></button>
            </div>
            <div className="flex flex-wrap gap-2">
              {categorias.map(cat => (
                <span key={cat} className="bg-zinc-800 px-2 py-1 text-[9px] font-black uppercase flex items-center gap-2 border border-white/5 italic">
                  {cat} <Trash2 size={12} className="text-red-500 cursor-pointer" onClick={() => eliminarCategoria(cat)}/>
                </span>
              ))}
            </div>
          </section>

          <section className="bg-zinc-900 border border-white/10 p-5 rounded-sm">
            <h2 className="font-black uppercase text-orange-500 mb-4 flex items-center gap-2 italic border-b border-white/5 pb-2">
              <Store size={18}/> Gestión Tiendas (Bloqueo)
            </h2>
            <div className="space-y-2 max-h-40 overflow-y-auto custom-scrollbar">
              {tiendas.map(t => (
                <div key={t.id} className="flex justify-between items-center bg-black/40 p-3 border border-white/5">
                  <div className="truncate pr-2">
                    <p className="font-black text-[10px] uppercase truncate">{t.nombreNegocio || 'S/N'}</p>
                    <p className="text-[8px] text-zinc-500 font-mono truncate">{t.email}</p>
                  </div>
                  <button onClick={() => toggleBloqueoTienda(t.id, !!t.bloqueada)} className={`p-2 border ${t.bloqueada ? 'bg-red-600 border-red-400 animate-pulse' : 'bg-green-600 border-green-400 hover:bg-white hover:text-black transition-colors'}`}>
                    {t.bloqueada ? <Ban size={14}/> : <CheckCircle size={14}/>}
                  </button>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* TABLA PRINCIPAL */}
        <div className="lg:col-span-8">
          <div className="bg-zinc-900 border border-white/10 overflow-hidden print:border-black print:bg-white rounded-sm shadow-2xl">
            <div className="p-4 bg-black/50 print:hidden flex items-center gap-3">
              <Search size={18} className="text-orange-500" />
              <input value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="ESCRIBE NOMBRE DE PRODUCTO O TIENDA..." className="bg-transparent w-full text-xs font-black uppercase outline-none placeholder:text-zinc-600" />
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse grid-table print:text-black">
                <thead>
                  <tr className="bg-black text-orange-500 text-[10px] font-black uppercase border-b-2 border-orange-600 print:bg-gray-200 print:text-black print:border-black">
                    <th className="p-4 border-r border-white/10 print:border-black">Producto</th>
                    <th className="p-4 border-r border-white/10 print:border-black">Categoría</th>
                    <th className="p-4 border-r border-white/10 print:border-black">Tienda</th>
                    <th className="p-4 border-r border-white/10 text-right print:border-black">Interés</th>
                    <th className="p-4 text-right">Precio</th>
                  </tr>
                </thead>
                <tbody className="text-[11px] font-bold uppercase italic">
                  {productosFiltrados.map((p) => (
                    <tr key={p.id} className="border-b border-white/10 hover:bg-white/5 transition-colors print:border-black print:text-black">
                      <td className="p-4 border-r border-white/10 font-black print:border-black">
                        {p.nombre} {p.oferta && <span className="text-orange-500 not-italic ml-1">🔥</span>}
                      </td>
                      <td className="p-4 border-r border-white/10 print:border-black">
                        {p.categoria || 'GENERAL'}
                      </td>
                      <td className="p-4 border-r border-white/10 print:border-black">
                        <span className="bg-white text-black px-2 py-0.5 text-[9px] font-black border border-black print:bg-transparent">{p.nombreTienda}</span>
                      </td>
                      <td className="p-4 border-r border-white/10 text-right font-mono text-orange-500 print:text-black print:border-black">
                        {p.clics || 0}
                      </td>
                      <td className="p-4 text-right font-black text-sm">
                        ${Number(p.precio).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER DE IMPRESIÓN */}
      <footer className="mt-10 pt-4 border-t-2 border-black hidden print:flex justify-between items-center text-[10px] font-black uppercase italic text-black">
        <div>
          <p>Firma Responsable Auditoría: ___________________________</p>
          <p className="mt-2 text-gray-500 tracking-tighter">TOKEN-ID: {Math.random().toString(36).substr(2, 10).toUpperCase()}</p>
        </div>
        <div className="text-right">
          <p>LocalMarket Cali - Sistema Inventario © 2026</p>
          <p>Documento Generado: {new Date().toLocaleString()}</p>
        </div>
      </footer>

      <style jsx global>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #ea580c; }
        
        @media print {
          @page { size: portrait; margin: 1cm; }
          body { background: white !important; color: black !important; -webkit-print-color-adjust: exact; }
          .bg-slate-950, .bg-zinc-900, .bg-black, .bg-black\/40, .bg-black\/50 { background: transparent !important; }
          .print\:text-black { color: black !important; }
          
          .grid-table { 
            width: 100% !important; 
            border: 2px solid black !important; 
            border-collapse: collapse !important;
          }
          .grid-table th, .grid-table td { 
            border: 1px solid black !important; 
            padding: 8px !important;
          }
          .grid-table th { 
            background-color: #eee !important;
          }
          
          .print\:hidden { display: none !important; }
          .hidden.print\:flex { display: flex !important; }
          .hidden.print\:block { display: block !important; }
        }
      `}</style>
    </div>
  );
}

function StatBox({ label, val, color }: any) {
  return (
    <div className="bg-zinc-900 border border-white/10 p-5 rounded-sm print:border-black print:bg-white">
      <p className="text-[9px] font-black uppercase text-zinc-500 mb-1 print:text-black">{label}</p>
      <p className={`text-2xl font-black italic tracking-tighter ${color} print:text-black`}>{val}</p>
    </div>
  );
}