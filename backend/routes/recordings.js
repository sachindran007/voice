const express = require('express');
const supabaseService = require('../services/supabase');
const { retryRecording } = require('../services/recordingProcessor');

const router = express.Router();

router.get('/', async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1;
  const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);

  const result = await supabaseService.getRecordings({ page, limit });
  res.json(result);
});

router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const results = await supabaseService.searchRecordings(q.trim());
  res.json({ results, query: q, total: results?.length || 0 });
});

router.get('/:id', async (req, res) => {
  const recording = await supabaseService.getRecordingById(req.params.id);
  if (!recording) {
    return res.status(404).json({ error: 'Recording not found' });
  }

  res.json(recording);
});

router.post('/:id/retry', async (req, res) => {
  const recording = await supabaseService.getRecordingById(req.params.id);
  if (!recording) {
    return res.status(404).json({ error: 'Recording not found' });
  }

  if (!recording.chunks?.length) {
    return res.status(400).json({ error: 'Recording has no stored chunks to retry' });
  }

  await supabaseService.updateRecordingStatus(recording.id, 'processing', recording.duration || 0);
  res.json({ success: true, message: 'Retry started', id: recording.id });

  retryRecording(recording.id).catch(async (error) => {
    console.error(`Retry failed for recording ${recording.id}:`, error.message);
    await supabaseService.updateRecordingStatus(recording.id, 'error').catch(() => {});
  });
});

router.patch('/:id', async (req, res) => {
  const { title } = req.body;
  if (!title) {
    return res.status(400).json({ error: 'title is required' });
  }

  const client = supabaseService.getSupabase();
  const { data, error } = await client
    .from('recordings')
    .update({ title })
    .eq('id', req.params.id)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

router.delete('/:id', async (req, res) => {
  await supabaseService.deleteRecording(req.params.id);
  res.json({ success: true, deleted: req.params.id });
});

router.get('/:id/status', async (req, res) => {
  const recording = await supabaseService.getRecordingById(req.params.id);
  if (!recording) {
    return res.status(404).json({ error: 'Not found' });
  }

  res.json({
    id: recording.id,
    status: recording.status,
    hasTranscript: !!recording.summaries?.full_transcript,
    hasSummary: !!recording.summaries?.summary
  });
});

module.exports = router;
