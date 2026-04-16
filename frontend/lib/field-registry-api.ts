/**
 * SilentEye — Field Registry API client.
 *
 * Thin typed wrapper around the /api/teams, /api/field-reports,
 * /api/missing-persons and /api/profile-matches endpoints introduced
 * in Phase 2. Uses the global fetch-credentials patch, so callers do
 * not need to attach any Authorization header — the HttpOnly cookie
 * rides along automatically for same-origin /api/* requests.
 *
 * All functions throw on non-2xx responses with the backend's error
 * message. Callers should wrap in try/catch.
 */

// ── Enum types (kept in sync with backend/src/services/field-registry-service.ts) ──

export type FieldReportCategory =
  | 'remains'
  | 'clothing'
  | 'credentials'
  | 'personal_objects'
  | 'soil_disturbance'
  | 'other';

export type FieldReportStatus =
  | 'pending'
  | 'notified_authority'
  | 'processed_by_authority'
  | 'closed';

export type MissingPersonStatus =
  | 'searching'
  | 'found_deceased'
  | 'found_alive'
  | 'case_closed';

export type ProfileMatchType =
  | 'credential_name'
  | 'physical'
  | 'location_time'
  | 'dna_confirmed'
  | 'other';

export type ProfileMatchConfidence = 'low' | 'medium' | 'high';

export type NotificationChannel =
  | 'phone'
  | 'in_person'
  | 'email_manual'
  | 'via_authority';

// ── Row shapes returned by the API ──

export interface Team {
  id: string;
  name: string;
  description: string | null;
  region: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  members?: Array<{ id: string; name: string | null; role: string; created_at: string }>;
}

export interface FieldReport {
  id: string;
  reporter_user_id: string | null;
  team_id: string | null;
  latitude: number;
  longitude: number;
  accuracy_m: number | null;
  report_date: string;
  category: FieldReportCategory;
  notes: string | null;
  terrain_poi_id: string | null;
  status: FieldReportStatus;
  authority_notified_at: string | null;
  authority_notified_by?: string | null;
  authority_reference: string | null;
  processed_at: string | null;
  processed_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FieldReportMedia {
  id: string;
  field_report_id: string;
  media_type: 'photo' | 'video_frame';
  image_data: string | null; // null when credential + viewer not admin
  mime_type: string;
  is_credential: boolean;
  description: string | null;
  uploaded_by: string | null;
  created_at: string;
  redacted?: boolean;
}

export interface MissingPerson {
  id: string;
  submitter_user_id?: string | null;
  submitted_by_admin_id?: string | null;
  full_name: string;
  aliases: string | null;
  date_of_birth: string | null;
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
  is_public: boolean;
  status: MissingPersonStatus;
  status_updated_at?: string;
  status_notes?: string | null;
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
  family_notified_by?: string | null;
  family_notification_channel?: NotificationChannel | null;
  family_notification_notes?: string | null;
  created_at: string;
}

// ── Fetch helper ──

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  if (!res.ok) {
    let message = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = body.error;
    } catch { /* ignore parse errors */ }
    throw new Error(message);
  }
  return res.json() as Promise<T>;
}

// ── Teams ──

export const teamsApi = {
  list: () => request<Team[]>('/api/teams'),
  get: (id: string) => request<Team>(`/api/teams/${id}`),
  create: (input: {
    name: string;
    description?: string;
    region?: string;
    contact_email?: string;
    contact_phone?: string;
  }) => request<Team>('/api/teams', { method: 'POST', body: JSON.stringify(input) }),
  update: (id: string, input: Partial<Team>) =>
    request<Team>(`/api/teams/${id}`, { method: 'PUT', body: JSON.stringify(input) }),
  assignUser: (userId: string, teamId: string | null) =>
    request<{ id: string; team_id: string | null }>(`/api/users/${userId}/team`, {
      method: 'PUT',
      body: JSON.stringify({ team_id: teamId }),
    }),
};

// ── Field reports ──

export const fieldReportsApi = {
  list: (params?: {
    status?: FieldReportStatus;
    category?: FieldReportCategory;
    team_id?: string;
    limit?: number;
  }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set('status', params.status);
    if (params?.category) q.set('category', params.category);
    if (params?.team_id) q.set('team_id', params.team_id);
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return request<FieldReport[]>(`/api/field-reports${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<FieldReport>(`/api/field-reports/${id}`),
  create: (input: {
    latitude: number;
    longitude: number;
    accuracy_m?: number;
    report_date: string;
    category: FieldReportCategory;
    notes?: string;
    terrain_poi_id?: string;
  }) => request<FieldReport>('/api/field-reports', { method: 'POST', body: JSON.stringify(input) }),
  updateStatus: (id: string, input: {
    status: FieldReportStatus;
    authority_reference?: string;
    processed_notes?: string;
  }) => request<Partial<FieldReport>>(`/api/field-reports/${id}/status`, {
    method: 'PUT',
    body: JSON.stringify(input),
  }),
  remove: (id: string) =>
    request<{ ok: boolean }>(`/api/field-reports/${id}`, { method: 'DELETE' }),
  listMedia: (id: string) => request<FieldReportMedia[]>(`/api/field-reports/${id}/media`),
  uploadMedia: (id: string, input: {
    image_data: string;
    is_credential: boolean;
    media_type?: 'photo' | 'video_frame';
    mime_type?: string;
    description?: string;
  }) => request<FieldReportMedia>(`/api/field-reports/${id}/media`, {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  removeMedia: (reportId: string, mediaId: string) =>
    request<{ ok: boolean }>(`/api/field-reports/${reportId}/media/${mediaId}`, {
      method: 'DELETE',
    }),
};

// ── Missing persons ──

export const missingPersonsApi = {
  list: (params?: { q?: string; status?: MissingPersonStatus; limit?: number }) => {
    const qp = new URLSearchParams();
    if (params?.q) qp.set('q', params.q);
    if (params?.status) qp.set('status', params.status);
    if (params?.limit) qp.set('limit', String(params.limit));
    const qs = qp.toString();
    return request<MissingPerson[]>(`/api/missing-persons${qs ? `?${qs}` : ''}`);
  },
  get: (id: string) => request<MissingPerson>(`/api/missing-persons/${id}`),
  create: (input: Partial<MissingPerson> & { full_name: string }) =>
    request<MissingPerson>('/api/missing-persons', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
  update: (id: string, input: Partial<MissingPerson>) =>
    request<MissingPerson>(`/api/missing-persons/${id}`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
  updateStatus: (id: string, input: { status: MissingPersonStatus; status_notes?: string }) =>
    request<MissingPerson>(`/api/missing-persons/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(input),
    }),
};

// ── Profile matches ──

export const profileMatchesApi = {
  list: (params?: { field_report_id?: string; missing_person_id?: string; limit?: number }) => {
    const qp = new URLSearchParams();
    if (params?.field_report_id) qp.set('field_report_id', params.field_report_id);
    if (params?.missing_person_id) qp.set('missing_person_id', params.missing_person_id);
    if (params?.limit) qp.set('limit', String(params.limit));
    const qs = qp.toString();
    return request<ProfileMatch[]>(`/api/profile-matches${qs ? `?${qs}` : ''}`);
  },
  create: (input: {
    field_report_id: string;
    missing_person_id: string;
    match_type: ProfileMatchType;
    confidence?: ProfileMatchConfidence;
    notes?: string;
  }) => request<ProfileMatch>('/api/profile-matches', {
    method: 'POST',
    body: JSON.stringify(input),
  }),
  notifyFamily: (matchId: string, input: { channel: NotificationChannel; notes?: string }) =>
    request<{ id: string; family_notified_at: string; family_notification_channel: NotificationChannel }>(
      `/api/profile-matches/${matchId}/notify-family`,
      { method: 'POST', body: JSON.stringify(input) },
    ),
};

// ── Human-friendly labels (ES-MX) ──

export const CATEGORY_LABEL: Record<FieldReportCategory, string> = {
  remains: 'Restos óseos/humanos',
  clothing: 'Ropa/prendas',
  credentials: 'Credenciales/identificación',
  personal_objects: 'Objetos personales',
  soil_disturbance: 'Tierra removida',
  other: 'Otro',
};

export const STATUS_LABEL: Record<FieldReportStatus, string> = {
  pending: 'Pendiente',
  notified_authority: 'Autoridad notificada',
  processed_by_authority: 'Procesado por autoridad',
  closed: 'Cerrado',
};

export const MISSING_STATUS_LABEL: Record<MissingPersonStatus, string> = {
  searching: 'En búsqueda',
  found_deceased: 'Localizado sin vida',
  found_alive: 'Localizado con vida',
  case_closed: 'Caso cerrado',
};

export const MATCH_TYPE_LABEL: Record<ProfileMatchType, string> = {
  credential_name: 'Nombre en credencial',
  physical: 'Descripción física',
  location_time: 'Lugar y fecha',
  dna_confirmed: 'ADN confirmado',
  other: 'Otro',
};

export const CONFIDENCE_LABEL: Record<ProfileMatchConfidence, string> = {
  low: 'Baja',
  medium: 'Media',
  high: 'Alta',
};

export const CHANNEL_LABEL: Record<NotificationChannel, string> = {
  phone: 'Teléfono',
  in_person: 'En persona',
  email_manual: 'Correo personal (enviado manualmente)',
  via_authority: 'Vía fiscalía/autoridad',
};
