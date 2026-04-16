# Registro de Hallazgos de Campo — Documentación Técnica

## Qué es

Un sistema que permite a los colectivos de búsqueda documentar lo que encuentran en campo después de verificar zonas prioritarias (identificadas por el módulo de Análisis de Terreno u otros medios), y conectar esos hallazgos con perfiles de personas desaparecidas registrados por familiares.

**No es una base de datos pública.** Es una herramienta privada con control de acceso de tres niveles y un humano siempre entre los datos y la familia.

## Arquitectura de tres niveles

```
┌──────────────────────────────────────────────────────────────┐
│  TIER 1 — Verificadores en campo                             │
│  Crean field_reports cuando van a un sitio y documentan      │
│  lo que encuentran (restos, ropa, credenciales, etc.)        │
│                                                              │
│          │ suben fotos, notas, coordenadas                   │
│          ▼                                                   │
│                                                              │
│  TIER 2 — Admins (coordinadores de colectivo)                │
│  Revisan reportes, cruzan manualmente con perfiles de        │
│  familias, deciden cuándo/cómo notificar                     │
│                                                              │
│          │ el humano SIEMPRE decide                          │
│          ▼                                                   │
│                                                              │
│  TIER 3 — Familiares                                         │
│  Registran perfil de su persona desaparecida.                │
│  Nunca reciben notificación automática.                      │
│  Un admin las contacta por teléfono/persona cuando hay       │
│  información relevante.                                      │
└──────────────────────────────────────────────────────────────┘
```

## Por qué tres niveles y no automatización

La intuición obvia es "cruzar nombres automáticamente y enviar email al familiar". Eso es peligroso por cuatro razones:

1. **Dignidad**. Ninguna madre debería enterarse de que encontraron los restos de su hijo por una notificación automática. La noticia más devastadora de su vida debe llegar por un canal humano — representante del colectivo, psicólogo de acompañamiento, ministerio público.

2. **Legalidad**. En México los restos humanos son evidencia forense. La cadena de custodia está regulada por la Ley General en Materia de Desaparición Forzada y las fiscalías estatales. Publicar/transmitir automáticamente información sobre hallazgos puede contaminar investigaciones activas y crear responsabilidad legal.

3. **Seguridad**. Si el crimen organizado descubre que una fosa que ellos cavaron fue encontrada, pueden atacar al equipo de búsqueda o mover otros cuerpos. La base de datos misma se vuelve target de alto valor — hay que minimizar su superficie de exposición.

4. **Falsos positivos**. Los matches basados en nombre son imperfectos. Un "Juan Pérez" en una credencial no necesariamente es "el" Juan Pérez del perfil. Enviar automáticamente a una familia a reconocer restos que no corresponden es traumático y evitable con revisión humana.

## Tablas (migración 023)

### teams
Colectivos de búsqueda. Los admins crean teams y asignan verificadores.
- `id`, `name`, `description`, `region`
- `contact_email`, `contact_phone`
- `created_by`, `is_active`, `created_at`, `updated_at`

Un usuario puede estar en 0 o 1 team (`users.team_id` nullable). Los perfiles de familias y admins no tienen team.

### field_reports
Un reporte por visita de verificación. Contiene qué se encontró, dónde, cuándo.
- Identidad: `reporter_user_id`, `team_id` (snapshot al momento del reporte)
- Ubicación: `latitude`, `longitude`, `geom` (PostGIS), `accuracy_m`
- Contenido: `report_date`, `category`, `notes`
- Origen opcional: `terrain_poi_id` (si el hallazgo fue disparado por análisis satelital)
- Workflow: `status`, `authority_notified_at/by`, `authority_reference`, `processed_at`, `processed_notes`

**Categorías** (CHECK constraint):
- `remains` — restos óseos / humanos
- `clothing` — ropa, prendas
- `credentials` — INE, licencias, identificaciones
- `personal_objects` — joyas, mochilas, teléfonos, llaves
- `soil_disturbance` — tierra removida, sin restos visibles
- `other`

**Ciclo de vida del status**:
```
pending → notified_authority → processed_by_authority → closed
```

### field_report_media
Fotos adjuntas a reportes. Base64 en columna TEXT (mismo patrón que `incident_media`). **Nota crítica**: la columna `is_credential` es la puerta de acceso — cuando `is_credential = TRUE`, solo admins ven `image_data`; verificadores ven solo el metadata (mime_type, description).

### missing_persons_profiles
Perfil de búsqueda registrado por un familiar (o por admin en nombre del familiar).
- Identidad: `full_name`, `aliases`, `date_of_birth`
- Desaparición: `disappearance_date`, `last_known_latitude/longitude`, `last_known_description`
- Físico: `physical_description`, `photo_base64`
- Contacto (del familiar, NO del desaparecido): `contact_email`, `contact_phone`, `contact_name`, `contact_relation`
- Autoría: `submitter_user_id` (si lo creó la familia) OR `submitted_by_admin_id` (si lo creó un admin)
- Estado: `searching` | `found_deceased` | `found_alive` | `case_closed`
- `is_public`: si `FALSE`, solo admin + submitter lo ven

Un índice GIN trigram sobre `full_name` permite búsqueda fuzzy — el admin puede tipear una parte del nombre de una credencial encontrada y ver candidatos.

### profile_matches
Enlaces **creados manualmente por admin** entre un `field_report` y un `missing_persons_profile`. Nunca se generan automáticamente.
- `match_type`: `credential_name` | `physical` | `location_time` | `dna_confirmed` | `other`
- `confidence`: `low` | `medium` | `high`
- `notes` — el razonamiento del admin
- **Notificación**: `family_notified_at/by/channel/notes` — se llenan solo cuando un admin confirma que ya se contactó a la familia por el canal apropiado. Sin estos campos llenos, la tabla solo registra una hipótesis interna.

Append-only: si un admin cambia de opinión, agrega un nuevo match, no edita el viejo. Preserva el historial.

## Control de acceso

Enforcement en la capa de API (no RLS):

| Acción | Quién |
|---|---|
| Crear field_report | `admin`, `verificador` |
| Cambiar status de field_report | `admin`, `verificador` (solo reportes de su mismo team) |
| Ver field_report | `admin`, `verificador` (solo mismo team) |
| Ver media de credencial (is_credential=TRUE) | **solo admin** |
| Crear missing_persons_profile | cualquier usuario autenticado |
| Editar missing_persons_profile | `admin`, o el submitter original |
| Ver missing_persons_profile | `admin`, submitter, y `is_public=TRUE` |
| Crear profile_match | **solo admin** |
| Notificar familia (set family_notified_at) | **solo admin** |

## Roles

Nuevo rol introducido: **`verificador`**.

Roles existentes pre-feature: `admin`, `helper`, `driver`, `citizen`, `fleet_owner`.

Un verificador es distinto a un helper — helper responde emergencias vehiculares, verificador hace trabajo de campo forense. Los permisos se enforcean en los endpoints con el middleware `requireRole('verificador')` o combinaciones.

## Flujo típico end-to-end

1. **Colectivo identifica zona sospechosa** (por testimonio, por análisis de terreno de SilentEye, o por otra fuente)
2. **Un verificador va a la zona** y camina el terreno con GPS
3. **Encuentra algo relevante** — digamos, prendas y una credencial junto a un montículo
4. **Desde la app** (futuro: Fase 4), crea un `field_report` con:
   - Coordenadas GPS del celular
   - Fecha actual
   - Categoría: `credentials` + `clothing` (crea dos reportes o un reporte con múltiples media)
   - Notas breves
   - Foto del sitio (`is_credential = FALSE`)
   - Foto de la credencial (`is_credential = TRUE`)
5. **El reporte queda en estado `pending`**, visible para el team y admins
6. **El admin ve el reporte**, revisa la foto de la credencial (solo él puede), lee el nombre
7. **El admin busca en `missing_persons_profiles`** por trigrama de ese nombre
8. **Si encuentra un perfil plausible**, crea un `profile_match` con `confidence: 'medium'` y `match_type: 'credential_name'`
9. **Estado del reporte pasa a `notified_authority`** cuando el admin llama a la fiscalía
10. **Cuando la fiscalía procesa el sitio** y los datos oficiales se alinean con el perfil, el admin:
    - Actualiza `match.confidence` agregando un nuevo row con `high`
    - Coordina la notificación a la familia (por teléfono, en persona, o vía fiscalía)
    - Registra `family_notified_at` y el canal
11. **Si se confirma identidad**, el admin cambia `missing_persons_profiles.status` a `found_deceased`
12. **Field report pasa a `processed_by_authority`** → `closed`

## Ground-truth feedback loop

Con el tiempo, la acumulación de `field_reports` vinculados a `terrain_pois` construye un dataset único: "el satélite vio X tipo de anomalía, y en campo efectivamente se encontró Y". Ese dataset puede:

- **Afinar los umbrales de detección** por región (ej: sensibilidad 'normal' está calibrada para bosque tropical, pero en zonas semiáridas requiere 'max')
- **Priorizar futuras búsquedas**: "en Sinaloa los hallazgos positivos suelen ser de categoría X, con severidad satelital Y en bandas Z"
- **Entrenar modelos ML más adelante** (fase futura, no V1) con ejemplos positivos reales en vez de depender solo de umbrales heurísticos

## Decisiones pendientes (anotadas para futuras fases)

1. **Encriptación de ubicaciones en DB**. Actualmente lat/lng viven en claro en la DB. Para mitigar el riesgo de un atacante con acceso SQL, podrían encriptarse con una clave simétrica. Trade-off: rompe los índices GIST espaciales. Decisión: de momento NO encriptar, mantener access-control a nivel aplicación. Revisar si la superficie de riesgo crece.

2. **Rate limit en creación de profiles**. Para prevenir scraping/trolling de familias falsas. Ya hay `writeRateLimit` general — ajustar per-endpoint si se observa abuso.

3. **Almacenamiento externo de media**. Fotos en base64 dentro de Postgres funcionan para ~10k reportes. Arriba de eso habría que mover a S3/R2 por costo y performance de backups.

4. **Notificaciones push específicas para admins**. Cuando un nuevo field_report entra, ¿alertamos al admin por push? Probablemente sí — reutiliza la infra existente.

5. **Exportación a formato estándar**. Para entregar datos a la CNB o fiscalías: CSV/GeoJSON con campos estandarizados. Agregarlo cuando haya demanda real.

## Referencias externas que inspiran este diseño

- **Comisión Nacional de Búsqueda (CNB)** y el Registro Nacional de Personas Desaparecidas y No Localizadas (RNPDNO) — registros oficiales. Nuestro sistema complementa, no reemplaza.
- **Ley General en Materia de Desaparición Forzada de Personas** — marco jurídico de búsqueda y localización.
- **Estándares forenses internacionales** para cadena de custodia (Consejo de Derechos Humanos de la ONU).

Este módulo NO compite con las instituciones oficiales. Su rol es darle a los colectivos una herramienta de documentación digna, que puedan compartir con autoridades por canales formales cuando sea el momento.
