# Real-Time Voice Agent & WebRTC Architecture

## Latency Optimization Breakdown

| Pipeline Stage | Target Latency | Optimization Strategy |
|---|---|---|
| **VAD (Voice Activity Detection)** | `< 50ms` | Run Silero VAD locally in WebAssembly or C++ |
| **STT (Speech to Text)** | `< 120ms` | Streaming WebSocket with Deepgram Nova-3 / AssemblyAI |
| **LLM Time-to-First-Token (TTFT)** | `< 180ms` | Fast inference models (Gemini Flash / Groq Llama 3.3) |
| **TTS (Text to Speech)** | `< 100ms` | Chunked streaming output via Cartesia Sonic / ElevenLabs |
| **Total Voice Turnaround** | **`< 450ms`** | Natural conversation fluidity without conversational lag |
