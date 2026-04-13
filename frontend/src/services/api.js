import axios from 'axios'

function normalizeApiUrl(url) {
  if (!url) return '/api'

  const trimmedUrl = url.trim().replace(/\/+$/, '')

  if (!/^https?:\/\//i.test(trimmedUrl)) {
    return trimmedUrl
  }

  return trimmedUrl.endsWith('/api') ? trimmedUrl : `${trimmedUrl}/api`
}

const API_URL = normalizeApiUrl(import.meta.env.VITE_API_URL)

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data || err)
)

// ── Upload a 30-second chunk ─────────────────────────────────────────────────
export async function uploadChunk({ blob, recordingId, chunkIndex, isLast, mimeType = 'audio/webm' }) {
  const form = new FormData()
  const ext = mimeType.includes('mp4') ? '.mp4' : mimeType.includes('ogg') ? '.ogg' : '.webm'
  form.append('audio', blob, `chunk_${chunkIndex}${ext}`)
  if (recordingId) form.append('recordingId', recordingId)
  form.append('chunkIndex', chunkIndex)
  form.append('isLast', isLast ? 'true' : 'false')

  return api.post('/upload/chunk', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000
  })
}

// ── Finalize recording ───────────────────────────────────────────────────────
export async function finalizeRecording(recordingId) {
  return api.post('/upload/finalize', { recordingId })
}

// ── Get all recordings ───────────────────────────────────────────────────────
export async function getRecordings({ page = 1, limit = 20 } = {}) {
  return api.get(`/recordings?page=${page}&limit=${limit}`)
}

// ── Get single recording ─────────────────────────────────────────────────────
export async function getRecording(id) {
  return api.get(`/recordings/${id}`)
}

// ── Get recording status ─────────────────────────────────────────────────────
export async function getRecordingStatus(id) {
  return api.get(`/recordings/${id}/status`)
}

// ── Search recordings ────────────────────────────────────────────────────────
export async function searchRecordings(query) {
  return api.get(`/recordings/search?q=${encodeURIComponent(query)}`)
}

// ── Update recording title ───────────────────────────────────────────────────
export async function updateRecording(id, { title }) {
  return api.patch(`/recordings/${id}`, { title })
}

// ── Delete recording ─────────────────────────────────────────────────────────
export async function deleteRecording(id) {
  return api.delete(`/recordings/${id}`)
}

// ── Health check ─────────────────────────────────────────────────────────────
export async function checkHealth() {
  return api.get('/health')
}
