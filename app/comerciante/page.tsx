"use client";

import { useState, useEffect } from "react";
import { db, auth } from "@/lib/firebase";
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, getDoc } from "firebase/firestore";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  Store, PackagePlus, Trash2, LogOut, 
  Tag, DollarSign, MessageCircle, LayoutDashboard, Loader2 
} from "lucide-react";

export default function PanelComerciante() {
  const [productos, setProductos] = useState<any[]>([]);
  const [nombreTienda, setNombreTienda] = useState("");
  const [whatsapp, setWhatsapp] = useState(""); // Importante para que el cliente le escriba
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Estados del Formulario
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevaCat, setNuevaCat] = useState("");
  const [subiendo, setSubiendo] = useState(false);

  const categorias = ["CARNES", "LÁCTEOS", "ABARROTES", "FRUTAS", "PROTEÍNA", "OTROS"];

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      // Obtener datos de la tienda (Nombre y WhatsApp)
      const tiendaDoc = await getDoc(doc(db, "tiendas", currentUser.uid));
      if (tiendaDoc.exists()) {
        setNombreTienda(tiendaDoc.data().nombreNegocio);
        setWhatsapp(tiendaDoc.data().whatsapp || "3000000000"); // Valor por defecto si no existe
      }

      // Escuchar SOLO los productos de ESTA tienda
      const q = query(collection(db, "productos"), where("nombreTienda", "==", tiendaDoc.data().nombreNegocio));
      const unsubProds = onSnapshot(q, (snapshot) => {
        setProductos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
        setLoading(false);
      });

      return () => unsubProds();
    });

    return () => unsubAuth();
  }, [router]);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoPrecio || !nuevaCat) return alert("Completa todos los campos");

    setSubiendo(true);
    try {
      await addDoc(collection(db, "productos"), {
        nombre: nuevoNombre.toUpperCase(),
        precio: Number(nuevoPrecio),
        categoria: nuevaCat,
        nombreTienda: nombreTienda,
        whatsapp: whatsapp,
        clics: 0,
        fecha: new Date().toLocaleString(),
        oferta: false
      });
      setNuevoNombre(""); setNuevoPrecio(""); setNuevaCat("");
      alert("Producto agregado con éxito");
    } catch (error) {
      console.error(error);
    } finally {
      setSubiendo(false);
    }
  };

  const eliminarProducto = async (id: string) => {
    if (confirm("¿Seguro que quieres eliminar este producto?")) {
      await deleteDoc(doc(db, "productos", id));
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Loader2 className="animate-spin text-orange-600" size={50} />
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-100 font-sans text-black">
      {/* NAVBAR */}
      <nav className="bg-white border-b-4 border-black p-4 sticky top-0 z-50">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-orange-500 p-2 border-2 border-black">
              <Store size={20} className="text-white" />
            </div>
            <h1 className="font-black uppercase italic tracking-tighter">Panel: {nombreTienda}</h1>
          </div>
          <button onClick={() => signOut(auth)} className="bg-black text-white px-4 py-2 font-bold text-xs uppercase flex items-center gap-2 border-2 border-black shadow-[4px_4px_0px_0px_rgba(255,165,0,1)] active:shadow-none">
            <LogOut size={16} /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* COLUMNA 1: FORMULARIO */}
        <div className="lg:col-span-1">
          <div className="bg-white border-4 border-black p-6 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]">
            <h2 className="text-xl font-black uppercase italic mb-6 flex items-center gap-2">
              <PackagePlus className="text-orange-600" /> Nuevo Producto
            </h2>
            <form onSubmit={handleAgregar} className="space-y-4">
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Nombre del Producto</label>
                <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} type="text" placeholder="Ej: LECHE BOLSÓN" className="w-full p-3 border-2 border-black outline-none focus:bg-orange-50 font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Precio (Solo números)</label>
                <input value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} type="number" placeholder="4200" className="w-full p-3 border-2 border-black outline-none focus:bg-orange-50 font-bold" />
              </div>
              <div>
                <label className="text-[10px] font-black uppercase block mb-1">Categoría</label>
                <select value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} className="w-full p-3 border-2 border-black outline-none bg-white font-bold">
                  <option value="">SELECCIONA...</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button disabled={subiendo} className="w-full bg-orange-500 text-white font-black py-4 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-black transition-all active:translate-y-1 active:shadow-none">
                {subiendo ? "GUARDANDO..." : "AGREGAR AL INVENTARIO"}
              </button>
            </form>
          </div>
        </div>

        {/* COLUMNA 2: LISTA DE PRODUCTOS */}
        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black text-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,0.3)]">
              <p className="text-[10px] font-bold uppercase opacity-60 text-orange-400">Total Items</p>
              <p className="text-3xl font-black italic">{productos.length}</p>
            </div>
            <div className="bg-white p-4 border-4 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
              <p className="text-[10px] font-bold uppercase opacity-60 text-orange-600">Interés Total</p>
              <p className="text-3xl font-black italic">{productos.reduce((acc, curr) => acc + (curr.clics || 0), 0)} 🔥</p>
            </div>
          </div>

          <div className="bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] overflow-hidden">
            <table className="w-full text-left">
              <thead className="bg-gray-100 border-b-4 border-black text-[10px] font-black uppercase">
                <tr>
                  <th className="p-4">Producto</th>
                  <th className="p-4">Categoría</th>
                  <th className="p-4">Precio</th>
                  <th className="p-4 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y-2 divide-black">
                {productos.map((p) => (
                  <tr key={p.id} className="hover:bg-orange-50 transition-colors">
                    <td className="p-4 font-black text-sm uppercase italic">{p.nombre}</td>
                    <td className="p-4 text-[10px] font-bold uppercase">{p.categoria}</td>
                    <td className="p-4 font-black">${p.precio.toLocaleString()}</td>
                    <td className="p-4 text-center">
                      <button onClick={() => eliminarProducto(p.id)} className="text-red-600 p-2 border-2 border-transparent hover:border-red-600 transition-all">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}