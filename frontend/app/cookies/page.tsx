import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Cookies — Plataforma GPS de Rastreo Vehicular',
  description:
    'Política de cookies de SilentEye. Cookies esenciales utilizadas en nuestra plataforma GPS de rastreo vehicular y monitoreo en tiempo real.',
  alternates: { canonical: 'https://silenteye.mx/cookies' },
};

export default function CookiesPage() {
  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-zinc-100">
        <div className="max-w-4xl mx-auto flex items-center justify-between px-6 h-14">
          <Link href="/" className="flex items-center gap-2">
            <div className="w-7 h-7 bg-zinc-900 rounded-md flex items-center justify-center">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>
            </div>
            <span className="text-sm font-bold tracking-tight">SilentEye</span>
          </Link>
          <Link href="/" className="text-zinc-400 hover:text-zinc-600 text-[13px] font-medium transition-colors">Inicio</Link>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto px-6 py-16">
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Política de Cookies</h1>
        <p className="text-zinc-400 text-sm mb-10">Última actualización: 5 de marzo de 2026</p>

        <div className="prose prose-zinc max-w-none text-[15px] leading-relaxed space-y-8">

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">1. ¿Qué son las cookies?</h2>
            <p className="text-zinc-600">
              Las cookies son pequeños archivos de texto que se almacenan en tu dispositivo (computadora, tablet o teléfono)
              cuando visitas un sitio web. Permiten que el sitio recuerde información sobre tu visita, como tu preferencia
              de idioma o tu sesión de usuario.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">2. Cookies que utilizamos</h2>
            <p className="text-zinc-600 mb-4">
              SilentEye utiliza <strong>únicamente cookies estrictamente necesarias</strong> para el funcionamiento del servicio.
              No utilizamos cookies de rastreo, publicidad, analítica de terceros ni redes sociales.
            </p>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border border-zinc-200 rounded-xl overflow-hidden">
                <thead>
                  <tr className="bg-zinc-50">
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 border-b border-zinc-200">Cookie</th>
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 border-b border-zinc-200">Tipo</th>
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 border-b border-zinc-200">Finalidad</th>
                    <th className="text-left py-3 px-4 font-semibold text-zinc-700 border-b border-zinc-200">Duración</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-800">se_token</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">Esencial</span></td>
                    <td className="py-3 px-4 text-zinc-600">Mantener tu sesión activa. Contiene un token JWT cifrado que identifica tu sesión. Es un respaldo del almacenamiento local.</td>
                    <td className="py-3 px-4 text-zinc-500">30 días</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-800">se_user</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">Esencial</span></td>
                    <td className="py-3 px-4 text-zinc-600">Almacenar datos básicos de tu perfil (nombre, permisos) para cargar el dashboard correctamente. Respaldo del almacenamiento local.</td>
                    <td className="py-3 px-4 text-zinc-500">30 días</td>
                  </tr>
                  <tr>
                    <td className="py-3 px-4 font-mono text-xs text-zinc-800">se_cookie_consent</td>
                    <td className="py-3 px-4"><span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-xs font-medium">Esencial</span></td>
                    <td className="py-3 px-4 text-zinc-600">Recordar que aceptaste el aviso de cookies para no mostrarlo de nuevo.</td>
                    <td className="py-3 px-4 text-zinc-500">365 días</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">3. Almacenamiento local (localStorage)</h2>
            <p className="text-zinc-600 mb-3">
              Además de cookies, SilentEye utiliza el almacenamiento local del navegador (localStorage) para:
            </p>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li><strong>token</strong> — Tu token de sesión JWT (mecanismo principal de sesión).</li>
              <li><strong>user</strong> — Datos básicos de tu perfil para renderizar la interfaz.</li>
              <li><strong>loginAt</strong> — Marca de tiempo de tu último inicio de sesión.</li>
            </ul>
            <p className="text-zinc-600 mt-3">
              Estos datos se eliminan completamente al cerrar sesión.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">4. Cookies de terceros</h2>
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5">
              <p className="text-emerald-800 text-sm font-medium">
                SilentEye NO utiliza cookies de terceros. No hay Google Analytics, Facebook Pixel,
                rastreadores publicitarios ni ningún otro servicio de terceros que deposite cookies en tu navegador.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">5. ¿Cómo gestionar las cookies?</h2>
            <p className="text-zinc-600 mb-3">
              Puedes configurar tu navegador para bloquear o eliminar cookies. Sin embargo, dado que SilentEye
              solo utiliza cookies esenciales, desactivarlas impedirá que el servicio funcione correctamente
              (no podrás mantener tu sesión activa).
            </p>
            <p className="text-zinc-600">
              Para gestionar cookies en tu navegador:
            </p>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1">
              <li><strong>Chrome</strong>: Configuración → Privacidad y seguridad → Cookies</li>
              <li><strong>Firefox</strong>: Configuración → Privacidad y seguridad → Cookies</li>
              <li><strong>Safari</strong>: Preferencias → Privacidad → Cookies</li>
              <li><strong>Edge</strong>: Configuración → Privacidad → Cookies</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">6. Cambios a esta política</h2>
            <p className="text-zinc-600">
              Si modificamos esta política, actualizaremos la fecha de &quot;última actualización&quot; en la parte superior.
              Para cambios significativos, te notificaremos a través de la plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">7. Contacto</h2>
            <p className="text-zinc-600">
              Para consultas sobre nuestra política de cookies: <span className="font-medium text-zinc-800">contacto@silenteye.mx</span>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-zinc-100 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[12px] text-zinc-400">
          <span>SilentEye &copy; {new Date().getFullYear()}</span>
          <div className="flex gap-4">
            <Link href="/privacidad" className="hover:text-zinc-600 transition-colors">Privacidad</Link>
            <Link href="/cookies" className="hover:text-zinc-600 transition-colors font-medium text-zinc-600">Cookies</Link>
            <Link href="/terminos" className="hover:text-zinc-600 transition-colors">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
