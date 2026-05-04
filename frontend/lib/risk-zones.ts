/**
 * Zonas de riesgo SESNSP por estado, enriquecidas para landing pages.
 *
 * - risk_score: 0-100, basado en SESNSP CNSP/38/15 "Unidades robadas
 *   2015-2026" (corte 2026-03-31). Mismo dataset usado por el backend
 *   en backend/src/scripts/data/mexico-states-risk.json.
 * - principalCities: ciudades más pobladas o económicamente relevantes
 *   del estado (hecho público).
 * - highways: carreteras federales o autopistas principales que
 *   atraviesan el estado (hecho público).
 *
 * NOTA: Los nombres de carreteras y ciudades son datos públicos
 * verificables. El risk_score sigue la misma fuente que el seed del
 * backend.
 */

export type RiskBand = 'alto' | 'medio' | 'bajo';

export interface StateRiskInfo {
  code: string;
  name: string;
  slug: string;
  risk_score: number;
  principalCities: string[];
  highways: string[];
}

export const stateRisk: StateRiskInfo[] = [
  { code: '01', name: 'Aguascalientes', slug: 'aguascalientes', risk_score: 25,
    principalCities: ['Aguascalientes', 'Jesús María', 'Calvillo'],
    highways: ['Carretera 45 (México–Ciudad Juárez)'] },
  { code: '02', name: 'Baja California', slug: 'baja-california', risk_score: 75,
    principalCities: ['Tijuana', 'Mexicali', 'Ensenada', 'Rosarito'],
    highways: ['Carretera Federal 2 (frontera norte)', 'Carretera Federal 1 (transpeninsular)'] },
  { code: '03', name: 'Baja California Sur', slug: 'baja-california-sur', risk_score: 20,
    principalCities: ['La Paz', 'Los Cabos', 'Loreto'],
    highways: ['Carretera Federal 1 (transpeninsular)'] },
  { code: '04', name: 'Campeche', slug: 'campeche', risk_score: 20,
    principalCities: ['Campeche', 'Ciudad del Carmen', 'Champotón'],
    highways: ['Carretera 180 (Golfo)'] },
  { code: '05', name: 'Coahuila', slug: 'coahuila', risk_score: 40,
    principalCities: ['Saltillo', 'Torreón', 'Monclova', 'Piedras Negras'],
    highways: ['Carretera 57 (México–Piedras Negras)', 'Carretera 40'] },
  { code: '06', name: 'Colima', slug: 'colima', risk_score: 30,
    principalCities: ['Colima', 'Manzanillo', 'Tecomán'],
    highways: ['Carretera 200 (costera)', 'Carretera 54 (Guadalajara–Manzanillo)'] },
  { code: '07', name: 'Chiapas', slug: 'chiapas', risk_score: 25,
    principalCities: ['Tuxtla Gutiérrez', 'Tapachula', 'San Cristóbal de las Casas'],
    highways: ['Carretera 190', 'Carretera 200'] },
  { code: '08', name: 'Chihuahua', slug: 'chihuahua', risk_score: 55,
    principalCities: ['Chihuahua', 'Ciudad Juárez', 'Delicias', 'Cuauhtémoc'],
    highways: ['Carretera 45 (México–Ciudad Juárez)', 'Carretera 16'] },
  { code: '09', name: 'Ciudad de México', slug: 'ciudad-de-mexico', risk_score: 70,
    principalCities: ['Ciudad de México', 'Iztapalapa', 'Gustavo A. Madero', 'Coyoacán'],
    highways: ['Anillo Periférico', 'Circuito Interior', 'Autopista México–Pachuca'] },
  { code: '10', name: 'Durango', slug: 'durango', risk_score: 30,
    principalCities: ['Durango', 'Gómez Palacio', 'Lerdo'],
    highways: ['Carretera 40 (Durango–Mazatlán)', 'Carretera 45'] },
  { code: '11', name: 'Guanajuato', slug: 'guanajuato', risk_score: 80,
    principalCities: ['León', 'Irapuato', 'Celaya', 'Salamanca', 'Guanajuato'],
    highways: ['Carretera 45 (Bajío)', 'Carretera 57'] },
  { code: '12', name: 'Guerrero', slug: 'guerrero', risk_score: 35,
    principalCities: ['Acapulco', 'Chilpancingo', 'Iguala', 'Zihuatanejo'],
    highways: ['Autopista del Sol', 'Carretera 200 (costera)'] },
  { code: '13', name: 'Hidalgo', slug: 'hidalgo', risk_score: 45,
    principalCities: ['Pachuca', 'Tulancingo', 'Tula'],
    highways: ['Arco Norte', 'Carretera 85 (México–Nuevo Laredo)'] },
  { code: '14', name: 'Jalisco', slug: 'jalisco', risk_score: 85,
    principalCities: ['Guadalajara', 'Zapopan', 'Tlaquepaque', 'Tonalá', 'Puerto Vallarta'],
    highways: ['Carretera 15 (Pacífico)', 'Carretera 80', 'Carretera 54'] },
  { code: '15', name: 'Estado de México', slug: 'estado-de-mexico', risk_score: 95,
    principalCities: ['Toluca', 'Ecatepec', 'Nezahualcóyotl', 'Naucalpan', 'Tlalnepantla'],
    highways: ['Arco Norte', 'Autopista México–Querétaro', 'Autopista México–Toluca', 'Autopista México–Puebla'] },
  { code: '16', name: 'Michoacán', slug: 'michoacan', risk_score: 60,
    principalCities: ['Morelia', 'Uruapan', 'Lázaro Cárdenas', 'Zamora'],
    highways: ['Autopista Siglo XXI', 'Carretera 15', 'Carretera 37'] },
  { code: '17', name: 'Morelos', slug: 'morelos', risk_score: 65,
    principalCities: ['Cuernavaca', 'Cuautla', 'Jiutepec'],
    highways: ['Autopista del Sol', 'Carretera 95'] },
  { code: '18', name: 'Nayarit', slug: 'nayarit', risk_score: 30,
    principalCities: ['Tepic', 'Bahía de Banderas', 'Compostela'],
    highways: ['Carretera 15 (Pacífico)', 'Carretera 200'] },
  { code: '19', name: 'Nuevo León', slug: 'nuevo-leon', risk_score: 50,
    principalCities: ['Monterrey', 'Guadalupe', 'Apodaca', 'San Nicolás de los Garza', 'San Pedro Garza García'],
    highways: ['Carretera 85 (México–Nuevo Laredo)', 'Carretera 40', 'Autopista Monterrey–Nuevo Laredo'] },
  { code: '20', name: 'Oaxaca', slug: 'oaxaca', risk_score: 40,
    principalCities: ['Oaxaca', 'Salina Cruz', 'Juchitán', 'Tuxtepec'],
    highways: ['Carretera 190', 'Carretera 200'] },
  { code: '21', name: 'Puebla', slug: 'puebla', risk_score: 80,
    principalCities: ['Puebla', 'Tehuacán', 'Cholula', 'Atlixco'],
    highways: ['Autopista México–Puebla', 'Carretera 150', 'Arco Norte'] },
  { code: '22', name: 'Querétaro', slug: 'queretaro', risk_score: 45,
    principalCities: ['Querétaro', 'San Juan del Río', 'El Marqués'],
    highways: ['Carretera 57 (México–Querétaro)', 'Carretera 45'] },
  { code: '23', name: 'Quintana Roo', slug: 'quintana-roo', risk_score: 55,
    principalCities: ['Cancún', 'Chetumal', 'Playa del Carmen', 'Tulum', 'Cozumel'],
    highways: ['Carretera 307 (Cancún–Tulum)', 'Carretera 186'] },
  { code: '24', name: 'San Luis Potosí', slug: 'san-luis-potosi', risk_score: 50,
    principalCities: ['San Luis Potosí', 'Soledad de Graciano Sánchez', 'Ciudad Valles'],
    highways: ['Carretera 57 (México–Piedras Negras)', 'Carretera 80'] },
  { code: '25', name: 'Sinaloa', slug: 'sinaloa', risk_score: 60,
    principalCities: ['Culiacán', 'Mazatlán', 'Los Mochis', 'Guasave'],
    highways: ['Carretera 15 (Pacífico)', 'Carretera 40 (Durango–Mazatlán)'] },
  { code: '26', name: 'Sonora', slug: 'sonora', risk_score: 50,
    principalCities: ['Hermosillo', 'Ciudad Obregón', 'Nogales', 'San Luis Río Colorado'],
    highways: ['Carretera 15 (Pacífico)', 'Carretera 2 (frontera)'] },
  { code: '27', name: 'Tabasco', slug: 'tabasco', risk_score: 65,
    principalCities: ['Villahermosa', 'Cárdenas', 'Comalcalco'],
    highways: ['Carretera 180 (Golfo)', 'Carretera 186'] },
  { code: '28', name: 'Tamaulipas', slug: 'tamaulipas', risk_score: 60,
    principalCities: ['Reynosa', 'Matamoros', 'Nuevo Laredo', 'Tampico', 'Ciudad Victoria'],
    highways: ['Carretera 85 (México–Nuevo Laredo)', 'Carretera 101', 'Carretera 180'] },
  { code: '29', name: 'Tlaxcala', slug: 'tlaxcala', risk_score: 60,
    principalCities: ['Tlaxcala', 'Apizaco', 'Huamantla'],
    highways: ['Arco Norte', 'Autopista México–Veracruz'] },
  { code: '30', name: 'Veracruz', slug: 'veracruz', risk_score: 65,
    principalCities: ['Veracruz', 'Xalapa', 'Coatzacoalcos', 'Poza Rica', 'Córdoba', 'Orizaba'],
    highways: ['Carretera 150 (México–Veracruz)', 'Carretera 180 (Golfo)', 'Carretera 145'] },
  { code: '31', name: 'Yucatán', slug: 'yucatan', risk_score: 25,
    principalCities: ['Mérida', 'Valladolid', 'Progreso'],
    highways: ['Carretera 180 (Golfo)', 'Carretera 261'] },
  { code: '32', name: 'Zacatecas', slug: 'zacatecas', risk_score: 40,
    principalCities: ['Zacatecas', 'Fresnillo', 'Guadalupe'],
    highways: ['Carretera 45', 'Carretera 49'] },
];

export function getStateBySlug(slug: string): StateRiskInfo | undefined {
  return stateRisk.find((s) => s.slug === slug);
}

export function getRiskBand(score: number): RiskBand {
  if (score >= 70) return 'alto';
  if (score >= 40) return 'medio';
  return 'bajo';
}

export function getRiskBandLabel(band: RiskBand): string {
  return { alto: 'Riesgo alto', medio: 'Riesgo medio', bajo: 'Riesgo bajo' }[band];
}

export function getRiskBandColor(band: RiskBand): { bg: string; text: string; ring: string; dot: string } {
  return {
    alto: { bg: 'bg-red-50', text: 'text-red-700', ring: 'ring-red-200', dot: 'bg-red-500' },
    medio: { bg: 'bg-amber-50', text: 'text-amber-700', ring: 'ring-amber-200', dot: 'bg-amber-500' },
    bajo: { bg: 'bg-emerald-50', text: 'text-emerald-700', ring: 'ring-emerald-200', dot: 'bg-emerald-500' },
  }[band];
}

/**
 * National ranking 1-32 by risk score (descending). Same scores
 * collapse to the same rank.
 */
export function getNationalRank(stateCode: string): number {
  const sorted = [...stateRisk].sort((a, b) => b.risk_score - a.risk_score);
  return sorted.findIndex((s) => s.code === stateCode) + 1;
}
