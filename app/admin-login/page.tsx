"use client";

import { useState, useEffect, useRef } from "react";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter } from "next/navigation";
import { ShieldCheck, Lock, Mail, Loader2, Terminal, ChevronLeft } from "lucide-react";
import toast from "react-hot-toast";

const MatrixSaturadoInteractiva = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mousePos = useRef({ x: -1000, y: -1000 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const handleMouseMove = (e: MouseEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener("mousemove", handleMouseMove);

    const fontSize = 11;
    const columns = Math.floor(canvas.width / fontSize) + 20;
    const drops: number[] = [];

    for (let i = 0; i < columns; i++) {
      drops[i] = Math.random() * -100;
    }

    const draw = () => {
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < drops.length; i++) {
        const text = Math.round(Math.random()).toString();
        const x = i * fontSize;
        const y = drops[i] * fontSize;

        const distance = Math.sqrt(
          Math.pow(x - mousePos.current.x, 2) + Math.pow(y - mousePos.current.y, 2)
        );

        if (distance < 130) {
          ctx.fillStyle = "#ffffff";
          ctx.shadowBlur = 15;
          ctx.shadowColor = "#ffffff";
        } else {
          ctx.fillStyle = "#1e40af";
          ctx.shadowBlur = 0;
        }

        ctx.font = `bold ${fontSize}px monospace`;
        ctx.fillText(text, x, y);

        if (y > canvas.height && Math.random() > 0.985) {
          drops[i] = 0;
        }
        drops[i] += 0.7; 
      }
    };

    const interval = setInterval(draw, 33);
    return () => {
      clearInterval(interval);
      window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 opacity-80" />;
};

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const ADMIN_EMAIL = "admin@localmarket.com";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email !== ADMIN_EMAIL) {
      toast.error("ACCESO RESTRINGIDO: Nodo no autorizado.");
      return;
    }

    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success("ACCESO CONCEDIDO: Bienvenid@ Giancarlo");
      router.push("/admin-panel");
    } catch (error) {
      toast.error("ERROR DE AUTENTICACIÓN: Clave incorrecta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative h-screen w-screen flex items-center justify-center overflow-hidden bg-black font-sans p-4">
      
      <MatrixSaturadoInteractiva />

      {/* BOTÓN VOLVER COMPACTO */}
      <button 
        onClick={() => router.push("/")}
        className="absolute top-6 left-6 z-30 flex items-center gap-2 text-white hover:text-blue-400 transition-all group font-mono text-[10px] tracking-[0.1em] uppercase font-bold"
      >
        <div className="p-1.5 border border-white/30 rounded-lg group-hover:border-blue-400 group-hover:bg-blue-500/10 transition-all shadow-md">
          <ChevronLeft size={16} />
        </div>
        <span>Volver</span>
      </button>

      <div className="absolute inset-0 z-10 bg-black/50"></div>

      <div className="relative z-20 w-full max-w-[380px]">
        {/* TARJETA COMPRIMIDA VERTICALMENTE */}
        <div className="bg-slate-950/90 backdrop-blur-3xl border border-white/10 p-7 md:p-8 rounded-[2rem] shadow-[0_0_60px_rgba(0,0,0,0.8)]">
          
          <div className="flex flex-col items-center mb-6">
            <div className="bg-blue-600 p-3 rounded-2xl shadow-[0_0_20px_rgba(37,99,235,0.5)] text-white mb-3 animate-pulse">
              <ShieldCheck size={36} />
            </div>
            <h1 className="text-2xl font-black text-white uppercase italic tracking-tighter flex items-center gap-2">
              <Terminal size={20} className="text-blue-400" /> MASTER<span className="text-blue-500">CONTROL</span>
            </h1>
            <p className="text-[9px] font-bold text-white/80 uppercase tracking-[0.3em] mt-2">
              Cali Security Node // v3.1
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white uppercase ml-3 tracking-widest opacity-80">Identidad Admin</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-bold text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                  placeholder="ID_MAESTRO@SYSTEM.COM"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] font-black text-white uppercase ml-3 tracking-widest opacity-80">Llave de Cifrado</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={16} />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-black/40 border border-white/10 rounded-xl py-3 pl-11 pr-4 text-white font-bold text-xs focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-700"
                  placeholder="••••••••••••"
                  required
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-4 rounded-xl shadow-lg shadow-blue-900/20 uppercase tracking-widest text-[10px] transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 mt-2"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : "EJECUTAR ACCESO MAESTRO"}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/5">
            <p className="text-center text-[8px] text-white/50 font-mono uppercase tracking-[0.2em] animate-pulse">
              [ SECURE CONNECTION ] // [ ENCRYPTION ACTIVE ]
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}