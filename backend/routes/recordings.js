const express = require('express');
const supabaseService = require('../services/supabase');

const router = express.Router();

// ── GET /api/recordings ─────────────────────────────────────────────────────
router.get('/', async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = Math.min(parseInt(req.query.limit) || 20, 100);
  
  const result = await supabaseService.getRecordings({ page, limit });
  res.json(result);
});

// ── GET /api/recordings/search ──────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return res.status(400).json({ error: 'Query must be at least 2 characters' });
  }

  const results = await supabaseService.searchRecordings(q.trim());
  res.json({ results, query: q, total: results?.length || 0 });
});

// ── GET /api/recordings/:id ─────────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  const recording = await supabaseService.getRecordingById(req.params.id);
  if (!recording) {
    return res.status(404).json({ error: 'Recording not found' });
  }
  res.json(recording);
});

// ── PATCH /api/recordings/:id ───────────────────────────────────────────────
router.patch('/:id', async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'title is required' });
  
  const client = supabaseService.getSupabase();
  const { data, error } = await client
    .from('recordings')
    .update({ title })
    .eq('id', req.params.id)
    .select()
    .single();
  
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

// ── DELETE /api/recordings/:id ──────────────────────────────────────────────
router.delete('/:id', async (req, res) => {
  await supabaseService.deleteRecording(req.params.id);
  res.json({ success: true, deleted: req.params.id });
});

// ── GET /api/recordings/:id/status ─────────────────────────────────────────
router.get('/:id/status', async (req, res) => {
  const recording = await supabaseService.getRecordingById(req.params.id);
  if (!recording) return res.status(404).json({ error: 'Not found' });
  res.json({
    id: recording.id,
    status: recording.status,
    hasTranscript: !!recording.summaries?.full_transcript,
    hasSummary: !!recording.summaries?.summary
  });
});

module.exports = router;
