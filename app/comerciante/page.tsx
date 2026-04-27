"use client";

import { useState, useEffect } from "react";
import { db, auth, storage } from "@/lib/firebase"; // Asegúrate de que storage esté exportado en tu config
import { collection, onSnapshot, query, where, addDoc, deleteDoc, doc, getDoc, updateDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { useRouter } from "next/navigation";
import { 
  Store, PackagePlus, Trash2, LogOut, 
  LayoutDashboard, Loader2, Flame, Eye, 
  Package, AlertCircle, CheckCircle2, Camera, Image as ImageIcon
} from "lucide-react";
import toast from "react-hot-toast";

export default function PanelComerciante() {
  const [productos, setProductos] = useState<any[]>([]);
  const [nombreTienda, setNombreTienda] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  // Estados del Formulario
  const [nuevoNombre, setNuevoNombre] = useState("");
  const [nuevoPrecio, setNuevoPrecio] = useState("");
  const [nuevaCat, setNuevaCat] = useState("");
  const [imagenFile, setImagenFile] = useState<File | null>(null); // Nuevo estado para la imagen
  const [subiendo, setSubiendo] = useState(false);

  const categorias = [
    "GRANOS Y ESTANTERÍA",
    "CARNES Y PROTEÍNA",
    "FRUTAS Y VERDURAS",
    "LÁCTEOS Y HUEVOS",
    "PANADERÍA Y SNACKS",
    "BEBIDAS",
    "ASEO Y HOGAR",
    "OTROS"
  ];

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser) {
        router.push("/login");
        return;
      }
      setUser(currentUser);

      try {
        const tiendaDoc = await getDoc(doc(db, "tiendas", currentUser.uid));
        if (tiendaDoc.exists()) {
          const data = tiendaDoc.data();
          setNombreTienda(data.nombreNegocio);
          setWhatsapp(data.whatsapp || "3000000000");

          const q = query(collection(db, "productos"), where("nombreTienda", "==", data.nombreNegocio));
          const unsubProds = onSnapshot(q, (snapshot) => {
            setProductos(snapshot.docs.map(d => ({ id: d.id, ...d.data() })));
            setLoading(false);
          });
          return () => unsubProds();
        }
      } catch (error) {
        console.error(error);
        setLoading(false);
      }
    });

    return () => unsubAuth();
  }, [router]);

  const handleAgregar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nuevoNombre || !nuevoPrecio || !nuevaCat) return toast.error("¡Faltan datos!");

    setSubiendo(true);
    let urlImagen = "";

    try {
      // 1. Subir imagen a Storage si el usuario seleccionó una
      if (imagenFile) {
        const storageRef = ref(storage, `productos/${user.uid}_${Date.now()}`);
        await uploadBytes(storageRef, imagenFile);
        urlImagen = await getDownloadURL(storageRef);
      }

      // 2. Guardar en Firestore con la URL de la imagen
      await addDoc(collection(db, "productos"), {
        nombre: nuevoNombre.toUpperCase(),
        precio: Number(nuevoPrecio),
        categoria: nuevaCat,
        imagen: urlImagen, // Campo de imagen real
        nombreTienda: nombreTienda,
        idTienda: user.uid,
        whatsapp: whatsapp,
        clics: 0,
        fecha: new Date().toLocaleString(),
        oferta: false,
        agotado: false
      });

      setNuevoNombre(""); 
      setNuevoPrecio(""); 
      setNuevaCat(""); 
      setImagenFile(null);
      toast.success("Producto agregado al estante");
    } catch (error) {
      console.error(error);
      toast.error("Error al guardar");
    } finally {
      setSubiendo(false);
    }
  };

  const toggleEstado = async (id: string, campo: string, valorActual: boolean) => {
    try {
      await updateDoc(doc(db, "productos", id), { [campo]: !valorActual });
      toast.success("Estado actualizado");
    } catch (error) {
      toast.error("No se pudo actualizar");
    }
  };

  const eliminarProducto = async (id: string) => {
    if (confirm("¿Seguro que quieres eliminar este producto de la tienda?")) {
      await deleteDoc(doc(db, "productos", id));
      toast.error("Producto eliminado");
    }
  };

  if (loading) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#F0F0F0]">
      <Loader2 className="animate-spin text-orange-600 mb-4" size={60} strokeWidth={3} />
      <p className="font-black uppercase italic animate-pulse">Cargando tu inventario...</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#F0F0F0] font-sans text-black pb-20">
      <nav className="bg-white border-b-8 border-black p-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="bg-black p-2 border-4 border-orange-500 shadow-[4px_4px_0px_0px_rgba(255,165,0,1)]">
              <LayoutDashboard size={24} className="text-white" />
            </div>
            <div>
              <h1 className="font-black text-2xl uppercase italic tracking-tighter leading-none">Panel de Control</h1>
              <p className="text-[10px] font-bold bg-orange-500 text-white px-2 inline-block uppercase mt-1">{nombreTienda}</p>
            </div>
          </div>
          <button onClick={() => signOut(auth)} className="bg-white border-4 border-black px-6 py-2 font-black text-xs uppercase flex items-center gap-2 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:bg-red-500 hover:text-white transition-all active:translate-y-1 active:shadow-none">
            <LogOut size={18} strokeWidth={3} /> Salir
          </button>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-8">
        <div className="lg:col-span-4 space-y-8">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-black text-white p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(255,165,0,1)]">
              <Package className="text-orange-500 mb-2" size={32} />
              <p className="text-[10px] font-black uppercase opacity-60 text-white">Productos</p>
              <p className="text-4xl font-black italic">{productos.length}</p>
            </div>
            <div className="bg-white p-6 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] text-black">
              <Flame className="text-orange-600 mb-2" size={32} />
              <p className="text-[10px] font-black uppercase opacity-60">Interés Total</p>
              <p className="text-4xl font-black italic">{productos.reduce((acc, curr) => acc + (curr.clics || 0), 0)}</p>
            </div>
          </div>

          <div className="bg-white border-8 border-black p-8 shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative overflow-hidden text-black">
            <h2 className="text-2xl font-black uppercase italic mb-8 flex items-center gap-3">
              <PackagePlus size={30} className="text-orange-600" /> Cargar Stock
            </h2>
            <form onSubmit={handleAgregar} className="space-y-6">
              
              {/* ÁREA DE CARGA DE IMAGEN */}
              <div className="relative border-4 border-dashed border-black p-4 text-center bg-orange-50 group hover:bg-orange-100 transition-colors">
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={(e) => setImagenFile(e.target.files ? e.target.files[0] : null)}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div className="flex flex-col items-center gap-2">
                  {imagenFile ? (
                    <>
                      <CheckCircle2 className="text-green-600" size={30} />
                      <p className="text-[10px] font-black uppercase truncate w-full">{imagenFile.name}</p>
                    </>
                  ) : (
                    <>
                      <Camera size={30} className="text-black/40 group-hover:text-black" />
                      <p className="text-[10px] font-black uppercase tracking-tighter">Click para subir foto real</p>
                    </>
                  )}
                </div>
              </div>

              <div className="group">
                <label className="text-xs font-black uppercase block mb-2 tracking-widest">Nombre del Producto</label>
                <input value={nuevoNombre} onChange={(e) => setNuevoNombre(e.target.value)} type="text" placeholder="EJ: ARROZ DIANA 1KG" className="w-full p-4 border-4 border-black outline-none focus:bg-orange-50 font-black uppercase" />
              </div>
              <div className="group">
                <label className="text-xs font-black uppercase block mb-2 tracking-widest">Precio de Venta ($)</label>
                <div className="relative">
                  <span className="absolute left-4 top-4 font-black text-xl">$</span>
                  <input value={nuevoPrecio} onChange={(e) => setNuevoPrecio(e.target.value)} type="number" placeholder="0.00" className="w-full p-4 pl-10 border-4 border-black outline-none focus:bg-orange-50 font-black text-xl" />
                </div>
              </div>
              <div className="group">
                <label className="text-xs font-black uppercase block mb-2 tracking-widest">Categoría</label>
                <select value={nuevaCat} onChange={(e) => setNuevaCat(e.target.value)} className="w-full p-4 border-4 border-black outline-none bg-white font-black uppercase appearance-none">
                  <option value="">-- SELECCIONAR --</option>
                  {categorias.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <button disabled={subiendo} className="w-full bg-orange-500 text-white font-black py-5 border-4 border-black shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] hover:bg-black hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all flex items-center justify-center gap-3 text-lg">
                {subiendo ? <Loader2 className="animate-spin" /> : "PUBLICAR AHORA"}
              </button>
            </form>
          </div>
        </div>

        <div className="lg:col-span-8 space-y-6">
          <div className="flex justify-between items-end border-b-8 border-black pb-4 text-black">
            <h2 className="text-4xl font-black uppercase italic tracking-tighter">Mi Inventario</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {productos.length === 0 ? (
              <div className="col-span-full py-20 text-center border-4 border-dashed border-black/20 text-black/20">
                <p className="font-black uppercase text-2xl tracking-tighter">No hay productos publicados</p>
              </div>
            ) : (
              productos.map((p) => (
                <div key={p.id} className={`bg-white border-4 border-black p-5 shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] relative transition-all text-black ${p.agotado ? 'opacity-60' : ''}`}>
                  <div className="flex gap-4">
                    {/* MINIATURA DE LA IMAGEN */}
                    <div className="w-24 h-24 bg-slate-100 border-2 border-black flex-shrink-0 overflow-hidden flex items-center justify-center">
                      {p.imagen ? (
                        <img src={p.imagen} alt={p.nombre} className="w-full h-full object-cover" />
                      ) : (
                        <ImageIcon size={30} className="opacity-20" />
                      )}
                    </div>

                    <div className="flex-grow">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="text-[10px] font-black text-orange-600 uppercase tracking-widest leading-none mb-1">{p.categoria}</p>
                          <h3 className="text-xl font-black uppercase italic leading-none">{p.nombre}</h3>
                        </div>
                        {p.oferta && <Flame size={20} className="text-orange-600" />}
                      </div>
                      <p className="text-2xl font-black italic mt-2">${p.precio.toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 border-t-2 border-black pt-4 mt-4">
                    <button onClick={() => toggleEstado(p.id, 'agotado', p.agotado)} className={`flex-grow py-2 border-2 border-black font-black text-[10px] uppercase transition-all flex items-center justify-center gap-2 ${p.agotado ? 'bg-red-500 text-white' : 'bg-green-400 text-black'}`}>
                      {p.agotado ? 'Agotado' : 'Disponible'}
                    </button>
                    <button onClick={() => toggleEstado(p.id, 'oferta', p.oferta)} className={`px-4 py-2 border-2 border-black font-black text-[10px] uppercase transition-all ${p.oferta ? 'bg-orange-500 text-white' : 'bg-white'}`}>
                      Oferta
                    </button>
                    <button onClick={() => eliminarProducto(p.id)} className="p-2 text-red-600 hover:scale-110 transition-all">
                      <Trash2 size={20} />
                    </button>
                  </div>
                  
                  <div className="mt-4 flex items-center justify-between text-[10px] font-bold opacity-40">
                    <span className="flex items-center gap-1"><Eye size={12}/> {p.clics || 0} clics</span>
                    <span>Agregado: {p.fecha?.split(',')[0]}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
}