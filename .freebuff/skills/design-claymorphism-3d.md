---
name: design-claymorphism-3d
description: Design tactile, 3D soft-clay UI components. Double inner shadows, rounded organic curves, vibrant pastel surfaces, and friendly tactile micro-interactions.
---

# 🧸 Claymorphism 3D Tactile Design System

Claymorphism creates friendly, inviting, touchable interfaces through soft 3D volumes, thick rounded corners, and dual directional inner shadows.

---

## 🎨 CLAY TOKENS & SHADOW RECIPES

### 1. The Claymorphic Volume Recipe
Unlike flat cards or glassmorphism, clay surfaces require **outer depth + double inner lighting**:
```css
.clay-card {
  background: #f0f3f8;
  border-radius: 24px;
  /* 1. External drop shadow (elevation) */
  /* 2. Top-left inner light reflection */
  /* 3. Bottom-right inner ambient shadow */
  box-shadow: 
    12px 12px 24px rgba(166, 180, 200, 0.45),
    inset -8px -8px 16px rgba(166, 180, 200, 0.35),
    inset 8px 8px 16px rgba(255, 255, 255, 0.95);
  transition: transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.2s ease;
}

.clay-button {
  background: #6366f1;
  color: #ffffff;
  border-radius: 18px;
  box-shadow: 
    6px 6px 14px rgba(99, 102, 241, 0.35),
    inset -4px -4px 8px rgba(49, 46, 129, 0.4),
    inset 4px 4px 8px rgba(199, 210, 254, 0.6);
}

.clay-button:active {
  transform: scale(0.96);
  box-shadow: 
    2px 2px 6px rgba(99, 102, 241, 0.25),
    inset -2px -2px 4px rgba(49, 46, 129, 0.5),
    inset 2px 2px 4px rgba(199, 210, 254, 0.7);
}
```

### 2. High-Chroma Pastel Palette
- **Cotton Candy**: `#FBCFE8`
- **Soft Sky**: `#BAE6FD`
- **Pistachio Clay**: `#BBF7D0`
- **Butter Cream**: `#FEF08A`
- **Lavender Cloud**: `#DDD6FE`

### 3. Best Use-Cases
- Gamified dashboards & learning portals
- Friendly fintech savings targets
- Creative tools & tactile micro-widgets
