import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidad — SilentEye',
  description: 'Política de privacidad de SilentEye, plataforma de seguridad vehicular.',
};

export default function PrivacidadPage() {
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
        <h1 className="text-3xl font-extrabold tracking-tight mb-2">Política de Privacidad</h1>
        <p className="text-zinc-400 text-sm mb-10">Última actualización: 5 de marzo de 2026</p>

        <div className="prose prose-zinc max-w-none text-[15px] leading-relaxed space-y-8">

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">1. Responsable del tratamiento</h2>
            <p className="text-zinc-600">
              <strong>SilentEye</strong> es una plataforma de seguridad vehicular operada por Christian Fiesco
              (en adelante &quot;SilentEye&quot;, &quot;nosotros&quot; o &quot;la plataforma&quot;). Domicilio en Puebla, México.
              Contacto: <span className="font-medium text-zinc-800">contacto@silenteye.mx</span>.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">2. Datos que recopilamos</h2>
            <p className="text-zinc-600 mb-3">Recopilamos únicamente los datos necesarios para operar el servicio de seguridad vehicular:</p>
            <div className="bg-zinc-50 border border-zinc-200 rounded-xl p-5 space-y-3">
              <div>
                <p className="font-semibold text-zinc-800 text-sm">Datos de identificación</p>
                <p className="text-zinc-500 text-sm">Nombre, número de teléfono y/o correo electrónico proporcionados al registrarte.</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-800 text-sm">Datos de geolocalización</p>
                <p className="text-zinc-500 text-sm">Ubicación GPS de los dispositivos vehiculares registrados (latitud, longitud, velocidad, altitud, rumbo). Ubicación del navegador solo cuando activas el botón SOS o cuando operas como helper/conductor en un incidente activo.</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-800 text-sm">Datos del dispositivo GPS</p>
                <p className="text-zinc-500 text-sm">Número IMEI del dispositivo GPS vehicular, datos de telemetría (ignición, voltaje, satélites).</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-800 text-sm">Datos de sesión</p>
                <p className="text-zinc-500 text-sm">Token de autenticación JWT almacenado localmente para mantener tu sesión activa.</p>
              </div>
              <div>
                <p className="font-semibold text-zinc-800 text-sm">Suscripciones push</p>
                <p className="text-zinc-500 text-sm">Datos técnicos de suscripción a notificaciones push (endpoint, claves criptográficas) si decides activarlas.</p>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">3. Finalidad del tratamiento</h2>
            <p className="text-zinc-600 mb-3">Tus datos se utilizan exclusivamente para:</p>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li><strong>Monitoreo vehicular en tiempo real</strong> — Rastreo GPS continuo de vehículos registrados para detectar movimiento no autorizado, exceso de velocidad y violación de geocercas.</li>
              <li><strong>Alertas de emergencia</strong> — Distribución automática de alertas de pánico con ubicación en vivo a la red de ayuda cercana.</li>
              <li><strong>Coordinación de respuesta</strong> — Facilitar que helpers y conductores cercanos acudan a la ubicación de una emergencia.</li>
              <li><strong>Detección de robo</strong> — Identificar cuando un vehículo estacionado se mueve sin autorización y generar alertas automáticas.</li>
              <li><strong>Historial de recorridos</strong> — Consulta de rutas y posiciones históricas de vehículos por sus propietarios.</li>
              <li><strong>Notificaciones</strong> — Envío de alertas push sobre eventos de seguridad de tus vehículos.</li>
              <li><strong>Autenticación</strong> — Verificación de identidad mediante código OTP enviado a tu teléfono o correo.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">4. Base legal</h2>
            <p className="text-zinc-600">
              El tratamiento de tus datos se fundamenta en: (a) tu <strong>consentimiento</strong> al registrarte y aceptar estos términos;
              (b) la <strong>ejecución del servicio</strong> de seguridad vehicular que solicitas; y (c) el <strong>interés legítimo</strong> de
              proteger la seguridad de personas y vehículos en situaciones de emergencia, conforme a la Ley Federal de Protección de
              Datos Personales en Posesión de los Particulares (LFPDPPP) de México.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">5. Geolocalización y privacidad</h2>
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mb-3">
              <p className="text-amber-800 text-sm font-medium">
                Tu ubicación personal (del navegador) solo se recopila cuando TÚ lo autorizas expresamente:
                al presionar el botón SOS o al operar como helper/conductor en un incidente activo.
                No rastreamos tu ubicación personal de forma continua ni en segundo plano.
              </p>
            </div>
            <p className="text-zinc-600">
              La ubicación de los <strong>dispositivos GPS vehiculares</strong> se monitorea de forma continua mientras el dispositivo
              está encendido, ya que esta es la funcionalidad central del servicio de seguridad. Esta información es accesible
              únicamente por el propietario del vehículo, los conductores asignados y los administradores del sistema.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">6. Compartición de datos</h2>
            <p className="text-zinc-600 mb-3"><strong>No vendemos ni compartimos tus datos con terceros</strong> para fines comerciales o publicitarios. Tus datos solo se comparten en los siguientes escenarios:</p>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li><strong>Durante una emergencia</strong> — La ubicación del vehículo en pánico se comparte con helpers y conductores cercanos para facilitar la respuesta.</li>
              <li><strong>Con tu propietario de flota</strong> — Si eres conductor asignado a un vehículo de flota, el propietario puede ver la ubicación y recorridos de su vehículo.</li>
              <li><strong>Por requerimiento legal</strong> — Si una autoridad competente lo solicita mediante orden judicial u oficio fundado y motivado.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">7. Almacenamiento y seguridad</h2>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li>Los datos se almacenan en servidores seguros con cifrado en tránsito (HTTPS/TLS) y en reposo.</li>
              <li>La autenticación usa tokens JWT firmados con clave de al menos 256 bits.</li>
              <li>Los códigos OTP expiran en 10 minutos y se eliminan automáticamente después de 1 hora.</li>
              <li>Se aplica protección contra fuerza bruta en los intentos de verificación OTP.</li>
              <li>Las contraseñas nunca se almacenan — el sistema usa autenticación sin contraseña (OTP).</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">8. Retención de datos</h2>
            <ul className="list-disc pl-5 text-zinc-600 space-y-1.5">
              <li><strong>Datos GPS</strong> — Los registros de posición se conservan para consulta de historial de recorridos. Puedes solicitar su eliminación.</li>
              <li><strong>Incidentes</strong> — Los registros de incidentes se conservan como evidencia de seguridad.</li>
              <li><strong>Datos de cuenta</strong> — Se conservan mientras tu cuenta esté activa. Puedes solicitar la eliminación de tu cuenta en cualquier momento.</li>
              <li><strong>Códigos OTP</strong> — Se eliminan automáticamente después de 1 hora de su expiración.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">9. Tus derechos ARCO</h2>
            <p className="text-zinc-600 mb-3">Conforme a la LFPDPPP, tienes derecho a:</p>
            <div className="grid sm:grid-cols-2 gap-3">
              {[
                { letter: 'A', title: 'Acceso', desc: 'Conocer qué datos personales tenemos sobre ti.' },
                { letter: 'R', title: 'Rectificación', desc: 'Corregir datos inexactos o incompletos.' },
                { letter: 'C', title: 'Cancelación', desc: 'Solicitar la eliminación de tus datos.' },
                { letter: 'O', title: 'Oposición', desc: 'Oponerte al tratamiento de tus datos para fines específicos.' },
              ].map((r) => (
                <div key={r.letter} className="bg-zinc-50 border border-zinc-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="w-6 h-6 rounded bg-zinc-900 text-white text-xs font-bold flex items-center justify-center">{r.letter}</span>
                    <span className="font-semibold text-zinc-800 text-sm">{r.title}</span>
                  </div>
                  <p className="text-zinc-500 text-sm">{r.desc}</p>
                </div>
              ))}
            </div>
            <p className="text-zinc-600 mt-3">
              Para ejercer estos derechos, escribe a <span className="font-medium text-zinc-800">contacto@silenteye.mx</span> con
              el asunto &quot;Derechos ARCO&quot;. Responderemos en un plazo máximo de 20 días hábiles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">10. Cookies</h2>
            <p className="text-zinc-600">
              SilentEye utiliza cookies estrictamente necesarias para el funcionamiento del servicio.
              No utilizamos cookies de rastreo, publicidad ni analítica de terceros.
              Consulta nuestra <Link href="/cookies" className="text-blue-600 hover:underline font-medium">Política de Cookies</Link> para más detalles.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">11. Menores de edad</h2>
            <p className="text-zinc-600">
              SilentEye no está dirigido a menores de 18 años. No recopilamos intencionalmente datos de menores.
              Si detectamos que un menor se ha registrado, eliminaremos su cuenta y datos asociados.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">12. Cambios a esta política</h2>
            <p className="text-zinc-600">
              Nos reservamos el derecho de actualizar esta política. Cualquier cambio significativo será notificado
              mediante la plataforma. La fecha de última actualización se indica al inicio de este documento.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-zinc-900 mb-3">13. Contacto</h2>
            <p className="text-zinc-600">
              Si tienes dudas sobre esta política de privacidad o sobre el tratamiento de tus datos, contacta a:<br />
              <span className="font-medium text-zinc-800">contacto@silenteye.mx</span>
            </p>
          </section>

        </div>
      </main>

      <footer className="border-t border-zinc-100 px-6 py-8">
        <div className="max-w-4xl mx-auto flex flex-wrap items-center justify-between gap-4 text-[12px] text-zinc-400">
          <span>SilentEye &copy; {new Date().getFullYear()}</span>
          <div className="flex gap-4">
            <Link href="/privacidad" className="hover:text-zinc-600 transition-colors font-medium text-zinc-600">Privacidad</Link>
            <Link href="/cookies" className="hover:text-zinc-600 transition-colors">Cookies</Link>
            <Link href="/terminos" className="hover:text-zinc-600 transition-colors">Términos</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
