'use client'; 
import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase'; 
import { collection, addDoc, onSnapshot, query, deleteDoc, doc } from 'firebase/firestore'; 
import { Trash2, PlusCircle, Store, ArrowLeft, Tag } from 'lucide-react';
import Link from 'next/link';

export default function PaginaComerciante() {
  const [nombre, setNombre] = useState('');
  const [precio, setPrecio] = useState('');
  const [categoria, setCategoria] = useState('Varios'); // Nueva categoría por defecto
  const [misProductos, setMisProductos] = useState<any[]>([]);

  useEffect(() => {
    const q = query(collection(db, "productos"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMisProductos(docs);
    });
    return () => unsubscribe();
  }, []);

  const guardarProducto = async () => {
    if (!nombre || !precio) return alert("Llena todos los campos");
    try {
      await addDoc(collection(db, "productos"), {
        nombre,
        precio: Number(precio),
        categoria, // Guardamos la categoría
        fecha: new Date()
      });
      setNombre(''); setPrecio('');
    } catch (e) { alert("Error al guardar"); }
  };

  const eliminarProducto = async (id: string) => {
    if(confirm("¿Eliminar este producto?")) {
      await deleteDoc(doc(db, "productos", id));
    }
  };

  return (
    <div className="p-6 max-w-md mx-auto font-sans bg-gray-100 min-h-screen border-x-2 border-black">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/"><ArrowLeft className="text-black" /></Link>
        <h1 className="text-2xl font-black text-black uppercase">MI TIENDA</h1>
      </div>

      <div className="bg-white p-6 rounded-3xl shadow-xl mb-8 border-2 border-black">
        <label className="block text-black font-black text-sm mb-1 uppercase">Producto</label>
        <input value={nombre} onChange={(e) => setNombre(e.target.value)} className="w-full p-3 mb-4 border-2 border-gray-300 rounded-xl text-black font-bold" />
        
        <label className="block text-black font-black text-sm mb-1 uppercase">Precio</label>
        <input type="number" value={precio} onChange={(e) => setPrecio(e.target.value)} className="w-full p-3 mb-4 border-2 border-gray-300 rounded-xl text-black font-bold" />

        <label className="block text-black font-black text-sm mb-1 uppercase">Categoría</label>
        <select 
          value={categoria} 
          onChange={(e) => setCategoria(e.target.value)}
          className="w-full p-3 mb-6 border-2 border-gray-300 rounded-xl text-black font-bold bg-white"
        >
          <option value="Varios">Varios</option>
          <option value="Panadería">Panadería</option>
          <option value="Lácteos">Lácteos</option>
          <option value="Frutas/Verduras">Frutas/Verduras</option>
          <option value="Aseo">Aseo</option>
        </select>

        <button onClick={guardarProducto} className="w-full bg-black text-white p-4 rounded-2xl font-black text-lg flex items-center justify-center gap-3">
          <PlusCircle size={24} /> SUBIR AL MAPA
        </button>
      </div>

      <div className="space-y-4">
        <h2 className="text-black font-black text-lg uppercase border-b-2 border-black pb-2">Inventario</h2>
        {misProductos.map((item) => (
          <div key={item.id} className="bg-white p-4 rounded-2xl flex justify-between items-center border-2 border-gray-200">
            <div>
              <p className="font-black text-black uppercase">{item.nombre}</p>
              <p className="text-green-700 font-black text-lg">${item.precio}</p>
              <span className="text-[10px] bg-gray-200 px-2 py-0.5 rounded font-bold text-black uppercase">{item.categoria}</span>
            </div>
            <button onClick={() => eliminarProducto(item.id)} className="bg-red-100 text-red-600 p-3 rounded-xl">
              <Trash2 size={24} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}