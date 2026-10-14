# Core Web Vitals Optimization Guide

| Metric | Target | Key Techniques |
|---|---|---|
| **LCP** (Largest Contentful Paint) | `< 2.5s` | Preload critical hero images (`priority` in Next/Image), font subsetting `swap`, inline critical CSS. |
| **INP** (Interaction to Next Paint) | `< 200ms` | Break long tasks with `scheduler.yield()`, avoid heavy synchronous React state calculations on input changes. |
| **CLS** (Cumulative Layout Shift) | `< 0.1` | Always declare `width` & `height` or `aspect-ratio` on images/videos; reserve space for dynamic ads/banners. |
