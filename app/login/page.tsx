"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase"; // Importamos db para guardar el negocio
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; // Funciones para guardar en la base de datos
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus, LogIn, Store, Tag, LogOut, UserCheck, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  // NUEVOS ESTADOS
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [categoria, setCategoria] = useState("");
  
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userActive, setUserActive] = useState<any>(null);
  const router = useRouter();

  const ADMIN_EMAIL = "admin@localmarket.com";

  // Lista de categorías para el selector
  const categoriasDisponibles = [
    "Restaurante", "Frutería", "Panadería", "Ferretería", 
    "Ropa y Moda", "Mascotas", "Tecnología", "Otro"
  ];

  // CONTROL DE SESIÓN ACTIVA (LO NUEVO)
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserActive(user);
      } else {
        setUserActive(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    await signOut(auth);
    setUserActive(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError("");

    try {
      if (isRegistering) {
        // 1. Crear el usuario en Firebase Auth
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Guardar los datos del negocio en Firestore vinculados al UID del usuario
        await setDoc(doc(db, "tiendas", user.uid), {
          nombreNegocio: nombreNegocio,
          categoria: categoria,
          email: email,
          fechaRegistro: new Date().toISOString(),
          rol: "tendero"
        });

        alert("¡Cuenta y tienda creadas con éxito!");
        router.push("/comerciante");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        
        if (email === ADMIN_EMAIL) {
          router.push("/admin-panel");
        } else {
          router.push("/comerciante");
        }
      }
    } catch (err: any) {
      console.error(err.code);
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya tiene una cuenta activa.");
      } else {
        setError("Error: Revisa tus datos e intenta de nuevo.");
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Loader2 className="animate-spin text-orange-600" size={50} />
    </div>
  );

  // VISTA DE SESIÓN ACTIVA PARA CERRAR SISTEMA
  if (userActive) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
        <div className="w-full max-w-sm bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          <UserCheck size={50} className="mx-auto mb-4 text-green-600" />
          <h2 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">Sesión Activa</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-8">Estás dentro como: <span className="text-black">{userActive.email}</span></p>
          <div className="space-y-4">
            <button onClick={() => userActive.email === ADMIN_EMAIL ? router.push("/admin-panel") : router.push("/comerciante")} className="w-full bg-orange-500 text-white font-black py-4 uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all">Ir a mi Panel</button>
            <button onClick={handleLogout} className="w-full bg-black text-white font-black py-4 uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 active:translate-y-1 transition-all">
              <LogOut size={20} /> Cerrar Sistema
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
      <div className="w-full max-w-sm mb-6">
        <Link href="/" className="flex items-center text-black font-bold gap-2 hover:text-orange-600 transition-colors">
          <ArrowLeft size={20} /> Volver al Inicio
        </Link>
      </div>

      <h1 className="text-3xl font-black mb-2 uppercase italic tracking-tighter">
        {isRegistering ? "Registro de Tienda" : "Ingreso Tendero"}
      </h1>
      <p className="mb-8 text-xs font-bold text-gray-500 uppercase text-center">
        {isRegistering ? "Únete a la red de comercio de Cali" : "Gestiona tu inventario"}
      </p>

      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-sm bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
      >
        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 mb-4 font-bold text-sm">
            {error}
          </div>
        )}

        {isRegistering && (
          <>
            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase mb-1 flex items-center gap-1">
                <Store size={14} /> Nombre del Negocio
              </label>
              <input type="text" placeholder="Ej: Tienda de Don Chucho" onChange={(e) => setNombreNegocio(e.target.value)} className="w-full p-3 border-2 border-black rounded-none outline-none focus:bg-orange-50 transition-colors" required={isRegistering} />
            </div>

            <div className="mb-4">
              <label className="block text-[10px] font-black uppercase mb-1 flex items-center gap-1">
                <Tag size={14} /> Categoría de Productos
              </label>
              <select onChange={(e) => setCategoria(e.target.value)} className="w-full p-3 border-2 border-black rounded-none outline-none focus:bg-orange-50 bg-white transition-colors" required={isRegistering}>
                <option value="">Selecciona una...</option>
                {categoriasDisponibles.map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
          </>
        )}

        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-1">Correo Electrónico</label>
          <input type="email" placeholder="ejemplo@correo.com" onChange={(e) => setEmail(e.target.value)} className="w-full p-3 border-2 border-black rounded-none outline-none focus:bg-orange-50 transition-colors" required />
        </div>

        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase mb-1">Contraseña</label>
          <input type="password" placeholder="******" onChange={(e) => setPassword(e.target.value)} className="w-full p-3 border-2 border-black rounded-none outline-none focus:bg-orange-50 transition-colors" required />
        </div>

        <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 uppercase border-2 border-black hover:bg-orange-600 transition-all active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
          {isRegistering ? <UserPlus size={20}/> : <LogIn size={20}/>}
          {isRegistering ? "Crear Mi Tienda" : "Entrar a Mi Tienda"}
        </button>

        <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-6 text-xs font-black uppercase text-gray-600 hover:text-orange-600 underline transition-colors">
          {isRegistering ? "¿Ya tienes cuenta? Ingresa aquí" : "¿No tienes cuenta? Regístrate aquí"}
        </button>
      </form>

      <p className="mt-8 text-gray-500 text-[10px] uppercase font-bold tracking-widest text-center">
        LocalMarket Cali - Sistema de Gestión de Roles <br/>
        <span className="text-black">Modo Administrador Habilitado</span>
      </p>
    </div>
  );
}