import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadChunk, finalizeRecording } from '../services/api'

const CHUNK_DURATION_MS = 30_000 // 30 seconds

export function useRecorder() {
  const [state, setState] = useState('idle') // idle | recording | processing | error
  const [elapsed, setElapsed] = useState(0)   // total seconds
  const [chunkCount, setChunkCount] = useState(0)
  const [currentRecordingId, setCurrentRecordingId] = useState(null)
  const [error, setError] = useState(null)
  const [chunkProgress, setChunkProgress] = useState([]) // track chunk upload status

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const chunkTimerRef = useRef(null)
  const recordingIdRef = useRef(null)
  const chunkIndexRef = useRef(0)
  const isStoppingRef = useRef(false)

  // Clean up on unmount
  useEffect(() => {
    return () => stopAllTimers()
  }, [])

  function stopAllTimers() {
    clearInterval(timerRef.current)
    clearTimeout(chunkTimerRef.current)
  }

  // ── Detect best supported MIME type ──────────────────────────────────────
  function getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ]
    return types.find((t) => MediaRecorder.isTypeSupported(t)) || ''
  }

  // ── Send one chunk to backend ─────────────────────────────────────────────
  async function sendChunk(blob, chunkIndex, isLast = false) {
    const mimeType = blob.type || 'audio/webm'
    setChunkProgress((prev) => [...prev, { index: chunkIndex, status: 'uploading' }])

    try {
      const res = await uploadChunk({
        blob,
        recordingId: recordingIdRef.current,
        chunkIndex,
        isLast,
        mimeType
      })

      // First chunk gives us the recordingId
      if (!recordingIdRef.current && res.recordingId) {
        recordingIdRef.current = res.recordingId
        setCurrentRecordingId(res.recordingId)
      }

      setChunkProgress((prev) =>
        prev.map((c) => c.index === chunkIndex ? { ...c, status: 'done' } : c)
      )
      setChunkCount((n) => n + 1)
    } catch (err) {
      console.error(`Chunk ${chunkIndex} upload failed:`, err)
      setChunkProgress((prev) =>
        prev.map((c) => c.index === chunkIndex ? { ...c, status: 'error' } : c)
      )
    }
  }

  // ── Start recording ───────────────────────────────────────────────────────
  const startRecording = useCallback(async () => {
    try {
      setError(null)
      isStoppingRef.current = false
      chunkIndexRef.current = 0
      recordingIdRef.current = null
      setCurrentRecordingId(null)
      setChunkCount(0)
      setChunkProgress([])
      setElapsed(0)

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1
        }
      })
      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const mr = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = mr

      // Each 30s dataavailable fires
      mr.addEventListener('dataavailable', async (e) => {
        if (e.data && e.data.size > 100) {
          const idx = chunkIndexRef.current++
          const isLast = isStoppingRef.current
          await sendChunk(e.data, idx, isLast)
        }
      })

      // Start recording with 30s time slices
      mr.start(CHUNK_DURATION_MS)
      setState('recording')

      // Elapsed timer
      const startTime = Date.now()
      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTime) / 1000))
      }, 1000)
    } catch (err) {
      setError(err.message || 'Microphone access denied')
      setState('error')
    }
  }, [])

  // ── Stop recording ────────────────────────────────────────────────────────
  const stopRecording = useCallback(async () => {
    if (!mediaRecorderRef.current || state !== 'recording') return

    isStoppingRef.current = true
    stopAllTimers()
    setState('processing')

    // Request last chunk
    mediaRecorderRef.current.stop()

    // Stop all audio tracks
    streamRef.current?.getTracks().forEach((t) => t.stop())

    // Wait a moment for the last dataavailable to fire, then finalize
    setTimeout(async () => {
      if (recordingIdRef.current) {
        try {
          await finalizeRecording(recordingIdRef.current)
        } catch (err) {
          console.warn('Finalize call failed (may still process):', err)
        }
      }
      setState('idle')
    }, 2000)
  }, [state])

  // ── Format elapsed time ───────────────────────────────────────────────────
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return {
    state,
    elapsed,
    formattedTime: formatTime(elapsed),
    chunkCount,
    chunkProgress,
    currentRecordingId,
    error,
    startRecording,
    stopRecording,
    isRecording: state === 'recording',
    isProcessing: state === 'processing'
  }
}
