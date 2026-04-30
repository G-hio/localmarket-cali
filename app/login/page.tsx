"use client";

import { useState, useEffect } from "react";
import { auth, db } from "@/lib/firebase"; 
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, onAuthStateChanged, signOut } from "firebase/auth";
import { doc, setDoc } from "firebase/firestore"; 
import { useRouter } from "next/navigation";
import Link from "next/link";
import toast from "react-hot-toast"; // Importamos toast para alertas consistentes
import { ArrowLeft, UserPlus, LogIn, Store, LogOut, UserCheck, Loader2, ShieldAlert } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [nombreNegocio, setNombreNegocio] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  
  const [error, setError] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userActive, setUserActive] = useState<any>(null);
  const router = useRouter();

  const ADMIN_EMAIL = "admin@localmarket.com";

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

    // --- BLOQUEO DE SEGURIDAD PARA ADMIN ---
    if (email.toLowerCase() === ADMIN_EMAIL) {
      toast.error("ACCESO DENEGADO: Use el portal de Administrador Maestro.");
      return;
    }

    try {
      if (isRegistering) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        await setDoc(doc(db, "tiendas", user.uid), {
          nombreNegocio: nombreNegocio,
          email: email,
          whatsapp: whatsapp,
          fechaRegistro: new Date().toISOString(),
          rol: "tendero",
          estado: "activo" 
        });

        toast.success("¡TIENDA CREADA CON ÉXITO!");
        router.push("/comerciante");
      } else {
        await signInWithEmailAndPassword(auth, email, password);
        toast.success("BIENVENIDO TENDERO");
        router.push("/comerciante");
      }
    } catch (err: any) {
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya tiene una cuenta activa.");
      } else {
        setError("Error: Credenciales inválidas.");
      }
    }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <Loader2 className="animate-spin text-orange-600" size={50} />
    </div>
  );

  // VISTA SI YA HAY SESIÓN (Protegida)
  if (userActive) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-screen bg-gray-100 font-sans">
        <div className="w-full max-w-sm bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] text-center">
          {userActive.email === ADMIN_EMAIL ? (
             <ShieldAlert size={50} className="mx-auto mb-4 text-blue-600" />
          ) : (
             <UserCheck size={50} className="mx-auto mb-4 text-green-600" />
          )}
          
          <h2 className="text-2xl font-black uppercase italic mb-2 tracking-tighter">Sesión Activa</h2>
          <p className="text-[10px] font-bold text-gray-500 uppercase mb-8 italic">
            Sesión de: <span className="text-black">{userActive.email}</span>
          </p>
          
          <div className="space-y-4">
            <button 
              onClick={() => userActive.email === ADMIN_EMAIL ? router.push("/admin") : router.push("/comerciante")} 
              className="w-full bg-orange-500 text-white font-black py-4 uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] active:translate-y-1 transition-all"
            >
              Ir a mi Panel de Control
            </button>
            <button onClick={handleLogout} className="w-full bg-black text-white font-black py-4 uppercase border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2 active:translate-y-1 transition-all">
              <LogOut size={20} /> Salir del Sistema
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
          <ArrowLeft size={20} /> VOLVER AL INICIO
        </Link>
      </div>

      <h1 className="text-3xl font-black mb-2 uppercase italic tracking-tighter text-center">
        {isRegistering ? "Unirse a LocalMarket" : "Acceso Tendero"}
      </h1>
      <p className="mb-8 text-xs font-bold text-gray-500 uppercase text-center">
        {isRegistering ? "Crea tu espacio digital en Cali" : "Entra a gestionar tus productos"}
      </p>

      <form 
        onSubmit={handleSubmit} 
        className="w-full max-w-sm bg-white p-8 border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)]"
      >
        {error && (
          <div className="bg-red-100 border-2 border-red-500 text-red-700 p-3 mb-4 font-bold text-[10px] uppercase">
            {error}
          </div>
        )}

        {isRegistering && (
          <div className="mb-4">
            <label className="block text-[10px] font-black uppercase mb-1 flex items-center gap-1 italic">
              <Store size={14} /> Nombre de tu Negocio
            </label>
            <input 
              type="text" 
              placeholder="Ej: MISCELÁNEA DEL LILI" 
              onChange={(e) => setNombreNegocio(e.target.value)} 
              className="w-full p-3 border-2 border-black rounded-none outline-none focus:bg-orange-50 transition-colors font-bold" 
              required={isRegistering} 
            />
          </div>
        )}

        {isRegistering && (
          <div className="mb-4">
            <label className="block text-[10px] font-black uppercase mb-1 flex items-center gap-1 italic">
              <span className="text-green-600">●</span> WhatsApp de Contacto
            </label>
            <input 
            type="tel" 
            placeholder="Ej: 315 123 4567" 
            onChange={(e) => setWhatsapp(e.target.value)} 
            className="w-full p-3 border-2 border-black rounded-none outline-none focus:bg-orange-50 transition-colors font-bold" 
            required={isRegistering} 
          />
        </div>
        )}

        <div className="mb-4">
          <label className="block text-[10px] font-black uppercase mb-1 italic">Email Corporativo</label>
          <input 
            type="email" 
            placeholder="correo@tienda.com" 
            onChange={(e) => setEmail(e.target.value)} 
            className="w-full p-3 border-2 border-black rounded-none outline-none focus:bg-orange-50 transition-colors font-bold" 
            required 
          />
        </div>

        <div className="mb-6">
          <label className="block text-[10px] font-black uppercase mb-1 italic">Clave Personal</label>
          <input 
            type="password" 
            placeholder="••••••••" 
            onChange={(e) => setPassword(e.target.value)} 
            className="w-full p-3 border-2 border-black rounded-none outline-none focus:bg-orange-50 transition-colors" 
            required 
          />
        </div>

        <button type="submit" className="w-full bg-orange-500 text-white font-black py-4 uppercase border-2 border-black hover:bg-orange-600 transition-all active:translate-y-1 active:shadow-none shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] flex items-center justify-center gap-2">
          {isRegistering ? <UserPlus size={20}/> : <LogIn size={20}/>}
          {isRegistering ? "Registrar Mi Comercio" : "Iniciar Sesión"}
        </button>

        <button type="button" onClick={() => setIsRegistering(!isRegistering)} className="w-full mt-6 text-[10px] font-black uppercase text-gray-500 hover:text-orange-600 underline transition-colors tracking-widest text-center">
          {isRegistering ? "Ya tengo tienda registrada" : "No tengo cuenta, quiero registrarme"}
        </button>
      </form>

      <p className="mt-8 text-gray-400 text-[9px] uppercase font-bold tracking-widest text-center opacity-70">
        Control de acceso biométrico / Seguridad LocalMarket <br/>
        <span className="text-black">Cali, Valle del Cauca - 2026</span>
      </p>
    </div>
  );
}