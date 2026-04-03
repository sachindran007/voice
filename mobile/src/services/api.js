import axios from 'axios';

// Replace with your local IP address for physical Android testing
// e.g., 'http://192.168.1.5:5000/api'
const API_URL = 'http://10.0.2.2:5000/api'; // Android Emulator default host IP

const api = axios.create({
  baseURL: API_URL,
  timeout: 60000
});

api.interceptors.response.use(
  (res) => res.data,
  (err) => Promise.reject(err.response?.data || err)
);

export const uploadChunk = async (blobPath, recordingId, chunkIndex, isLast) => {
  const formData = new FormData();
  formData.append('audio', {
    uri: blobPath,
    name: `chunk_${chunkIndex}.m4a`,
    type: 'audio/m4a',
  });
  if (recordingId) formData.append('recordingId', recordingId);
  formData.append('chunkIndex', chunkIndex.toString());
  formData.append('isLast', isLast ? 'true' : 'false');

  return api.post('/upload/chunk', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
};

export const getRecordings = () => api.get('/recordings');
export const getRecording = (id) => api.get(`/recordings/${id}`);
export const searchRecordings = (q) => api.get(`/recordings/search?q=${q}`);

export default api;
