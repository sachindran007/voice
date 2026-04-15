const { GoogleGenAI } = require('@google/genai');
const fs = require('fs');
const path = require('path');

let ai = null;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isTransientGeminiError(error) {
  const message = error?.message || '';
  return /status:\s*(429|500|502|503|504)\b/i.test(message);
}

function getMimeTypeFromPath(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const mimeMap = {
    '.webm': 'audio/webm',
    '.mp4': 'audio/mp4',
    '.m4a': 'audio/mp4',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp3': 'audio/mpeg',
    '.aac': 'audio/aac',
  };

  return mimeMap[ext] || 'audio/webm';
}

function getAI() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('GEMINI_API_KEY is not set');
    ai = new GoogleGenAI({ apiKey });
  }
  return ai;
}

/**
 * Transcribe a single audio file and translate Tamil speech to English
 * @param {string} filePath - local path to audio file
 * @returns {string} transcript
 */
async function transcribeAudioBuffer(fileBuffer, mimeType = 'audio/webm') {
  const geminiAI = getAI();
  const base64Audio = fileBuffer.toString('base64');

  const prompt = `
Transcribe this audio exactly.
Return only the transcript text in English.
If the speaker uses Tamil, translate it to natural English instead of returning Tamil script.
If the speaker mixes Tamil and English, normalize the final output into English.
If multiple speakers exist, label them as Speaker 1, Speaker 2.
Do not summarize.
If the audio is completely silent or contains zero speech, return exactly: [SILENT]
  `;

  const maxAttempts = 3;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await geminiAI.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType,
                  data: base64Audio
                }
              },
              {
                text: prompt
              }
            ]
          }
        ]
      });
      const text = (response.text || '').trim();
      console.log(`[Gemini] Transcript result: "${text}"`);
      return text || '[SILENT]';
    } catch (error) {
      const transient = isTransientGeminiError(error);
      console.error(
        `[Gemini] Transcription error (attempt ${attempt}/${maxAttempts}):`,
        error.message
      );

      if (!transient || attempt === maxAttempts) {
        return '[ERROR]';
      }

      const backoffMs = attempt * 1500;
      console.warn(`[Gemini] Retrying transcription in ${backoffMs}ms`);
      await sleep(backoffMs);
    }
  }

  return '[ERROR]';
}

async function transcribeChunk(filePath) {
  const fileData = fs.readFileSync(filePath);
  const mimeType = getMimeTypeFromPath(filePath);
  return transcribeAudioBuffer(fileData, mimeType);
}

async function transcribeStoredAudio(fileUrl) {
  if (!fileUrl) {
    throw new Error('fileUrl is required');
  }

  if (/^https?:\/\//i.test(fileUrl)) {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch stored audio: ${response.status} ${response.statusText}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);
    const mimeType = getMimeTypeFromPath(new URL(fileUrl).pathname);
    return transcribeAudioBuffer(fileBuffer, mimeType);
  }

  const normalizedPath = fileUrl.replace(/^\/+/, '').replace(/\//g, path.sep);
  const localPath = path.join(__dirname, '..', normalizedPath);

  if (!fs.existsSync(localPath)) {
    throw new Error(`Stored local audio not found: ${localPath}`);
  }

  return transcribeChunk(localPath);
}

/**
 * Transcribe a local audio file from an absolute path
 * @param {string} audioPath
 * @returns {string} transcript
 */
async function transcribeFile(audioPath) {
  if (!audioPath) {
    throw new Error('audioPath is required');
  }

  if (!fs.existsSync(audioPath)) {
    throw new Error(`Audio file not found: ${audioPath}`);
  }

  return transcribeChunk(audioPath);
}

/**
 * Generate comprehensive summary from full transcript
 * @param {string} fullTranscript 
 * @returns {{ summary, actionItems, keyPoints, sentiment, language }}
 */
async function generateSummary(fullTranscript) {
  const geminiAI = getAI();

  if (!fullTranscript || fullTranscript.trim().length < 10) {
    console.warn(`[Gemini] Transcript too short (${fullTranscript?.length || 0} chars). Skipping summary.`);
    return {
      summary: 'No meaningful content to summarize.',
      actionItems: [],
      keyPoints: [],
      sentiment: 'neutral',
      language: 'en'
    };
  }

  console.log(`[Gemini] Generating summary for transcript of length: ${fullTranscript.length}`);

  const prompt = `
Analyze this meeting transcript and generate a valid JSON object in English.
Do not use markdown fences.

JSON Schema:
{
  "summary": "Concise English summary",
  "action_items": ["item 1", "item 2"],
  "key_points": ["point 1", "point 2"],
  "sentiment": "positive/neutral/negative",
  "language": "en"
}

Transcript:
${fullTranscript}
  `;

  try {
    const maxAttempts = 3;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await geminiAI.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt
        });
        let text = (response.text || '').trim();

        // Extra safety: remove potential markdown wrapper
        text = text.replace(/^```json\s*/, '').replace(/\s*```$/, '');

        let parsed;
        try {
          parsed = JSON.parse(text);
        } catch (e) {
          console.warn('[Gemini] JSON parse failed, returning fallback.', e.message);
          return {
            summary: fullTranscript,
            actionItems: [],
            keyPoints: [],
            sentiment: 'neutral',
            language: 'en'
          };
        }

        return {
          summary: parsed.summary || 'Summary could not be generated.',
          actionItems: Array.isArray(parsed.action_items) ? parsed.action_items : [],
          keyPoints: Array.isArray(parsed.key_points) ? parsed.key_points : [],
          sentiment: parsed.sentiment || 'neutral',
          language: parsed.language || 'en'
        };
      } catch (error) {
        const transient = isTransientGeminiError(error);
        console.error(
          `[Gemini] Summary generation error (attempt ${attempt}/${maxAttempts}):`,
          error.message
        );

        if (!transient || attempt === maxAttempts) {
          return {
            summary: fullTranscript,
            actionItems: [],
            keyPoints: [],
            sentiment: 'neutral',
            language: 'en'
          };
        }

        const backoffMs = attempt * 1500;
        console.warn(`[Gemini] Retrying summary generation in ${backoffMs}ms`);
        await sleep(backoffMs);
      }
    }
  } catch (error) {
    console.error('Summary generation error:', error.message);
  }

  return {
    summary: fullTranscript,
    actionItems: [],
    keyPoints: [],
    sentiment: 'neutral',
    language: 'en'
  };
}

/**
 * Process multiple chunks and combine transcripts
 * @param {Array<{filePath: string, chunkIndex: number}>} chunks
 * @returns {{ transcripts: string[], fullTranscript: string, summary: object }}
 */
async function processAllChunks(chunks) {
  const transcripts = [];

  // Process chunks in sequence (rate limit friendly)
  for (const chunk of chunks.sort((a, b) => a.chunkIndex - b.chunkIndex)) {
    try {
      const transcript = await transcribeChunk(chunk.filePath);
      transcripts.push({ index: chunk.chunkIndex, text: transcript });
      // Small delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (err) {
      console.error(`Chunk ${chunk.chunkIndex} failed:`, err.message);
      transcripts.push({ index: chunk.chunkIndex, text: '[Transcription failed]' });
    }
  }

  const fullTranscript = transcripts
    .sort((a, b) => a.index - b.index)
    .map(t => t.text)
    .filter(t => t !== '[No speech detected]')
    .join(' ');

  const summary = await generateSummary(fullTranscript);

  return {
    transcripts: transcripts.map(t => t.text),
    fullTranscript,
    ...summary
  };
}

module.exports = {
  transcribeChunk,
  transcribeStoredAudio,
  transcribeFile,
  generateSummary,
  processAllChunks
};
