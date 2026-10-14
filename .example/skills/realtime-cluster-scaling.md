# Real-Time WebSocket Scaling & SSE Comparison

## WebSockets vs Server-Sent Events (SSE)

| Feature | WebSockets (`ws://`) | Server-Sent Events (`text/event-stream`) |
|---|---|---|
| Direction | Full-Duplex (Bidirectional) | Unidirectional (Server $\rightarrow$ Client) |
| Protocol | TCP Upgrade | Standard HTTP/2, HTTP/3 |
| Reconnection | Manual reconnection logic required | Built-in native browser auto-reconnect |
| Best For | Multiplayer games, collaborative editing, chat | LLM streaming, live notifications, market tickers |
