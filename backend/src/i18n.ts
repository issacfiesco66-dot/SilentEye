/**
 * Backend i18n — bilingual error messages (es/en)
 * Reads Accept-Language header to pick locale.
 */
import type { Request } from 'express';

type Locale = 'es' | 'en';

const messages = {
  // ── Auth / Rate Limiting ──
  tooManyAuth:        { es: 'Demasiados intentos de autenticación. Intenta en 15 minutos.', en: 'Too many authentication attempts. Try again in 15 minutes.' },
  tooManyOtp:         { es: 'Demasiados códigos solicitados. Intenta en 1 hora.', en: 'Too many codes requested. Try again in 1 hour.' },
  tooManyAlerts:      { es: 'Demasiadas alertas. Espera 1 minuto.', en: 'Too many alerts. Wait 1 minute.' },
  tooManyLocUpdates:  { es: 'Demasiadas actualizaciones de ubicación', en: 'Too many location updates' },
  tooManyIngest:      { es: 'Demasiadas solicitudes de ingesta', en: 'Too many ingest requests' },
  tooManyAttempts:    { es: 'Demasiados intentos. Solicita un nuevo código.', en: 'Too many attempts. Request a new code.' },
  unauthorized:       { es: 'No autorizado', en: 'Unauthorized' },
  accessDenied:       { es: 'Acceso denegado', en: 'Access denied' },
  accountDisabled:    { es: 'Cuenta desactivada. Contacta al administrador.', en: 'Account disabled. Contact the administrator.' },

  // ── Validation ──
  phoneRequired:      { es: 'phone requerido (formato válido, máx 20 caracteres)', en: 'Phone required (valid format, max 20 characters)' },
  phoneAndNameReq:    { es: 'Teléfono y nombre requeridos', en: 'Phone and name required' },
  invalidPhone:       { es: 'Teléfono inválido', en: 'Invalid phone number' },
  invalidPhoneMax:    { es: 'Teléfono inválido (máx 20 caracteres)', en: 'Invalid phone (max 20 characters)' },
  invalidPhoneFormat: { es: 'Teléfono inválido. Usa formato: +52 222 123 4567', en: 'Invalid phone. Use format: +1 555 123 4567' },
  invalidEmail:       { es: 'Email inválido', en: 'Invalid email' },
  invalidEmailFormat: { es: 'Email inválido. Ingresa un correo real, ej: tu@correo.com', en: 'Invalid email. Enter a real email, e.g. you@email.com' },
  invalidImei:        { es: 'IMEI inválido (15 dígitos)', en: 'Invalid IMEI (15 digits)' },
  invalidImeiFormat:  { es: 'IMEI inválido. Debe ser 15 dígitos numéricos.', en: 'Invalid IMEI. Must be 15 numeric digits.' },
  codeRequired:       { es: 'Código requerido', en: 'Code required' },
  invalidCode:        { es: 'Código inválido o expirado', en: 'Invalid or expired code' },
  emailPassRequired:  { es: 'Email y contraseña requeridos', en: 'Email and password required' },
  wrongCredentials:   { es: 'Email o contraseña incorrectos', en: 'Incorrect email or password' },
  identifierRequired: { es: 'Ingresa el número de GPS (IMEI), teléfono o email', en: 'Enter GPS number (IMEI), phone, or email' },
  verifyIdentifier:   { es: 'Ingresa IMEI, teléfono o email', en: 'Enter IMEI, phone, or email' },
  nameRequired:       { es: 'Tu nombre es requerido para registrarte (mín. 2 caracteres)', en: 'Your name is required to sign up (min. 2 characters)' },
  nameMax:            { es: 'Nombre máximo 100 caracteres', en: 'Name max 100 characters' },
  nameReqMax:         { es: 'Nombre requerido (máx. 100 caracteres)', en: 'Name required (max 100 characters)' },
  emailMax:           { es: 'Email máximo 255 caracteres', en: 'Email max 255 characters' },
  plateMax:           { es: 'Placa máximo 20 caracteres', en: 'Plate max 20 characters' },
  plateImeiRequired:  { es: 'Placa e IMEI requeridos', en: 'Plate and IMEI required' },
  coordsRequired:     { es: 'Coordenadas requeridas', en: 'Coordinates required' },
  latLonRequired:     { es: 'Latitud (-90..90) y longitud (-180..180) requeridas', en: 'Latitude (-90..90) and longitude (-180..180) required' },
  latLonRequired2:    { es: 'latitude (-90..90) y longitude (-180..180) requeridos', en: 'latitude (-90..90) and longitude (-180..180) required' },
  gpsLocRequired:     { es: 'Ubicación GPS requerida (latitude, longitude)', en: 'GPS location required (latitude, longitude)' },
  vehicleIdRequired:  { es: 'vehicle_id requerido', en: 'vehicle_id required' },
  updateFieldRequired:{ es: 'Indica name, phone o email para actualizar', en: 'Provide name, phone, or email to update' },
  invalidRole:        { es: 'Rol inválido', en: 'Invalid role' },
  slugInvalid:        { es: 'Slug inválido', en: 'Invalid slug' },

  // ── GPS / Vehicle ──
  gpsNotRegistered:   { es: 'GPS no registrado. Contacta al administrador.', en: 'GPS not registered. Contact the administrator.' },
  gpsNoDriver:        { es: 'GPS sin conductor asignado. Contacta al administrador.', en: 'GPS has no assigned driver. Contact the administrator.' },
  gpsNotRegOrDriver:  { es: 'GPS no registrado o sin conductor', en: 'GPS not registered or no driver assigned' },
  vehicleNotFound:    { es: 'Vehículo no encontrado', en: 'Vehicle not found' },
  imeiOrPlateExists:  { es: 'Ese IMEI o placa ya existe. Usa otro.', en: 'That IMEI or plate already exists. Use another.' },
  onlyOwnVehiclesEdit:{ es: 'Solo puedes editar tus propios vehículos', en: 'You can only edit your own vehicles' },
  onlyOwnVehiclesDel: { es: 'Solo puedes eliminar tus propios vehículos', en: 'You can only delete your own vehicles' },
  onlyOwnVehiclesMgr: { es: 'Solo puedes gestionar tus propios vehículos', en: 'You can only manage your own vehicles' },
  onlyDriverOwnerPark:{ es: 'Solo el conductor asignado, el dueño o un admin puede estacionar este vehículo', en: 'Only the assigned driver, owner, or admin can park this vehicle' },
  onlyDriverOwnerUnpark:{ es: 'Solo el conductor asignado, el dueño o un admin puede desestacionar este vehículo', en: 'Only the assigned driver, owner, or admin can unpark this vehicle' },
  phoneNotRegistered: { es: 'Número no registrado. Solo usuarios registrados por el administrador pueden ingresar.', en: 'Number not registered. Only users registered by the administrator can sign in.' },
  phoneNotRegContact: { es: 'Número no registrado. Contacta al administrador.', en: 'Number not registered. Contact the administrator.' },
  phoneDuplicate:     { es: 'Ya existe un usuario con ese teléfono', en: 'A user with that phone already exists' },
  phoneDuplicate2:    { es: 'Ya existe otro usuario con ese teléfono', en: 'Another user with that phone already exists' },

  // ── Geofences ──
  geofenceNotFound:   { es: 'Geocerca no encontrada', en: 'Geofence not found' },

  // ── Incidents ──
  incidentNotFound:   { es: 'Incidente no encontrado', en: 'Incident not found' },
  adminOnlyStatus:    { es: 'Solo un administrador puede marcar ese estado', en: 'Only an administrator can set that status' },

  // ── Users ──
  userNotFound:       { es: 'Usuario no encontrado', en: 'User not found' },
  cannotBlockSelf:    { es: 'No puedes bloquearte a ti mismo', en: 'You cannot block yourself' },
  cannotBlockLastAdmin:{ es: 'No puedes bloquear al único administrador activo', en: 'You cannot block the only active administrator' },
  cannotDeleteSelf:   { es: 'No puedes eliminarte a ti mismo', en: 'You cannot delete yourself' },

  // ── Alerts ──
  alertNotFound:      { es: 'Alerta no encontrada', en: 'Alert not found' },

  // ── Logs / Access ──
  logsAccessDenied:   { es: 'Acceso denegado a logs de este vehículo', en: 'Access denied to this vehicle\'s logs' },
  logsAccessIncident: { es: 'Acceso denegado: solo puede ver logs de vehículos en incidentes que sigue', en: 'Access denied: you can only view logs for vehicles in incidents you follow' },

  // ── Services ──
  emailSendFail:      { es: 'No se pudo enviar el correo. Verifica el email del conductor.', en: 'Could not send email. Check the driver\'s email address.' },
  emailSendFail2:     { es: 'No se pudo enviar el correo. Verifica tu email e intenta de nuevo.', en: 'Could not send email. Check your email and try again.' },
  emailNotConfigured: { es: 'Servicio de verificación por email no disponible. Intenta más tarde.', en: 'Email verification service unavailable. Try again later.' },
  emailServiceDown:   { es: 'Servicio de email no configurado', en: 'Email service not configured' },
  pushNotConfigured:  { es: 'Push notifications no configuradas', en: 'Push notifications not configured' },
  invalidSubscription:{ es: 'Subscription inválida', en: 'Invalid subscription' },
  endpointRequired:   { es: 'Endpoint requerido', en: 'Endpoint required' },
  serviceNotConfigured:{ es: 'Servicio no configurado', en: 'Service not configured' },
  invalidToken:       { es: 'Token inválido', en: 'Invalid token' },

  // ── Internal errors ──
  internalError:      { es: 'Error interno', en: 'Internal error' },
  otpGenError:        { es: 'Error al generar OTP', en: 'Error generating OTP' },
  otpVerifyError:     { es: 'Error al verificar OTP', en: 'Error verifying OTP' },
  loginError:         { es: 'Error al iniciar sesión', en: 'Error signing in' },
  userFetchError:     { es: 'Error al obtener usuario', en: 'Error fetching user' },
  savePushError:      { es: 'Error al guardar subscription', en: 'Error saving subscription' },
  removePushError:    { es: 'Error al eliminar subscription', en: 'Error removing subscription' },
  deleteUserError:    { es: 'Error al eliminar usuario', en: 'Error deleting user' },

  // ── Prospectos / Ingest ──
  razonSocialRequired:{ es: 'razonSocial requerida (mín. 2 caracteres)', en: 'Business name required (min. 2 characters)' },
  prospectNotFound:   { es: 'Prospecto no encontrado', en: 'Prospect not found' },
  prospectRegError:   { es: 'Error al registrar prospecto', en: 'Error registering prospect' },
  prospectUpdateReq:  { es: 'Indica statusSeguridad o notas para actualizar', en: 'Provide statusSeguridad or notes to update' },
  prospectUpdateError:{ es: 'Error al actualizar prospecto', en: 'Error updating prospect' },
  prospectDeleteError:{ es: 'Error al eliminar prospecto', en: 'Error deleting prospect' },
  prospectFetchError: { es: 'Error al obtener prospectos', en: 'Error fetching prospects' },
  searchMinChars:     { es: 'Proporciona una búsqueda válida (mín. 3 caracteres)', en: 'Provide a valid search (min. 3 characters)' },
  serpApiNotConfigured:{ es: 'SERPAPI_KEY no configurado. Configúralo en las variables de entorno.', en: 'SERPAPI_KEY not configured. Set it in environment variables.' },
  googleMapsError:    { es: 'Error al buscar en Google Maps', en: 'Error searching Google Maps' },
  internalSearchError:{ es: 'Error interno al buscar', en: 'Internal search error' },
  prospectArrayReq:   { es: 'Envía un array de prospectos', en: 'Send an array of prospects' },
  prospectMaxBatch:   { es: 'Máximo 50 prospectos por lote', en: 'Maximum 50 prospects per batch' },
  prospectIngestError:{ es: 'Error al ingestar prospectos', en: 'Error ingesting prospects' },

  // ── Setup (admin only, keep bilingual anyway) ──
  setupDisabled:      { es: 'Endpoint deshabilitado en producción. Usa fly ssh console.', en: 'Endpoint disabled in production. Use fly ssh console.' },
  secretInvalid:      { es: 'Secret inválido. Define MIGRATE_SECRET en Fly Secrets.', en: 'Invalid secret. Set MIGRATE_SECRET in Fly Secrets.' },
  secretInvalidShort: { es: 'Secret inválido.', en: 'Invalid secret.' },
} as const;

export type MsgKey = keyof typeof messages;

/** Extract locale from request Accept-Language header */
export function getLocale(req: Request): Locale {
  const header = req.headers['accept-language'] || '';
  if (/^en/i.test(header) || header.includes('en-US') || header.includes('en-GB')) return 'en';
  return 'es';
}

/** Translate an error message key based on request locale */
export function t(req: Request, key: MsgKey): string {
  const locale = getLocale(req);
  return messages[key][locale];
}
