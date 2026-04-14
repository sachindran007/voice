const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const supabaseService = require('../services/supabase');
const geminiService = require('../services/gemini');

const router = express.Router();

function cleanupLocalFile(filePath) {
  if (!filePath) return;

  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (cleanupErr) {
    console.warn('Failed to clean up local upload:', cleanupErr.message);
  }
}

// ── Multer configuration ────────────────────────────────────────────────────
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `chunk_${Date.now()}_${uuidv4()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB per chunk
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

// ── POST /api/upload/chunk ──────────────────────────────────────────────────
// Upload a single 30-second audio chunk
router.post('/chunk', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const { recordingId, chunkIndex = 0, isLast = 'false', duration = 0 } = req.body;
  const filePath = req.file.path;
  let shouldDeleteLocalFile = false;

  try {
    let recId = recordingId;

    // Create a new recording if no ID provided
    if (!recId) {
      const recording = await supabaseService.createRecording({
        title: `Recording ${new Date().toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}`
      });
      recId = recording.id;
    }

    // Transcribe the chunk
    let transcript = '';
    try {
      transcript = await geminiService.transcribeChunk(filePath);
    } catch (transcriptErr) {
      console.error('Chunk transcription failed:', transcriptErr.message);
      transcript = '[Transcription failed]';
    }

    // Upload to Supabase Storage (if configured) or use local path
    let fileUrl = `/uploads/${req.file.filename}`;
    try {
      const fileBuffer = fs.readFileSync(filePath);
      fileUrl = await supabaseService.uploadToStorage(
        fileBuffer,
        `chunks/${recId}/${req.file.filename}`,
        req.file.mimetype
      );
      shouldDeleteLocalFile = true;
    } catch (storageErr) {
      console.warn('Storage upload failed, using local URL:', storageErr.message);
    }

    // Save chunk to database
    const chunk = await supabaseService.createChunk({
      recordingId: recId,
      chunkIndex: parseInt(chunkIndex),
      fileUrl,
      duration: Math.max(0, parseInt(duration, 10) || 0),
      transcript
    });

    const response = {
      success: true,
      recordingId: recId,
      chunk: { id: chunk.id, index: chunk.chunk_index, transcript }
    };

    // If this is the last chunk, generate summary
    if (isLast === 'true') {
      response.processing = true;
      // Pass the current transcript to ensure it's included in summary
      generateFinalSummary(recId, transcript).catch(console.error);
    }

    res.json(response);
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    // Delete the local upload when it is no longer needed.
    if (shouldDeleteLocalFile || res.statusCode >= 500) {
      cleanupLocalFile(filePath);
    }
  }
});

// ── POST /api/upload/finalize ───────────────────────────────────────────────
// Force finalize a recording (generate summary from existing chunks)
router.post('/finalize', async (req, res) => {
  const { recordingId } = req.body;
  if (!recordingId) {
    return res.status(400).json({ error: 'recordingId is required' });
  }

  try {
    res.json({ success: true, message: 'Processing started' });
    await generateFinalSummary(recordingId);
  } catch (error) {
    console.error('Finalize error:', error);
  }
});

// ── Helper: generate complete summary from chunks ───────────────────────────
async function generateFinalSummary(recordingId, latestTranscript = null) {
  try {
    const recording = await supabaseService.getRecordingById(recordingId);
    if (!recording) return;

    let chunks = recording.chunks || [];
    
    // Build full transcript, ensuring we don't duplicate or miss the latest one
    let transcriptParts = chunks
      .sort((a, b) => a.chunk_index - b.chunk_index)
      .map(c => c.transcript);

    // If we just got a transcript but it's not in the DB yet, add it
    if (latestTranscript && !transcriptParts.includes(latestTranscript)) {
      transcriptParts.push(latestTranscript);
    }

    const fullTranscript = transcriptParts
      .filter(t => t && t !== '[SILENT]' && t !== '[ERROR]')
      .join(' ')
      .trim();

    console.log(`[Summary] Processing transcript for ${recordingId} (Length: ${fullTranscript.length})`);

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

    const totalDuration = chunks.reduce((sum, chunk) => {
      return sum + Math.max(0, parseInt(chunk.duration, 10) || 0);
    }, 0);
    await supabaseService.updateRecordingStatus(recordingId, 'ready', totalDuration);

    console.log(`✅ Recording ${recordingId} finalized`);
  } catch (error) {
    console.error(`❌ Summary generation failed for ${recordingId}:`, error.message);
    await supabaseService.updateRecordingStatus(recordingId, 'error').catch(() => {});
  }
}

module.exports = router;
