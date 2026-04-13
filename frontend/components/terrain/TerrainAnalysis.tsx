'use client';

import { useState, useCallback, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useLocale } from '@/hooks/useLocale';

const TerrainMap = dynamic(() => import('./TerrainMap'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-zinc-100 text-zinc-400 text-xs">
      Cargando mapa…
    </div>
  ),
});

const API = '';

interface TerrainLayer {
  name: string;
  tileUrl: string;
  type: string;
}

interface AnalysisResult {
  layers: TerrainLayer[];
  bounds: { south: number; west: number; north: number; east: number };
  metadata: {
    baselineStart: string;
    baselineEnd: string;
    currentStart: string;
    currentEnd: string;
    baselineImages: number;
    currentImages: number;
    cloudWarning: boolean;
  };
}

interface POI {
  id: string;
  name: string;
  notes?: string;
  latitude: number;
  longitude: number;
  event_date?: string;
  created_at?: string;
}

// Layer selection options
const LAYER_OPTIONS = [
  { value: 'true_color_before', labelKey: 'trueColorBefore' as const },
  { value: 'true_color_after', labelKey: 'trueColorAfter' as const },
  { value: 'ndvi_before', labelKey: 'ndvi', suffix: ' (antes)' },
  { value: 'ndvi_after', labelKey: 'ndvi', suffix: ' (después)' },
  { value: 'ndvi_diff', labelKey: 'ndviDiff' as const },
  { value: 'bsi_before', labelKey: 'bsi', suffix: ' (antes)' },
  { value: 'bsi_after', labelKey: 'bsi', suffix: ' (después)' },
  { value: 'bsi_diff', labelKey: 'bsiDiff' as const },
] as const;

// Comparison presets
const COMPARISON_PRESETS = [
  { before: 'true_color_before', after: 'true_color_after', label: 'trueColor' },
  { before: 'ndvi_before', after: 'ndvi_after', label: 'ndvi' },
  { before: 'bsi_before', after: 'bsi_after', label: 'bsi' },
];

export default function TerrainAnalysis({
  token,
  coords,
}: {
  token: string | null;
  coords: { lat: number; lng: number } | null;
}) {
  const { t } = useLocale();

  // Form state
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  const [eventDate, setEventDate] = useState('');
  const [radiusKm, setRadiusKm] = useState(2);

  // Analysis state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);

  // Map controls
  const [activeLayer, setActiveLayer] = useState<string | null>(null);
  const [opacity, setOpacity] = useState(0.7);
  const [comparisonMode, setComparisonMode] = useState(false);
  const [beforeLayer, setBeforeLayer] = useState<string | null>('true_color_before');
  const [afterLayer, setAfterLayer] = useState<string | null>('true_color_after');
  const [splitPosition, setSplitPosition] = useState(50);

  // POI state
  const [pois, setPois] = useState<POI[]>([]);
  const [showPois, setShowPois] = useState(false);
  const [poiName, setPoiName] = useState('');
  const [poiNotes, setPoiNotes] = useState('');
  const [savingPoi, setSavingPoi] = useState(false);

  // Panel toggles
  const [showControls, setShowControls] = useState(true);

  // Load POIs on mount
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/api/terrain/pois`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data: POI[]) => setPois(data))
      .catch(() => {});
  }, [token]);

  // Use GPS coordinates
  const useMyLocation = useCallback(() => {
    if (coords) {
      setLat(coords.lat.toFixed(6));
      setLng(coords.lng.toFixed(6));
    }
  }, [coords]);

  // Handle map click
  const handleMapClick = useCallback((clickLat: number, clickLng: number) => {
    setLat(clickLat.toFixed(6));
    setLng(clickLng.toFixed(6));
  }, []);

  // Run analysis
  const handleAnalyze = useCallback(async () => {
    if (!token) return;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    if (isNaN(latNum) || isNaN(lngNum)) {
      setError(t.terrain.clickMap);
      return;
    }
    if (!eventDate) {
      setError(t.terrain.eventDate + ' required');
      return;
    }

    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch(`${API}/api/terrain/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          latitude: latNum,
          longitude: lngNum,
          radiusKm,
          eventDate,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        if (res.status === 503) {
          setError(t.terrain.errorNoAuth);
        } else if (res.status === 404) {
          setError(t.terrain.errorNoImages);
        } else {
          setError(data.error || t.terrain.errorGee);
        }
        return;
      }

      const data: AnalysisResult = await res.json();
      setResult(data);
      setActiveLayer('ndvi_diff');
      setComparisonMode(false);
    } catch {
      setError(t.terrain.errorGee);
    } finally {
      setLoading(false);
    }
  }, [token, lat, lng, eventDate, radiusKm, t]);

  // Save POI
  const handleSavePoi = useCallback(async () => {
    if (!token || !poiName.trim() || !lat || !lng) return;
    setSavingPoi(true);
    try {
      const res = await fetch(`${API}/api/terrain/pois`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: poiName.trim(),
          notes: poiNotes.trim() || null,
          latitude: parseFloat(lat),
          longitude: parseFloat(lng),
          eventDate: eventDate || null,
        }),
      });
      if (res.ok) {
        const poi: POI = await res.json();
        setPois((prev) => [poi, ...prev]);
        setPoiName('');
        setPoiNotes('');
      }
    } catch {
      // silent
    } finally {
      setSavingPoi(false);
    }
  }, [token, poiName, poiNotes, lat, lng, eventDate]);

  // Delete POI
  const handleDeletePoi = useCallback(
    async (id: string) => {
      if (!token) return;
      try {
        const res = await fetch(`${API}/api/terrain/pois/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          setPois((prev) => prev.filter((p) => p.id !== id));
        }
      } catch {
        // silent
      }
    },
    [token],
  );

  // Select POI → center map
  const handleSelectPoi = useCallback((poi: POI) => {
    setLat(poi.latitude.toFixed(6));
    setLng(poi.longitude.toFixed(6));
    if (poi.event_date) {
      setEventDate(poi.event_date.slice(0, 10));
    }
  }, []);

  const mapCenter: [number, number] = lat && lng ? [parseFloat(lat) || 19.4326, parseFloat(lng) || -99.1332] : [19.4326, -99.1332];

  const layerLabel = (opt: typeof LAYER_OPTIONS[number]) => {
    const base = t.terrain[opt.labelKey] as string;
    if ('suffix' in opt && opt.suffix) return base + opt.suffix;
    return base;
  };

  return (
    <div className="flex flex-col h-full bg-zinc-50">
      {/* Controls toggle for mobile */}
      <button
        onClick={() => setShowControls(!showControls)}
        className="md:hidden flex items-center justify-between px-4 py-2 bg-white border-b border-zinc-200 text-xs text-zinc-600 font-medium"
      >
        <span>{t.terrain.title}</span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={`transition-transform ${showControls ? 'rotate-180' : ''}`}
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>

      {/* Controls panel */}
      {showControls && (
        <div className="bg-white border-b border-zinc-200 px-4 py-3 space-y-3">
          {/* Coordinates row */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{t.terrain.latitude}</label>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="19.4326"
                className="w-full mt-0.5 px-2 py-1.5 text-xs border border-zinc-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>
            <div className="flex-1 min-w-[120px]">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{t.terrain.longitude}</label>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-99.1332"
                className="w-full mt-0.5 px-2 py-1.5 text-xs border border-zinc-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>
            <button
              onClick={useMyLocation}
              disabled={!coords}
              className="px-2 py-1.5 text-xs bg-zinc-100 hover:bg-zinc-200 text-zinc-600 rounded-md transition-colors disabled:opacity-40 whitespace-nowrap"
              title={t.terrain.useMyLocation}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="3" /><path d="M12 2v4m0 12v4M2 12h4m12 0h4" />
              </svg>
            </button>
          </div>

          {/* Date + Radius + Analyze */}
          <div className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[140px]">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">{t.terrain.eventDate}</label>
              <input
                type="date"
                value={eventDate}
                onChange={(e) => setEventDate(e.target.value)}
                className="w-full mt-0.5 px-2 py-1.5 text-xs border border-zinc-300 rounded-md focus:ring-1 focus:ring-amber-500 focus:border-amber-500 bg-white"
              />
            </div>
            <div className="w-28">
              <label className="text-[10px] font-medium text-zinc-500 uppercase tracking-wider">
                {t.terrain.radius}: {t.terrain.radiusKm(radiusKm)}
              </label>
              <input
                type="range"
                min={1}
                max={10}
                step={0.5}
                value={radiusKm}
                onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                className="w-full mt-1 accent-amber-500"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={loading || !lat || !lng || !eventDate}
              className="px-4 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {loading ? (
                <span className="flex items-center gap-1.5">
                  <svg width="12" height="12" viewBox="0 0 24 24" className="animate-spin" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" /></svg>
                  {t.terrain.analyzing}
                </span>
              ) : (
                t.terrain.analyze
              )}
            </button>
          </div>

          {/* Click-to-select hint */}
          <p className="text-[10px] text-zinc-400">{t.terrain.clickMap}</p>

          {/* Error */}
          {error && (
            <p className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-md">{error}</p>
          )}
        </div>
      )}

      {/* Map + Layers sidebar */}
      <div className="flex-1 flex min-h-0">
        {/* Map */}
        <div className="flex-1 relative">
          <TerrainMap
            center={mapCenter}
            radiusKm={radiusKm}
            layers={result?.layers || []}
            activeLayer={activeLayer}
            opacity={opacity}
            pois={pois}
            onMapClick={handleMapClick}
            comparisonMode={comparisonMode}
            beforeLayer={beforeLayer}
            afterLayer={afterLayer}
            splitPosition={splitPosition}
          />

          {/* Loading overlay */}
          {loading && (
            <div className="absolute inset-0 bg-black/30 z-[1000] flex items-center justify-center">
              <div className="bg-white rounded-lg px-6 py-4 shadow-xl flex flex-col items-center gap-2">
                <svg width="24" height="24" viewBox="0 0 24 24" className="animate-spin text-amber-600" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" opacity="0.25" /><path d="M12 2a10 10 0 0 1 10 10" />
                </svg>
                <p className="text-xs text-zinc-600">{t.terrain.analyzing}</p>
                <p className="text-[10px] text-zinc-400">{t.terrain.resolution}</p>
              </div>
            </div>
          )}
        </div>

        {/* Layer controls sidebar — visible when results exist */}
        {result && (
          <div className="w-56 bg-white border-l border-zinc-200 overflow-y-auto flex-shrink-0 hidden md:block">
            {/* Layer selector */}
            <div className="p-3 border-b border-zinc-100">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{t.terrain.layers}</p>
              <div className="space-y-1">
                {LAYER_OPTIONS.map((opt) => {
                  const available = result.layers.some((l) => l.name === opt.value);
                  if (!available) return null;
                  return (
                    <button
                      key={opt.value}
                      onClick={() => { setActiveLayer(opt.value); setComparisonMode(false); }}
                      className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                        activeLayer === opt.value && !comparisonMode
                          ? 'bg-amber-100 text-amber-800 font-medium'
                          : 'text-zinc-600 hover:bg-zinc-100'
                      }`}
                    >
                      {layerLabel(opt)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Opacity slider */}
            <div className="p-3 border-b border-zinc-100">
              <label className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider">
                {t.terrain.opacity}: {Math.round(opacity * 100)}%
              </label>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={opacity}
                onChange={(e) => setOpacity(parseFloat(e.target.value))}
                className="w-full mt-1 accent-amber-500"
              />
            </div>

            {/* Comparison mode */}
            <div className="p-3 border-b border-zinc-100">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-2">{t.terrain.comparison}</p>
              <div className="space-y-1">
                {COMPARISON_PRESETS.map((preset) => (
                  <button
                    key={preset.label}
                    onClick={() => {
                      setComparisonMode(true);
                      setBeforeLayer(preset.before);
                      setAfterLayer(preset.after);
                    }}
                    className={`w-full text-left px-2 py-1.5 rounded text-xs transition-colors ${
                      comparisonMode && beforeLayer === preset.before
                        ? 'bg-blue-100 text-blue-800 font-medium'
                        : 'text-zinc-600 hover:bg-zinc-100'
                    }`}
                  >
                    {preset.label === 'trueColor' ? `${t.terrain.before} / ${t.terrain.after}` :
                     preset.label === 'ndvi' ? `${t.terrain.ndvi}` :
                     `${t.terrain.bsi}`}
                  </button>
                ))}
              </div>
              {comparisonMode && (
                <div className="mt-2">
                  <label className="text-[10px] text-zinc-400">
                    {t.terrain.before} ← → {t.terrain.after}
                  </label>
                  <input
                    type="range"
                    min={10}
                    max={90}
                    value={splitPosition}
                    onChange={(e) => setSplitPosition(parseInt(e.target.value))}
                    className="w-full mt-1 accent-blue-500"
                  />
                </div>
              )}
            </div>

            {/* Metadata */}
            {result.metadata && (
              <div className="p-3 border-b border-zinc-100">
                <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1">{t.terrain.metadata}</p>
                <div className="text-[10px] text-zinc-500 space-y-0.5">
                  <p>{t.terrain.imagesBefore(result.metadata.baselineImages)}</p>
                  <p>{t.terrain.imagesAfter(result.metadata.currentImages)}</p>
                  <p>{t.terrain.dateRange}: {result.metadata.baselineStart} → {result.metadata.currentEnd}</p>
                  <p className="text-zinc-400">{t.terrain.resolution}</p>
                </div>
                {result.metadata.cloudWarning && (
                  <p className="mt-1.5 text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">{t.terrain.cloudWarning}</p>
                )}
              </div>
            )}

            {/* Legend */}
            <div className="p-3 border-b border-zinc-100">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{t.terrain.legend}</p>
              {(activeLayer?.includes('ndvi') || (comparisonMode && beforeLayer?.includes('ndvi'))) && !activeLayer?.includes('diff') && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-3 h-3 rounded-sm" style={{ background: '#1a9850' }} />
                    <span className="text-zinc-600">{t.terrain.highVegetation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-3 h-3 rounded-sm" style={{ background: '#fee08b' }} />
                    <span className="text-zinc-600">{t.terrain.lowVegetation}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-3 h-3 rounded-sm" style={{ background: '#d73027' }} />
                    <span className="text-zinc-600">{t.terrain.bareSoil}</span>
                  </div>
                </div>
              )}
              {activeLayer?.includes('diff') && (
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-3 h-3 rounded-sm" style={{ background: '#b2182b' }} />
                    <span className="text-zinc-600">{activeLayer.includes('bsi') ? t.terrain.increase : t.terrain.decrease}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-3 h-3 rounded-sm" style={{ background: '#f7f7f7' }} />
                    <span className="text-zinc-600">{t.terrain.noChange}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="w-3 h-3 rounded-sm" style={{ background: '#2166ac' }} />
                    <span className="text-zinc-600">{activeLayer.includes('bsi') ? t.terrain.decrease : t.terrain.increase}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Save POI */}
            <div className="p-3 border-b border-zinc-100">
              <p className="text-[10px] font-semibold text-zinc-500 uppercase tracking-wider mb-1.5">{t.terrain.savePoi}</p>
              <input
                type="text"
                value={poiName}
                onChange={(e) => setPoiName(e.target.value)}
                placeholder={t.terrain.poiName}
                className="w-full px-2 py-1 text-xs border border-zinc-300 rounded-md mb-1 bg-white"
                maxLength={200}
              />
              <input
                type="text"
                value={poiNotes}
                onChange={(e) => setPoiNotes(e.target.value)}
                placeholder={t.terrain.poiNotes}
                className="w-full px-2 py-1 text-xs border border-zinc-300 rounded-md mb-1.5 bg-white"
                maxLength={500}
              />
              <button
                onClick={handleSavePoi}
                disabled={savingPoi || !poiName.trim() || !lat || !lng}
                className="w-full py-1 bg-amber-600 hover:bg-amber-700 text-white text-xs rounded-md transition-colors disabled:opacity-40"
              >
                {t.terrain.savePoi}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Mobile layer controls — bottom sheet */}
      {result && (
        <div className="md:hidden bg-white border-t border-zinc-200 px-4 py-2 space-y-2 max-h-48 overflow-y-auto">
          {/* Layer pills */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {LAYER_OPTIONS.map((opt) => {
              const available = result.layers.some((l) => l.name === opt.value);
              if (!available) return null;
              return (
                <button
                  key={opt.value}
                  onClick={() => { setActiveLayer(opt.value); setComparisonMode(false); }}
                  className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium transition-colors ${
                    activeLayer === opt.value && !comparisonMode
                      ? 'bg-amber-600 text-white'
                      : 'bg-zinc-100 text-zinc-600'
                  }`}
                >
                  {layerLabel(opt)}
                </button>
              );
            })}
          </div>

          {/* Opacity */}
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-zinc-500 w-16">{t.terrain.opacity}</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={opacity}
              onChange={(e) => setOpacity(parseFloat(e.target.value))}
              className="flex-1 accent-amber-500"
            />
            <span className="text-[10px] text-zinc-400 w-8">{Math.round(opacity * 100)}%</span>
          </div>

          {/* Metadata */}
          {result.metadata.cloudWarning && (
            <p className="text-[10px] text-amber-600 bg-amber-50 px-2 py-1 rounded">{t.terrain.cloudWarning}</p>
          )}
        </div>
      )}

      {/* POI panel — collapsible */}
      {pois.length > 0 && (
        <div className="bg-white border-t border-zinc-200">
          <button
            onClick={() => setShowPois(!showPois)}
            className="w-full px-4 py-2 flex items-center justify-between text-xs text-zinc-600 font-medium"
          >
            <span>{t.terrain.savedPois} ({pois.length})</span>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={`transition-transform ${showPois ? 'rotate-180' : ''}`}>
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
          {showPois && (
            <div className="px-4 pb-3 space-y-1.5 max-h-40 overflow-y-auto">
              {pois.map((poi) => (
                <div
                  key={poi.id}
                  className="flex items-center gap-2 px-2 py-1.5 rounded bg-zinc-50 hover:bg-zinc-100 cursor-pointer transition-colors"
                  onClick={() => handleSelectPoi(poi)}
                >
                  <div className="w-2 h-2 rounded-full bg-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium text-zinc-700 truncate">{poi.name}</p>
                    <p className="text-[10px] text-zinc-400 truncate">
                      {poi.latitude.toFixed(4)}, {poi.longitude.toFixed(4)}
                      {poi.event_date ? ` · ${poi.event_date.slice(0, 10)}` : ''}
                    </p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeletePoi(poi.id); }}
                    className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                    title={t.terrain.deletePoi}
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
