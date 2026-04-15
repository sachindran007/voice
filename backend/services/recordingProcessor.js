const supabaseService = require('./supabase');
const geminiService = require('./gemini');

function getTotalDuration(chunks = []) {
  return chunks.reduce((sum, chunk) => {
    return sum + Math.max(0, parseInt(chunk.duration, 10) || 0);
  }, 0);
}

function buildTranscriptParts(chunks = [], latestTranscript = null) {
  const transcriptParts = [...chunks]
    .sort((a, b) => a.chunk_index - b.chunk_index)
    .map((chunk) => chunk.transcript);

  if (latestTranscript && !transcriptParts.includes(latestTranscript)) {
    transcriptParts.push(latestTranscript);
  }

  return transcriptParts;
}

async function finalizeRecording(recordingId, latestTranscript = null) {
  const recording = await supabaseService.getRecordingById(recordingId);
  if (!recording) return;

  const chunks = recording.chunks || [];
  const transcriptParts = buildTranscriptParts(chunks, latestTranscript);
  const fullTranscript = transcriptParts
    .filter((text) => text && text !== '[SILENT]' && text !== '[ERROR]')
    .join(' ')
    .trim();

  console.log(`[Summary] Processing transcript for ${recordingId} (Length: ${fullTranscript.length})`);

  if (!fullTranscript) {
    const hasTranscriptionErrors = transcriptParts.some((text) => text === '[ERROR]');
    const status = hasTranscriptionErrors ? 'error' : 'ready';
    const summary = hasTranscriptionErrors
      ? 'Transcription failed because the AI service was temporarily unavailable. Retry this recording to process it again.'
      : 'No meaningful content to summarize.';

    await supabaseService.saveSummary({
      recordingId,
      fullTranscript: '',
      summary,
      actionItems: [],
      keyPoints: [],
      sentiment: 'neutral',
      language: 'en'
    });
    await supabaseService.updateRecordingStatus(recordingId, status, getTotalDuration(chunks));

    console.log(`Recording ${recordingId} finalized with status: ${status}`);
    return;
  }

  const { summary, actionItems, keyPoints, sentiment, language } =
    await geminiService.generateSummary(fullTranscript);

  await supabaseService.saveSummary({
    recordingId,
    fullTranscript,
    summary,
    actionItems,
    keyPoints,
    sentiment,
    language
  });

  await supabaseService.updateRecordingStatus(recordingId, 'ready', getTotalDuration(chunks));
  console.log(`Recording ${recordingId} finalized`);
}

async function retryRecording(recordingId) {
  const recording = await supabaseService.getRecordingById(recordingId);
  if (!recording) {
    throw new Error('Recording not found');
  }

  const chunks = [...(recording.chunks || [])].sort((a, b) => a.chunk_index - b.chunk_index);
  if (chunks.length === 0) {
    throw new Error('Recording has no chunks to reprocess');
  }

  await supabaseService.updateRecordingStatus(recordingId, 'processing', getTotalDuration(chunks));

  for (const chunk of chunks) {
    try {
      const transcript = await geminiService.transcribeStoredAudio(chunk.file_url);
      await supabaseService.updateChunkTranscript(chunk.id, transcript);
    } catch (error) {
      console.error(`Retry transcription failed for chunk ${chunk.id}:`, error.message);
      await supabaseService.updateChunkTranscript(chunk.id, '[ERROR]');
    }
  }

  await finalizeRecording(recordingId);
}

module.exports = {
  finalizeRecording,
  retryRecording
};
