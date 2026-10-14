# Banned AI-Slop Patterns & Anti-Vocabulary

## 🚫 Banned AI Vocabulary (Phrases to Kill)

| Banned Phrase | Rationale | Better Alternative |
|---|---|---|
| *Delve into...* | Overused LLM cliché | *Inspect*, *examine*, *analyze* or just state the topic |
| *In today's fast-paced digital world...* | Empty filler waffle | Omit completely |
| *It is crucial / vital / essential to remember...* | Paternalistic padding | *Note: ...* or direct instruction |
| *Tapestry / Testament / Beacon / Paradigm* | Hallmarks of unedited AI text | Use concrete technical descriptions |
| *Seamlessly integrate...* | Marketing fluff | *Integrates via REST / hooks* |
| *Certainly! I'd be happy to help you with that!* | Chatbot throat-clearing | Start directly with the answer |
| *Hope this helps! Let me know if you have questions!* | Tail fluff | Omit completely |

---

## 🚫 Banned Coding Anti-Patterns

1. **The Syntax Echo Comment**:
   ```typescript
   // BAD:
   // Sets the status to active
   user.status = 'ACTIVE';

   // GOOD: (No comment needed, the code is self-documenting)
   user.status = 'ACTIVE';
   ```

2. **The Lazy Ellipsis / Phantom Code**:
   ```python
   # BAD:
   def process_data(payload):
       # ... rest of validation logic ...
       save_to_db(payload)

   # GOOD:
   def process_data(payload: InboundPayload) -> ProcessedResult:
       validate_checksum(payload)
       sanitized = sanitize_payload(payload)
       return save_to_db(sanitized)
   ```

3. **Silent Failure / Swallowed Errors**:
   ```javascript
   // BAD:
   try {
     await sendEvent();
   } catch (err) {}

   // GOOD:
   try {
     await sendEvent();
   } catch (err) {
     logger.error({ err, context: 'sendEvent' }, 'Failed to deliver event');
     throw new EventDeliveryError('Downstream dispatch failure', { cause: err });
   }
   ```
