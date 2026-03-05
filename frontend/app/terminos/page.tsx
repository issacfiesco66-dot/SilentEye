import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Términos de Servicio — SilentEye',
  description: 'Términos y condiciones de uso de SilentEye, plataforma de seguridad vehicular.',
};

export default function TerminosPage() {
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
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Términos de Servicio</h1>
        <p className="text-zinc-400 text-sm mb-10">Última actualización: 5 de marzo de 2026</p>

        <div className="prose prose-zinc max-w-none text-[15px] leading-relaxed space-y-8">

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">1. Aceptación de los términos</h2>
            <p className="text-zinc-600">
              Al acceder y utilizar la plataforma SilentEye (&quot;el servicio&quot;), aceptas estos términos de servicio
              en su totalidad. Si no estás de acuerdo, no utilices el servicio. El uso continuado de la plataforma
              después de cualquier modificación constituye tu aceptación de los términos actualizados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">2. Descripción del servicio</h2>
            <p className="text-zinc-600 mb-3">
              SilentEye es una plataforma de seguridad vehicular que proporciona:
            </p>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li><strong>Monitoreo GPS en tiempo real</strong> — Recepción y procesamiento de señales de dispositivos GPS vehiculares compatibles (Teltonika, Queclink, Concox, Sinotrack, entre otros).</li>
              <li><strong>Detección automática de eventos</strong> — Identificación de movimiento no autorizado de vehículos estacionados, exceso de velocidad, violación de geocercas y activación de botón de pánico.</li>
              <li><strong>Distribución de alertas</strong> — Notificación automática e inmediata a la red de ayuda cercana (administradores, helpers, conductores) con ubicación en tiempo real.</li>
              <li><strong>Botón SOS ciudadano</strong> — Herramienta de emergencia accesible desde el navegador sin necesidad de instalación.</li>
              <li><strong>Gestión de flotillas</strong> — Panel para propietarios de múltiples vehículos con asignación de conductores, geocercas y límites de velocidad.</li>
              <li><strong>Historial de recorridos</strong> — Consulta de rutas y posiciones históricas de vehículos registrados.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">3. Registro y cuentas</h2>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li>Para utilizar el servicio debes registrarte proporcionando un número de teléfono, correo electrónico o IMEI de dispositivo GPS.</li>
              <li>La autenticación se realiza mediante código OTP (contraseña de un solo uso) enviado a tu teléfono o correo.</li>
              <li>Eres responsable de mantener la confidencialidad de tus códigos de acceso.</li>
              <li>Debes proporcionar información veraz y actualizada.</li>
              <li>Debes ser mayor de 18 años para utilizar el servicio.</li>
              <li>Nos reservamos el derecho de suspender o cancelar cuentas que violen estos términos.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">4. Uso aceptable</h2>
            <p className="text-zinc-600 mb-3">Al usar SilentEye, te comprometes a:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
                <p className="font-semibold text-emerald-800 text-sm mb-2">Uso permitido</p>
                <ul className="text-emerald-700 text-sm space-y-1">
                  <li>- Monitorear vehículos de tu propiedad</li>
                  <li>- Activar alertas de emergencia genuinas</li>
                  <li>- Colaborar como helper en incidentes</li>
                  <li>- Gestionar tu flota de vehículos</li>
                </ul>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="font-semibold text-red-800 text-sm mb-2">Uso prohibido</p>
                <ul className="text-red-700 text-sm space-y-1">
                  <li>- Activar alertas falsas o fraudulentas</li>
                  <li>- Rastrear personas sin su consentimiento</li>
                  <li>- Intentar acceder a datos de otros usuarios</li>
                  <li>- Usar el servicio para actividades ilícitas</li>
                </ul>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">5. Alertas falsas</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <p className="text-amber-800 text-sm font-medium">
                La activación intencional de alertas de pánico falsas es una violación grave de estos términos.
                SilentEye se reserva el derecho de suspender permanentemente la cuenta del usuario que active
                alertas falsas de forma reiterada, y de reportar el incidente a las autoridades competentes.
                Las alertas falsas consumen recursos de la red de ayuda y ponen en riesgo a las personas que realmente necesitan asistencia.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">6. Dispositivos GPS</h2>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li>SilentEye es compatible con dispositivos GPS que soporten protocolos Teltonika, Queclink, Concox/GT06 y similares.</li>
              <li>El usuario es responsable de la correcta instalación y configuración de su dispositivo GPS.</li>
              <li>SilentEye no comercializa, instala ni da mantenimiento a dispositivos GPS.</li>
              <li>La calidad del monitoreo depende de la cobertura celular y GPS del dispositivo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">7. Limitación de responsabilidad</h2>
            <p className="text-zinc-600 mb-3">
              SilentEye es una <strong>herramienta tecnológica de apoyo</strong> a la seguridad vehicular. Es importante que entiendas:
            </p>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li><strong>No somos un servicio de emergencias</strong> — SilentEye no sustituye al 911 ni a ningún servicio de emergencia oficial. Ante una emergencia real, contacta siempre a las autoridades.</li>
              <li><strong>No garantizamos la recuperación de vehículos</strong> — El sistema facilita la coordinación de respuesta, pero la recuperación depende de múltiples factores fuera de nuestro control.</li>
              <li><strong>No somos responsables de actos de terceros</strong> — La actuación de helpers, conductores y otros usuarios de la red es voluntaria e independiente.</li>
              <li><strong>Disponibilidad del servicio</strong> — Hacemos nuestro mejor esfuerzo por mantener el servicio disponible 24/7, pero no garantizamos disponibilidad ininterrumpida. Pueden ocurrir interrupciones por mantenimiento o causas de fuerza mayor.</li>
              <li><strong>Dependencia de conectividad</strong> — El servicio requiere conexión a internet tanto del dispositivo GPS como del usuario. Áreas sin cobertura celular pueden afectar el funcionamiento.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">8. Red de ayuda y helpers</h2>
            <p className="text-zinc-600">
              Los &quot;helpers&quot; son usuarios voluntarios que aceptan recibir notificaciones de emergencia y, opcionalmente,
              acudir a la ubicación de un incidente. SilentEye <strong>no emplea, certifica ni controla</strong> a los helpers.
              Su participación es voluntaria y bajo su propia responsabilidad. SilentEye no es responsable de las
              acciones u omisiones de los helpers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">9. Propiedad intelectual</h2>
            <p className="text-zinc-600">
              Todo el software, diseño, marca, logotipos y contenido de SilentEye son propiedad de Christian Fiesco
              y están protegidos por las leyes de propiedad intelectual aplicables. No se concede ninguna licencia
              sobre el código fuente, algoritmos o tecnología subyacente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">10. Privacidad</h2>
            <p className="text-zinc-600">
              El tratamiento de tus datos personales se rige por nuestra{' '}
              <Link href="/privacidad" className="text-blue-600 hover:underline font-medium">Política de Privacidad</Link>,
              que forma parte integral de estos términos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">11. Terminación</h2>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li>Puedes dejar de usar el servicio en cualquier momento cerrando sesión.</li>
              <li>Puedes solicitar la eliminación de tu cuenta y datos escribiendo a contacto@silenteye.mx.</li>
              <li>SilentEye puede suspender o cancelar tu acceso si violas estos términos, sin previo aviso.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">12. Legislación aplicable</h2>
            <p className="text-zinc-600">
              Estos términos se rigen por las leyes de los Estados Unidos Mexicanos. Cualquier controversia
              será resuelta ante los tribunales competentes de la ciudad de Puebla, Puebla, México,
              renunciando las partes a cualquier otro fuero que pudiera corresponderles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">13. Modificaciones</h2>
            <p className="text-zinc-600">
              Nos reservamos el derecho de modificar estos términos en cualquier momento. Los cambios entrarán
              en vigor al publicarse en esta página. Te recomendamos revisar esta página periódicamente.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">14. Contacto</h2>
            <p className="text-zinc-600">
              Para consultas sobre estos términos: <span className="font-medium text-zinc-800">contacto@silenteye.mx</span>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-zinc-100 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[12px] text-zinc-400">
          <span>SilentEye &copy; {new Date().getFullYear()}</span>
          <div className="flex gap-4">
            <Link href="/privacidad" className="hover:text-zinc-600 transition-colors">Privacidad</Link>
            <Link href="/cookies" className="hover:text-zinc-600 transition-colors">Cookies</Link>
            <Link href="/terminos" className="hover:text-zinc-600 transition-colors font-medium text-zinc-600">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
