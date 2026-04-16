'use client';

/**
 * TerrainInstructions — modal emergente que explica cómo usar el
 * análisis de terreno de forma honesta y efectiva.
 *
 * Se muestra la PRIMERA vez que un usuario entra al módulo (salvo que
 * haya marcado "no mostrar de nuevo" en una visita anterior, guardado
 * en localStorage). También se puede reabrir manualmente desde el
 * botón ℹ️ que vive en el header del módulo.
 *
 * Propósito: la herramienta es fácil de malinterpretar — la gente
 * asume que es un "detector de fosas" y se frustra cuando "el mismo
 * punto a veces detecta y a veces no". Este modal les da el mental
 * model correcto antes de que empiecen a usar los controles.
 */

import { useLocale } from '@/hooks/useLocale';

const STORAGE_KEY = 'silenteye-terrain-instructions-dismissed';

export function shouldShowInstructions(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(STORAGE_KEY) !== '1';
}

export function dismissInstructionsForever(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, '1');
}

export default function TerrainInstructions({
  onClose,
}: {
  onClose: () => void;
}) {
  const { t } = useLocale();

  const handleDismissForever = () => {
    dismissInstructionsForever();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-200 flex items-center justify-between flex-shrink-0 bg-gradient-to-r from-amber-50 to-orange-50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#d97706" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 9v4"/><path d="M12 17h.01"/><circle cx="12" cy="12" r="10"/>
              </svg>
            </div>
            <h2 className="text-lg font-bold text-zinc-900">{t.terrain.instructions.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-zinc-600 transition-colors"
            aria-label="Cerrar"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 6 6 18"/><path d="m6 6 12 12"/>
            </svg>
          </button>
        </div>

        {/* Scrollable body */}
        <div className="overflow-y-auto px-6 py-5 space-y-5 flex-1">
          {/* What it is */}
          <section>
            <h3 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <span className="text-base">🛰️</span> {t.terrain.instructions.whatIsTitle}
            </h3>
            <p className="text-sm text-zinc-600 leading-relaxed">
              {t.terrain.instructions.whatIsBody}
            </p>
          </section>

          {/* What it is NOT — honesty */}
          <section className="rounded-lg bg-red-50 border border-red-200 p-4">
            <h3 className="text-sm font-bold text-red-900 mb-2 flex items-center gap-2">
              <span className="text-base">⚠️</span> {t.terrain.instructions.notTitle}
            </h3>
            <p className="text-xs text-red-800 leading-relaxed">
              {t.terrain.instructions.notBody}
            </p>
          </section>

          {/* Why results vary */}
          <section>
            <h3 className="text-sm font-bold text-zinc-900 mb-2 flex items-center gap-2">
              <span className="text-base">🔄</span> {t.terrain.instructions.varyTitle}
            </h3>
            <p className="text-sm text-zinc-600 leading-relaxed mb-3">
              {t.terrain.instructions.varyIntro}
            </p>
            <ul className="space-y-2">
              {t.terrain.instructions.varyReasons.map((reason: string, i: number) => (
                <li key={i} className="text-xs text-zinc-600 leading-relaxed flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
                  <span>{reason}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* How to use well */}
          <section className="rounded-lg bg-emerald-50 border border-emerald-200 p-4">
            <h3 className="text-sm font-bold text-emerald-900 mb-2 flex items-center gap-2">
              <span className="text-base">✅</span> {t.terrain.instructions.tipsTitle}
            </h3>
            <ul className="space-y-2">
              {t.terrain.instructions.tips.map((tip: string, i: number) => (
                <li key={i} className="text-xs text-emerald-900 leading-relaxed flex items-start gap-2">
                  <span className="font-bold text-emerald-700 flex-shrink-0">{i + 1}.</span>
                  <span>{tip}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* afterDate workaround warning */}
          <section className="rounded-lg bg-amber-50 border border-amber-200 p-4">
            <h3 className="text-sm font-bold text-amber-900 mb-2 flex items-center gap-2">
              <span className="text-base">📅</span> {t.terrain.instructions.afterDateWarningTitle}
            </h3>
            <p className="text-xs text-amber-900 leading-relaxed">
              {t.terrain.instructions.afterDateWarningBody}
            </p>
          </section>

          {/* Honest closing */}
          <section className="rounded-lg bg-zinc-50 border border-zinc-200 p-4">
            <p className="text-xs text-zinc-700 leading-relaxed italic">
              {t.terrain.instructions.closingQuote}
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-zinc-200 flex items-center justify-between gap-3 flex-shrink-0 bg-zinc-50">
          <button
            onClick={handleDismissForever}
            className="text-xs text-zinc-500 hover:text-zinc-700 underline transition-colors"
          >
            {t.terrain.instructions.dontShowAgain}
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            {t.terrain.instructions.understood}
          </button>
        </div>
      </div>
    </div>
  );
}
