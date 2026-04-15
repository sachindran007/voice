const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

const supabaseService = require('../services/supabase');
const geminiService = require('../services/gemini');
const { finalizeRecording } = require('../services/recordingProcessor');

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
  limits: { fileSize: 25 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav', 'audio/mpeg', 'audio/aac', 'audio/x-m4a'];
    if (allowed.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${file.mimetype}`));
    }
  }
});

router.post('/chunk', upload.single('audio'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No audio file provided' });
  }

  const { recordingId, chunkIndex = 0, isLast = 'false', duration = 0 } = req.body;
  const filePath = req.file.path;
  let shouldDeleteLocalFile = false;

  try {
    let recId = recordingId;

    if (!recId) {
      const recording = await supabaseService.createRecording({
        title: `Recording ${new Date().toLocaleDateString('en-IN', {
          day: 'numeric', month: 'short', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })}`
      });
      recId = recording.id;
    }

    let transcript = '';
    try {
      transcript = await geminiService.transcribeChunk(filePath);
    } catch (transcriptErr) {
      console.error('Chunk transcription failed:', transcriptErr.message);
      transcript = '[ERROR]';
    }

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

    const chunk = await supabaseService.createChunk({
      recordingId: recId,
      chunkIndex: parseInt(chunkIndex, 10),
      fileUrl,
      duration: Math.max(0, parseInt(duration, 10) || 0),
      transcript
    });

    const response = {
      success: true,
      recordingId: recId,
      chunk: { id: chunk.id, index: chunk.chunk_index, transcript }
    };

    if (isLast === 'true') {
      response.processing = true;
      finalizeRecording(recId, transcript).catch(console.error);
    }

    res.json(response);
  } catch (error) {
    console.error('Chunk upload error:', error);
    res.status(500).json({ error: error.message });
  } finally {
    if (shouldDeleteLocalFile || res.statusCode >= 500) {
      cleanupLocalFile(filePath);
    }
  }
});

router.post('/finalize', async (req, res) => {
  const { recordingId } = req.body;
  if (!recordingId) {
    return res.status(400).json({ error: 'recordingId is required' });
  }

  try {
    res.json({ success: true, message: 'Processing started' });
    await finalizeRecording(recordingId);
  } catch (error) {
    console.error('Finalize error:', error);
  }
});

module.exports = router;
