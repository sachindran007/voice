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
  timeout: 60000,
})

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data || err)
)

export async function uploadChunk({ blob, recordingId, chunkIndex, isLast, duration, mimeType = 'audio/webm' }) {
  const form = new FormData()
  const ext = mimeType.includes('mp4') ? '.mp4' : mimeType.includes('ogg') ? '.ogg' : '.webm'

  form.append('audio', blob, `chunk_${chunkIndex}${ext}`)
  if (recordingId) form.append('recordingId', recordingId)
  form.append('chunkIndex', chunkIndex)
  form.append('isLast', isLast ? 'true' : 'false')
  if (typeof duration === 'number') {
    form.append('duration', Math.max(1, Math.round(duration)).toString())
  }

  return api.post('/upload/chunk', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
    timeout: 120000,
  })
}

export async function getRecordings({ page = 1, limit = 20 } = {}) {
  return api.get(`/recordings?page=${page}&limit=${limit}`)
}

export async function getRecording(id) {
  return api.get(`/recordings/${id}`)
}

export async function getRecordingStatus(id) {
  return api.get(`/recordings/${id}/status`)
}

export async function searchRecordings(query) {
  return api.get(`/recordings/search?q=${encodeURIComponent(query)}`)
}

export async function updateRecording(id, { title }) {
  return api.patch(`/recordings/${id}`, { title })
}

export async function deleteRecording(id) {
  return api.delete(`/recordings/${id}`)
}

export async function retryRecording(id) {
  return api.post(`/recordings/${id}/retry`)
}

export async function checkHealth() {
  return api.get('/health')
}
