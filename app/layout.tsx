import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "@/app/globals.css";
// IMPORTAMOS EL TOASTER
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LocalMarket Cali",
  description: "Tu tienda de barrio en un click - Valle del Lili",
  manifest: "/manifest.json",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
        
        {/* CONFIGURACIÓN DE NOTIFICACIONES */}
        <Toaster 
          position="top-right"
          reverseOrder={false}
          toastOptions={{
            // Estilo brutalista por defecto para todas las notificaciones
            style: {
              border: '4px solid black',
              borderRadius: '0px',
              padding: '16px',
              color: '#000',
              fontWeight: '900',
              textTransform: 'uppercase',
              fontSize: '12px',
            },
            success: {
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}