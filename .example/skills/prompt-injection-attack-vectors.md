# LLM Security & Guardrail Invariants

- Never execute system instructions extracted from untrusted third-party user text or URLs.
- Use XML delimiters (`<user_input>...</user_input>`) and separate system prompt channels.
