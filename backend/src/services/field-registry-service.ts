/**
 * Field registry service — types, helpers, validators.
 *
 * Phase 1 of the field verification registry. This file currently only
 * exports types and constants that match the schema introduced in
 * migration 023_field_registry.sql. Phase 2 will add DB query helpers
 * and business-logic functions (create/update/match/notify).
 *
 * Design summary (see docs/FIELD-REGISTRY.md for the full architecture):
 *
 *   3 tiers, one human always between data and family:
 *
 *     Tier 1  verificador    creates field_reports on the ground
 *     Tier 2  admin          reviews reports, cross-refs with profiles
 *     Tier 3  family          registers missing_persons_profiles
 *
 *   No automatic notification — profile_matches.family_notified_at is
 *   set only when an admin explicitly confirms a human reached out
 *   through an appropriate channel.
 */

// ── Enums (must stay in sync with CHECK constraints in migration 023) ──

export const FIELD_REPORT_CATEGORIES = [
  'remains',            // restos óseos / humanos
  'clothing',           // ropa, prendas
  'credentials',        // INE, licencias, identificaciones
  'personal_objects',   // joyas, mochilas, teléfonos, llaves
  'soil_disturbance',   // tierra removida, sin restos visibles
  'other',
] as const;
export type FieldReportCategory = typeof FIELD_REPORT_CATEGORIES[number];

export const FIELD_REPORT_STATUSES = [
  'pending',                // recién creado, sin notificar autoridad
  'notified_authority',     // fiscalía / CNB / SEMEFO contactada
  'processed_by_authority', // sitio procesado oficialmente
  'closed',                 // cerrado (por autoridad o por el equipo)
] as const;
export type FieldReportStatus = typeof FIELD_REPORT_STATUSES[number];

export const MISSING_PERSON_STATUSES = [
  'searching',       // búsqueda activa
  'found_deceased',  // localizado sin vida
  'found_alive',     // localizado con vida
  'case_closed',     // caso cerrado por la familia sin resolución
] as const;
export type MissingPersonStatus = typeof MISSING_PERSON_STATUSES[number];

export const PROFILE_MATCH_TYPES = [
  'credential_name', // nombre en credencial = perfil
  'physical',        // descripción física coincide
  'location_time',   // lugar+fecha de desaparición alinean con hallazgo
  'dna_confirmed',   // confirmado por ADN forense
  'other',
] as const;
export type ProfileMatchType = typeof PROFILE_MATCH_TYPES[number];

export const PROFILE_MATCH_CONFIDENCES = ['low', 'medium', 'high'] as const;
export type ProfileMatchConfidence = typeof PROFILE_MATCH_CONFIDENCES[number];

export const NOTIFICATION_CHANNELS = [
  'phone',
  'in_person',
  'email_manual',  // admin sent a personal email — NOT automated
  'via_authority', // notified through fiscalía / CNB
] as const;
export type NotificationChannel = typeof NOTIFICATION_CHANNELS[number];

export const FIELD_MEDIA_TYPES = ['photo', 'video_frame'] as const;
export type FieldMediaType = typeof FIELD_MEDIA_TYPES[number];

/**
 * The new role introduced by this feature. 'verificador' members are
 * the people who do the ground verification: go to sites flagged by
 * terrain analysis or by leads, and log what they find.
 *
 * Authorization mapping (enforced by requireRole middleware):
 *   • create field_report:        admin | verificador
 *   • update field_report status: admin | verificador (own team only)
 *   • view credential media:      admin only
 *   • view team's reports:        admin | verificador (same team)
 *   • create missing_profile:     any authenticated user (citizen+)
 *   • edit missing_profile:       admin | the original submitter
 *   • create profile_match:       admin only
 *   • notify family:              admin only (and only via explicit call)
 */
export const FIELD_REGISTRY_ROLES = ['admin', 'verificador'] as const;


// ── Row shapes (as returned from pg queries) ──

export interface Team {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_by: string | null;
  is_active: boolean;
  created_at: string;  // ISO timestamp
  updated_at: string;
}

export interface FieldReport {
  id: string;
  reporter_user_id: string | null;
  team_id: string | null;

  latitude: number;
  longitude: number;
  accuracy_m: number | null;

  report_date: string;  // ISO timestamp
  category: FieldReportCategory;
  notes: string | null;

  terrain_poi_id: string | null;

  status: FieldReportStatus;
  authority_notified_at: string | null;
  authority_notified_by: string | null;
  authority_reference: string | null;
  processed_at: string | null;
  processed_notes: string | null;

  created_at: string;
  updated_at: string;
}

export interface FieldReportMedia {
  id: string;
  field_report_id: string;
  media_type: FieldMediaType;
  image_data: string;      // base64. DO NOT log or include in analytics.
  mime_type: string;
  is_credential: boolean;  // if true, admin-only visibility
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
}

/**
 * FieldReportMedia projection that's safe to ship to non-admin clients:
 * strips image_data when is_credential=true, leaving a placeholder.
 * Use this when serializing media lists for verificador-level access.
 */
export interface FieldReportMediaSafe extends Omit<FieldReportMedia, 'image_data'> {
  image_data: string | null;  // null iff is_credential=true and viewer isn't admin
  redacted: boolean;           // true iff image_data was stripped
}

export interface MissingPersonProfile {
  id: string;
  submitter_user_id: string | null;
  submitted_by_admin_id: string | null;

  full_name: string;
  aliases: string | null;
  date_of_birth: string | null;  // ISO date (YYYY-MM-DD)

  disappearance_date: string | null;
  last_known_latitude: number | null;
  last_known_longitude: number | null;
  last_known_description: string | null;

  physical_description: string | null;
  photo_base64: string | null;

  contact_email: string | null;
  contact_phone: string | null;
  contact_name: string | null;
  contact_relation: string | null;

  status: MissingPersonStatus;
  status_updated_at: string;
  status_updated_by: string | null;
  status_notes: string | null;

  is_public: boolean;
  created_at: string;
  updated_at: string;
}

export interface ProfileMatch {
  id: string;
  field_report_id: string;
  missing_person_id: string;
  matched_by: string | null;

  match_type: ProfileMatchType;
  confidence: ProfileMatchConfidence;
  notes: string | null;

  family_notified_at: string | null;
  family_notified_by: string | null;
  family_notification_channel: NotificationChannel | null;
  family_notification_notes: string | null;

  created_at: string;
}


// ── Input DTOs (what the API accepts from clients) ──

export interface CreateTeamInput {
  name: string;
  description?: string;
  region?: string;
  contact_email?: string;
  contact_phone?: string;
}

export interface CreateFieldReportInput {
  latitude: number;
  longitude: number;
  accuracy_m?: number;
  report_date: string;          // ISO
  category: FieldReportCategory;
  notes?: string;
  terrain_poi_id?: string;
  // team_id is taken from the reporter's user.team_id at creation time;
  // it's not accepted from the client to prevent cross-team assignment.
}

export interface UpdateFieldReportStatusInput {
  status: FieldReportStatus;
  authority_reference?: string;
  processed_notes?: string;
}

export interface AttachFieldReportMediaInput {
  field_report_id: string;
  media_type?: FieldMediaType;         // default 'photo'
  image_data: string;                  // base64, ideally < 1 MB
  mime_type?: string;                  // default 'image/jpeg'
  is_credential: boolean;              // caller must choose consciously
  description?: string;
}

export interface CreateMissingPersonInput {
  full_name: string;
  aliases?: string;
  date_of_birth?: string;
  disappearance_date?: string;
  last_known_latitude?: number;
  last_known_longitude?: number;
  last_known_description?: string;
  physical_description?: string;
  photo_base64?: string;
  contact_email?: string;
  contact_phone?: string;
  contact_name?: string;
  contact_relation?: string;
  is_public?: boolean;  // default true
}

export interface UpdateMissingPersonStatusInput {
  status: MissingPersonStatus;
  status_notes?: string;
}

export interface CreateProfileMatchInput {
  field_report_id: string;
  missing_person_id: string;
  match_type: ProfileMatchType;
  confidence?: ProfileMatchConfidence;  // default 'medium'
  notes?: string;
}

export interface RecordFamilyNotificationInput {
  match_id: string;
  channel: NotificationChannel;
  notes?: string;
}


// ── Validators (pure functions, no DB access) ──

const MAX_NOTES_LEN = 4000;
const MAX_NAME_LEN = 200;

export function isValidFieldReportCategory(v: unknown): v is FieldReportCategory {
  return typeof v === 'string' && (FIELD_REPORT_CATEGORIES as readonly string[]).includes(v);
}

export function isValidFieldReportStatus(v: unknown): v is FieldReportStatus {
  return typeof v === 'string' && (FIELD_REPORT_STATUSES as readonly string[]).includes(v);
}

export function isValidMissingPersonStatus(v: unknown): v is MissingPersonStatus {
  return typeof v === 'string' && (MISSING_PERSON_STATUSES as readonly string[]).includes(v);
}

export function isValidProfileMatchType(v: unknown): v is ProfileMatchType {
  return typeof v === 'string' && (PROFILE_MATCH_TYPES as readonly string[]).includes(v);
}

export function isValidProfileMatchConfidence(v: unknown): v is ProfileMatchConfidence {
  return typeof v === 'string' && (PROFILE_MATCH_CONFIDENCES as readonly string[]).includes(v);
}

export function isValidNotificationChannel(v: unknown): v is NotificationChannel {
  return typeof v === 'string' && (NOTIFICATION_CHANNELS as readonly string[]).includes(v);
}

/**
 * Rules for accepting a coordinate pair from a client. Mirrors
 * isValidCoords in routes.ts but lives here so the field-registry
 * module is self-contained.
 */
export function isValidLatLng(lat: unknown, lng: unknown): lat is number {
  return typeof lat === 'number' && typeof lng === 'number'
    && lat >= -90 && lat <= 90
    && lng >= -180 && lng <= 180
    && Number.isFinite(lat) && Number.isFinite(lng);
}

/**
 * Validate CreateFieldReportInput. Returns null if valid, or an error
 * string describing the first problem found.
 */
export function validateFieldReportInput(input: Partial<CreateFieldReportInput>): string | null {
  if (!isValidLatLng(input.latitude, input.longitude)) {
    return 'Coordenadas inválidas';
  }
  if (!input.report_date || Number.isNaN(Date.parse(input.report_date))) {
    return 'report_date debe ser una fecha ISO válida';
  }
  if (new Date(input.report_date) > new Date()) {
    return 'report_date no puede ser en el futuro';
  }
  if (!isValidFieldReportCategory(input.category)) {
    return `category debe ser uno de: ${FIELD_REPORT_CATEGORIES.join(', ')}`;
  }
  if (input.notes && input.notes.length > MAX_NOTES_LEN) {
    return `notes no puede exceder ${MAX_NOTES_LEN} caracteres`;
  }
  if (input.accuracy_m != null) {
    if (typeof input.accuracy_m !== 'number' || input.accuracy_m < 0 || input.accuracy_m > 10000) {
      return 'accuracy_m debe ser un número entre 0 y 10000';
    }
  }
  return null;
}

/**
 * Validate CreateMissingPersonInput. Minimal requirements: just a name.
 * Everything else is optional but validated for sanity if present.
 */
export function validateMissingPersonInput(input: Partial<CreateMissingPersonInput>): string | null {
  if (!input.full_name || typeof input.full_name !== 'string') {
    return 'full_name es requerido';
  }
  const name = input.full_name.trim();
  if (name.length < 2) return 'full_name debe tener al menos 2 caracteres';
  if (name.length > MAX_NAME_LEN) return `full_name no puede exceder ${MAX_NAME_LEN} caracteres`;

  if (input.disappearance_date && Number.isNaN(Date.parse(input.disappearance_date))) {
    return 'disappearance_date debe ser una fecha válida';
  }
  if (input.date_of_birth && Number.isNaN(Date.parse(input.date_of_birth))) {
    return 'date_of_birth debe ser una fecha válida';
  }

  // If a last-known location is supplied, BOTH coords must be present
  // and valid. We don't allow a half-specified point.
  const hasLat = input.last_known_latitude != null;
  const hasLng = input.last_known_longitude != null;
  if (hasLat !== hasLng) {
    return 'last_known_latitude y last_known_longitude deben proveerse juntas';
  }
  if (hasLat && hasLng && !isValidLatLng(input.last_known_latitude, input.last_known_longitude)) {
    return 'Coordenadas de última ubicación inválidas';
  }

  if (input.contact_email && typeof input.contact_email === 'string') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(input.contact_email.trim())) {
      return 'contact_email no tiene formato válido';
    }
  }

  if (input.physical_description && input.physical_description.length > MAX_NOTES_LEN) {
    return `physical_description no puede exceder ${MAX_NOTES_LEN} caracteres`;
  }

  return null;
}

/**
 * Helper that a media upload handler can use to enforce a size cap on
 * base64 payloads BEFORE hitting the DB. Default cap is ~1 MB of
 * original image data (base64 inflates by ~4/3, so the string is ~1.35MB).
 */
export function isWithinMediaSizeLimit(base64: string, maxBytes = 1_200_000): boolean {
  if (typeof base64 !== 'string') return false;
  // Rough original-size estimate: base64 length * 0.75
  const approxBytes = Math.floor(base64.length * 0.75);
  return approxBytes <= maxBytes;
}

/**
 * Strip credential media from a FieldReportMedia row when the viewer
 * lacks admin privileges. Returns a FieldReportMediaSafe projection.
 */
export function redactCredentialMedia(
  row: FieldReportMedia,
  viewerIsAdmin: boolean,
): FieldReportMediaSafe {
  if (row.is_credential && !viewerIsAdmin) {
    return { ...row, image_data: null, redacted: true };
  }
  return { ...row, redacted: false };
}
