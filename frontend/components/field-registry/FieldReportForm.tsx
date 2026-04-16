'use client';
/**
 * SilentEye — Nuevo hallazgo de campo (verificador form).
 *
 * Captura: GPS actual (o ingresado a mano), fecha, categoría, notas,
 * y hasta N fotos con flag de credencial. Al crear el reporte sube
 * las fotos una por una — si alguna falla, muestra error pero no
 * borra el reporte (el usuario puede reintentar desde la vista del
 * admin/team).
 */

import { useEffect, useState } from 'react';
import {
  fieldReportsApi,
  CATEGORY_LABEL,
  type FieldReportCategory,
} from '@/lib/field-registry-api';

interface PendingMedia {
  dataUrl: string;    // full data URL with prefix
  base64: string;     // stripped base64
  mimeType: string;
  isCredential: boolean;
  description: string;
}

interface Props {
  onCreated?: (reportId: string) => void;
  onCancel?: () => void;
  terrainPoiId?: string; // prefill if user came from terrain analysis
}

export default function FieldReportForm({ onCreated, onCancel, terrainPoiId }: Props) {
  const [lat, setLat] = useState<string>('');
  const [lng, setLng] = useState<string>('');
  const [accuracy, setAccuracy] = useState<string>('');
  const [gpsError, setGpsError] = useState<string | null>(null);
  const [category, setCategory] = useState<FieldReportCategory>('remains');
  const [notes, setNotes] = useState<string>('');
  const [reportDate, setReportDate] = useState<string>(() => new Date().toISOString().slice(0, 16));
  const [media, setMedia] = useState<PendingMedia[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-GPS on mount
  useEffect(() => {
    if (!navigator.geolocation) {
      setGpsError('GPS no disponible en este navegador');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude.toFixed(6));
        setLng(pos.coords.longitude.toFixed(6));
        if (pos.coords.accuracy) setAccuracy(String(Math.round(pos.coords.accuracy)));
        setGpsError(null);
      },
      (err) => setGpsError(`GPS error: ${err.message}. Ingresa coordenadas a mano.`),
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 0 }
    );
  }, []);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = ''; // reset so same file can be selected again
    if (!file) return;
    if (file.size > 1_200_000) {
      setError('La imagen excede 1.2MB. Comprime o elige otra.');
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    const commaIdx = dataUrl.indexOf(',');
    const base64 = commaIdx >= 0 ? dataUrl.slice(commaIdx + 1) : dataUrl;
    setMedia((prev) => [
      ...prev,
      { dataUrl, base64, mimeType: file.type || 'image/jpeg', isCredential: false, description: '' },
    ]);
  }

  function updateMedia(idx: number, patch: Partial<PendingMedia>) {
    setMedia((prev) => prev.map((m, i) => (i === idx ? { ...m, ...patch } : m)));
  }

  function removeMedia(idx: number) {
    setMedia((prev) => prev.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    setError(null);
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError('Coordenadas inválidas');
      return;
    }
    if (!reportDate) {
      setError('Fecha requerida');
      return;
    }
    setSubmitting(true);
    try {
      const report = await fieldReportsApi.create({
        latitude: latNum,
        longitude: lngNum,
        accuracy_m: accuracy ? parseFloat(accuracy) : undefined,
        report_date: new Date(reportDate).toISOString(),
        category,
        notes: notes.trim() || undefined,
        terrain_poi_id: terrainPoiId,
      });

      // Subir media uno por uno — si alguno falla, reportamos pero no rollback
      const uploadErrors: string[] = [];
      for (let i = 0; i < media.length; i++) {
        const m = media[i];
        try {
          await fieldReportsApi.uploadMedia(report.id, {
            image_data: m.base64,
            is_credential: m.isCredential,
            media_type: 'photo',
            mime_type: m.mimeType,
            description: m.description.trim() || undefined,
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          uploadErrors.push(`Foto ${i + 1}: ${msg}`);
        }
      }
      if (uploadErrors.length > 0) {
        setError(`Reporte creado, pero algunas fotos fallaron:\n${uploadErrors.join('\n')}`);
      }
      onCreated?.(report.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el reporte');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-zinc-200 p-4 md:p-6 space-y-4">
      <div>
        <h2 className="text-lg font-bold text-zinc-900">Nuevo hallazgo de campo</h2>
        <p className="text-[13px] text-zinc-500">
          Documenta lo que encontraste en el sitio. Las credenciales son sensibles — márcalas como tal.
        </p>
      </div>

      {/* GPS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div>
          <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Latitud</label>
          <input
            type="text"
            inputMode="decimal"
            value={lat}
            onChange={(e) => setLat(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm"
            placeholder="19.432608"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Longitud</label>
          <input
            type="text"
            inputMode="decimal"
            value={lng}
            onChange={(e) => setLng(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm"
            placeholder="-99.133209"
          />
        </div>
        <div>
          <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Precisión (m)</label>
          <input
            type="number"
            value={accuracy}
            onChange={(e) => setAccuracy(e.target.value)}
            className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm"
            placeholder="10"
          />
        </div>
      </div>
      {gpsError && <p className="text-[12px] text-amber-600">{gpsError}</p>}

      {/* Date */}
      <div>
        <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Fecha del hallazgo</label>
        <input
          type="datetime-local"
          value={reportDate}
          onChange={(e) => setReportDate(e.target.value)}
          className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm"
        />
      </div>

      {/* Category */}
      <div>
        <label className="block text-[12px] font-semibold text-zinc-700 mb-1">Categoría</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as FieldReportCategory)}
          className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm bg-white"
        >
          {(Object.keys(CATEGORY_LABEL) as FieldReportCategory[]).map((c) => (
            <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
          ))}
        </select>
      </div>

      {/* Notes */}
      <div>
        <label className="block text-[12px] font-semibold text-zinc-700 mb-1">
          Notas (opcional) <span className="text-zinc-400 font-normal">— breve, descriptivo</span>
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value.slice(0, 4000))}
          rows={3}
          className="w-full px-3 py-2 border border-zinc-200 rounded-md text-sm resize-none"
          placeholder="Ej: Montículo con tierra removida, aprox 2x1m, cerca de un mezquite."
        />
        <p className="text-[11px] text-zinc-400 mt-1">{notes.length} / 4000</p>
      </div>

      {/* Media */}
      <div>
        <label className="block text-[12px] font-semibold text-zinc-700 mb-2">Fotos</label>
        {media.map((m, idx) => (
          <div key={idx} className="flex gap-3 items-start bg-zinc-50 rounded-lg p-3 mb-2 border border-zinc-200">
            <img src={m.dataUrl} alt="preview" className="w-20 h-20 object-cover rounded" />
            <div className="flex-1 space-y-2">
              <label className="flex items-center gap-2 text-[13px]">
                <input
                  type="checkbox"
                  checked={m.isCredential}
                  onChange={(e) => updateMedia(idx, { isCredential: e.target.checked })}
                />
                <span className="font-medium">
                  Es una credencial / identificación
                </span>
                {m.isCredential && (
                  <span className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
                    Solo admin podrá ver la foto
                  </span>
                )}
              </label>
              <input
                type="text"
                value={m.description}
                onChange={(e) => updateMedia(idx, { description: e.target.value.slice(0, 500) })}
                placeholder="Descripción breve (opcional)"
                className="w-full px-2 py-1 border border-zinc-200 rounded text-[13px]"
              />
            </div>
            <button
              type="button"
              onClick={() => removeMedia(idx)}
              className="text-[12px] text-red-600 hover:text-red-800 font-medium"
            >
              Quitar
            </button>
          </div>
        ))}
        <label className="block">
          <span className="text-[12px] text-zinc-600 cursor-pointer underline">Agregar foto</span>
          <input
            type="file"
            accept="image/jpeg,image/png"
            onChange={handleFileChange}
            className="hidden"
          />
        </label>
      </div>

      {error && (
        <div className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded p-2 whitespace-pre-line">
          {error}
        </div>
      )}

      <div className="flex gap-2 justify-end pt-2 border-t border-zinc-100">
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            disabled={submitting}
            className="px-4 py-2 text-[13px] font-medium text-zinc-600 hover:text-zinc-900"
          >
            Cancelar
          </button>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitting}
          className="px-4 py-2 bg-zinc-900 text-white text-[13px] font-semibold rounded-md disabled:opacity-50"
        >
          {submitting ? 'Guardando…' : 'Crear reporte'}
        </button>
      </div>
    </div>
  );
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
