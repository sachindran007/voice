import { useState, useRef, useCallback, useEffect } from 'react'
import { uploadChunk } from '../services/api'

export function useRecorder() {
  const [state, setState] = useState('idle') // idle | recording | processing | error
  const [elapsed, setElapsed] = useState(0)
  const [currentRecordingId, setCurrentRecordingId] = useState(null)
  const [error, setError] = useState(null)

  const mediaRecorderRef = useRef(null)
  const streamRef = useRef(null)
  const timerRef = useRef(null)
  const recordingIdRef = useRef(null)
  const startTimeRef = useRef(null)
  const recordedChunksRef = useRef([])

  useEffect(() => {
    return () => {
      clearInterval(timerRef.current)
      streamRef.current?.getTracks().forEach((track) => track.stop())
    }
  }, [])

  function getSupportedMimeType() {
    const types = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/ogg;codecs=opus',
      'audio/ogg',
      'audio/mp4',
    ]

    return types.find((type) => MediaRecorder.isTypeSupported(type)) || ''
  }

  const startRecording = useCallback(async () => {
    try {
      setError(null)
      setElapsed(0)
      setCurrentRecordingId(null)
      recordingIdRef.current = null
      recordedChunksRef.current = []
      startTimeRef.current = Date.now()

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
          channelCount: 1,
        },
      })

      streamRef.current = stream

      const mimeType = getSupportedMimeType()
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {})
      mediaRecorderRef.current = recorder

      recorder.addEventListener('dataavailable', (event) => {
        if (event.data && event.data.size > 100) {
          recordedChunksRef.current.push(event.data)
        }
      })

      recorder.start()
      setState('recording')

      timerRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000))
      }, 1000)
    } catch (err) {
      setError(err.message || 'Microphone access denied')
      setState('error')
    }
  }, [])

  const stopRecording = useCallback(async () => {
    const recorder = mediaRecorderRef.current
    if (!recorder || state !== 'recording') return

    clearInterval(timerRef.current)
    setState('processing')

    const duration = Math.max(1, Math.round((Date.now() - startTimeRef.current) / 1000))

    recorder.addEventListener('stop', async () => {
      try {
        const blob = new Blob(recordedChunksRef.current, {
          type: recorder.mimeType || getSupportedMimeType() || 'audio/webm',
        })

        if (blob.size <= 100) {
          throw new Error('Recording was empty')
        }

        const response = await uploadChunk({
          blob,
          recordingId: recordingIdRef.current,
          chunkIndex: 0,
          isLast: true,
          duration,
          mimeType: blob.type || recorder.mimeType || 'audio/webm',
        })

        if (response.recordingId) {
          recordingIdRef.current = response.recordingId
          setCurrentRecordingId(response.recordingId)
        }

        setElapsed(duration)
        setState('idle')
      } catch (err) {
        setError(err.message || 'Failed to process recording')
        setState('error')
      } finally {
        streamRef.current?.getTracks().forEach((track) => track.stop())
        mediaRecorderRef.current = null
        streamRef.current = null
        recordedChunksRef.current = []
      }
    }, { once: true })

    recorder.stop()
  }, [state])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  return {
    state,
    elapsed,
    formattedTime: formatTime(elapsed),
    currentRecordingId,
    error,
    startRecording,
    stopRecording,
    isRecording: state === 'recording',
    isProcessing: state === 'processing',
  }
}
