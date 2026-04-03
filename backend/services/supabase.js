const { createClient } = require('@supabase/supabase-js');

let supabase = null;

function getSupabase() {
  if (!supabase) {
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
      || process.env.SUPABASE_SERVICE_KEY
      || process.env.SUPABASE_ANON_KEY;
    
    if (!url || !key) {
      console.warn('⚠️  Supabase not configured. Using local fallback.');
      return null;
    }
    
    supabase = createClient(url, key, {
      auth: { persistSession: false }
    });
  }
  return supabase;
}

/**
 * Upload a file buffer to Supabase Storage
 */
async function uploadToStorage(buffer, filename, contentType = 'audio/webm') {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client.storage
    .from('audio-chunks')
    .upload(filename, buffer, {
      contentType,
      upsert: true
    });

  if (error) throw error;

  const { data: urlData } = client.storage
    .from('audio-chunks')
    .getPublicUrl(filename);

  return urlData.publicUrl;
}

/**
 * Insert a new recording record
 */
async function createRecording({ title, duration = 0, userId = 'default' }) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client
    .from('recordings')
    .insert({ title, duration, user_id: userId, status: 'processing' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Insert a chunk record
 */
async function createChunk({ recordingId, chunkIndex, fileUrl, transcript = '' }) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client
    .from('chunks')
    .insert({
      recording_id: recordingId,
      chunk_index: chunkIndex,
      file_url: fileUrl,
      transcript
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Save AI summary for a recording
 */
async function saveSummary({ recordingId, fullTranscript, summary, actionItems, keyPoints, sentiment, language }) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client
    .from('summaries')
    .upsert({
      recording_id: recordingId,
      full_transcript: fullTranscript,
      summary,
      action_items: actionItems || [],
      key_points: keyPoints || [],
      sentiment: sentiment || 'neutral',
      language: language || 'en'
    }, { onConflict: 'recording_id' })
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Update recording status
 */
async function updateRecordingStatus(id, status, duration = null) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const updates = { status };
  if (duration !== null) updates.duration = duration;

  const { data, error } = await client
    .from('recordings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Get all recordings with summaries
 */
async function getRecordings({ page = 1, limit = 20 } = {}) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const offset = (page - 1) * limit;

  const { data, error, count } = await client
    .from('recordings')
    .select(`
      *,
      summaries (summary, action_items, key_points, sentiment)
    `, { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) throw error;
  return { recordings: data, total: count, page, limit };
}

/**
 * Get single recording by ID
 */
async function getRecordingById(id) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client
    .from('recordings')
    .select(`
      *,
      chunks (id, chunk_index, file_url, transcript, duration),
      summaries (*)
    `)
    .eq('id', id)
    .single();

  if (error) throw error;
  return data;
}

/**
 * Search recordings using full-text search
 */
async function searchRecordings(query) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const { data, error } = await client.rpc('search_recordings', {
    search_query: query
  });

  if (error) throw error;
  return data;
}

/**
 * Delete recording and all related data
 */
async function deleteRecording(id) {
  const client = getSupabase();
  if (!client) throw new Error('Supabase not configured');

  const { error } = await client
    .from('recordings')
    .delete()
    .eq('id', id);

  if (error) throw error;
  return true;
}

module.exports = {
  getSupabase,
  uploadToStorage,
  createRecording,
  createChunk,
  saveSummary,
  updateRecordingStatus,
  getRecordings,
  getRecordingById,
  searchRecordings,
  deleteRecording
};
