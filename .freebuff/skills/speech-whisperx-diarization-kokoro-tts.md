---
name: speech-whisperx-diarization-kokoro-tts
description: Build end-to-end voice intelligence: WhisperX speech-to-text with phoneme alignment, PyAnnote speaker diarization, and Kokoro-82M TTS synthesis.
---

# 🎙️ WhisperX Diarization & Kokoro TTS Speech Pipeline

This skill provides an ultra-fast speech processing pipeline combining word-level ASR, multi-speaker diarization, and natural neural TTS.

---

## 🎯 Production Invariants
1. Use `faster-whisper` or `whisperx` with batched inference to achieve 20x faster-than-realtime transcription.
2. Align audio with phoneme models to obtain word-level millisecond timestamps.
3. Synthesize voice with lightweight, low-latency models (Kokoro-82M) capable of streaming audio chunks under 100ms.

---

## 💻 WhisperX Transcription & Alignment (`transcribe_diarize.py`)

```python
import whisperx
import torch

device = "cuda" if torch.cuda.is_available() else "cpu"
audio_file = "meeting_sample.wav"
batch_size = 16
compute_type = "float16" if device == "cuda" else "int8"

# 1. Transcribe with WhisperX
model = whisperx.load_model("large-v3", device, compute_type=compute_type)
audio = whisperx.load_audio(audio_file)
result = model.transcribe(audio, batch_size=batch_size)

# 2. Word-level Phoneme Alignment
align_model, metadata = whisperx.load_align_model(language_code=result["language"], device=device)
aligned_result = whisperx.align(result["segments"], align_model, metadata, audio, device, return_char_alignments=False)

for seg in aligned_result["segments"]:
    print(f"[{seg['start']:.2f}s -> {seg['end']:.2f}s] {seg['text']}")

print("✅ Word-level transcription complete with aligned timestamps.")
```
