const BASE = '/api';

const request = async (method, path, body) => {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json' },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Error del servidor');
  return data;
};

export const api = {
  getRutinas: () => request('GET', '/rutinas'),
  getRutinaHoy: () => request('GET', '/rutinas/hoy'),
  getRutina: (id) => request('GET', `/rutinas/${id}`),
  updateRutinaEjercicio: (rutinaId, reId, data) => request('PUT', `/rutinas/${rutinaId}/ejercicios/${reId}`, data),
  addEjercicioARutina: (rutinaId, data) => request('POST', `/rutinas/${rutinaId}/ejercicios`, data),
  removeEjercicioDeRutina: (rutinaId, reId) => request('DELETE', `/rutinas/${rutinaId}/ejercicios/${reId}`),

  getEjercicios: () => request('GET', '/ejercicios'),
  getEjercicioHistorial: (id) => request('GET', `/ejercicios/${id}/historial`),

  iniciarEntreno: (rutina_id) => request('POST', '/entrenos', { rutina_id }),
  getEntrenos: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request('GET', `/entrenos${qs ? '?' + qs : ''}`);
  },
  getEntreno: (id) => request('GET', `/entrenos/${id}`),
  completarEntreno: (id, data) => request('PUT', `/entrenos/${id}`, data),
  registrarSerie: (entrenoId, data) => request('POST', `/entrenos/${entrenoId}/series`, data),
  borrarSerie: (entrenoId, serieId) => request('DELETE', `/entrenos/${entrenoId}/series/${serieId}`),
  exportarEntreno: (id) => `${BASE}/entrenos/${id}/export`,

  getStatsSemana: () => request('GET', '/stats/semana'),
  getProgresionGeneral: () => request('GET', '/stats/progresion-general'),

  // Campañas
  getCampanas: () => request('GET', '/campanas'),
  getCampanaActiva: () => request('GET', '/campanas/activa'),
  activarCampana: (id) => request('POST', `/campanas/${id}/activar`),
  getCampanaStats: (id) => request('GET', `/campanas/${id}/stats`),
};
