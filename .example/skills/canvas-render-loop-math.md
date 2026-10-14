# Canvas Render Loop Optimization

- Use `requestAnimationFrame` with double-buffered offscreen canvas.
- Batch path drawing operations into a single `ctx.stroke()`.
