# RFC: JASAKITE UI/UX Complete Overhaul

**Status:** Proposed
**Author:** @architect + @planner
**Date:** September 2, 2026
**Complexity:** Tier 3 (Deep Swarm)

---

## 📋 Executive Summary

RFC ini merencanakan **overhaul UI/UX menyeluruh** untuk JASAKITE — marketplace jasa lokal Indonesia. Berdasarkan audit lengkap (skor 7.2/10), terdapat **15 area perbaikan** yang perlu dikerjakan secara terstruktur.

**Target:** Meningkatkan skor UI/UX dari 7.2/10 menjadi 9.0/10

---

## 🎯 Goals

1. **Zero blank screens** — Semua halaman punya loading/error/empty state
2. **Inline validation** — Form menampilkan error di field yang salah
3. **Dark mode polish** — Kontras lolos WCAG AA di semua komponen
4. **Micro-interactions** — Setiap aksi user ada feedback visual
5. **Optimistic updates** — UI langsung responsif tanpa menunggu server
6. **Keyboard navigation** — Semua fitur bisa diakses tanpa mouse
7. **Onboarding flow** — Pengguna baru tahu apa yang harus dilakukan
8. **Notification center** — Notifikasi terkelompok dengan mark-as-read
9. **Mobile gestures** — Swipe, pull-to-refresh, haptic feedback
10. **Search UX** — Recent searches, keyboard navigation, preview

---

## 📊 Task Breakdown

### 🔴 Phase 1: Critical Fixes (Must Have)

| # | Task | Subagent | Skill | Files | Est. |
|---|------|----------|-------|-------|------|
| 1.1 | Add error boundaries to all route segments | `@frontend` | `frontend-builder` | `app/*/error.tsx` | 2h |
| 1.2 | Add loading skeletons to service detail | `@frontend` | `frontend-builder` | `app/service/[slug]/*` | 1h |
| 1.3 | Add loading skeletons to order detail | `@frontend` | `frontend-builder` | `app/orders/[id]/*` | 1h |
| 1.4 | Add inline form validation to registration | `@frontend` | `implement-feature` | `app/(auth)/register/*` | 3h |
| 1.5 | Add inline form validation to checkout | `@frontend` | `implement-feature` | `app/checkout/*` | 2h |
| 1.6 | Add inline form validation to service creation | `@frontend` | `implement-feature` | `app/dashboard/provider/buka-jasa/*` | 2h |
| 1.7 | Add retry buttons on failed data loads | `@frontend` | `frontend-builder` | `components/ui/error-panel.tsx` | 1h |
| 1.8 | Fix dark mode input contrast | `@design-engineer` | `dark-mode-system-theming` | `components/ui/input.tsx` | 0.5h |
| 1.9 | Fix dark mode card border contrast | `@design-engineer` | `dark-mode-system-theming` | `app/globals.css` | 0.5h |

**Total Phase 1:** ~13 hours

---

### 🟠 Phase 2: UX Enhancements (Should Have)

| # | Task | Subagent | Skill | Files | Est. |
|---|------|----------|-------|-------|------|
| 2.1 | Add optimistic updates to service toggle | `@frontend` | `implement-feature` | `components/provider/*` | 2h |
| 2.2 | Add optimistic updates to saved service toggle | `@frontend` | `implement-feature` | `components/services/save-button.tsx` | 1h |
| 2.3 | Add optimistic updates to review submission | `@frontend` | `implement-feature` | `components/orders/review-form.tsx` | 2h |
| 2.4 | Add keyboard shortcut `/` for search | `@frontend` | `frontend-builder` | `components/layout/search-bar.tsx` | 1h |
| 2.5 | Add keyboard shortcuts for kanban actions | `@frontend` | `frontend-builder` | `components/provider/order-kanban.tsx` | 2h |
| 2.6 | Add focus trap to all modals | `@accessibility-champion` | `accessible-wcag-aaa-keyboard-aria` | `components/ui/dialog.tsx` | 1h |
| 2.7 | Add `aria-live` regions for dynamic content | `@accessibility-champion` | `accessible-wcag-aaa-keyboard-aria` | Multiple files | 2h |
| 2.8 | Add notification grouping | `@frontend` | `implement-feature` | `components/layout/notification-bell.tsx` | 3h |
| 2.9 | Add notification mark-as-read | `@frontend` | `implement-feature` | `components/layout/notification-bell.tsx` | 2h |
| 2.10 | Add search recent history | `@frontend` | `implement-feature` | `components/layout/search-bar.tsx` | 2h |
| 2.11 | Add search keyboard navigation | `@frontend` | `frontend-builder` | `components/layout/search-bar.tsx` | 1h |
| 2.12 | Add micro-interactions to filter chips | `@frontend` | `web-design-guidelines` | `components/services/catalog-filters.tsx` | 1h |
| 2.13 | Add micro-interactions to save button | `@frontend` | `web-design-guidelines` | `components/services/save-button.tsx` | 1h |
| 2.14 | Add page transition animations | `@frontend` | `frontend-builder` | `app/*/loading.tsx` | 2h |

**Total Phase 2:** ~23 hours

---

### 🟡 Phase 3: Polish (Nice to Have)

| # | Task | Subagent | Skill | Files | Est. |
|---|------|----------|-------|-------|------|
| 3.1 | Add onboarding flow for customers | `@frontend` | `implement-feature` | `app/dashboard/customer/*` | 3h |
| 3.2 | Add onboarding flow for providers | `@frontend` | `implement-feature` | `app/dashboard/provider/*` | 3h |
| 3.3 | Add welcome modal for first login | `@frontend` | `implement-feature` | `app/dashboard/*` | 2h |
| 3.4 | Add contextual tooltips | `@frontend` | `web-design-guidelines` | Multiple files | 3h |
| 3.5 | Add empty state illustrations | `@frontend` | `web-design-guidelines` | `components/ui/empty-state.tsx` | 2h |
| 3.6 | Add pull-to-refresh on mobile | `@mobile-engineer` | `bottom-sheet-snap-points` | `components/services/*` | 3h |
| 3.7 | Add swipe gestures on order cards | `@mobile-engineer` | `bottom-sheet-snap-points` | `components/orders/*` | 4h |
| 3.8 | Add haptic feedback on actions | `@mobile-engineer` | `mobile-haptics-device-api-craft` | Multiple files | 2h |
| 3.9 | Add image blur placeholders | `@frontend` | `performance-optimization` | `next.config.mjs` | 1h |
| 3.10 | Add virtual scrolling for long lists | `@frontend` | `performance-optimization` | `app/services/*` | 3h |
| 3.11 | Add offline indicator | `@frontend` | `frontend-builder` | `components/layout/*` | 2h |
| 3.12 | Add service worker for offline support | `@pwa-offline-architect` | `pwa-offline-service-worker-cache` | `public/*` | 4h |

**Total Phase 3:** ~32 hours

---

## 🤖 Subagent Activation Plan

### Primary Agents

| Agent | Role | Tasks |
|-------|------|-------|
| `@architect` | System design, decomposition | All phases |
| `@planner` | Task breakdown, sequencing | All phases |
| `@frontend` | React/Next.js implementation | 1.1-1.7, 2.1-2.14, 3.1-3.5, 3.9-3.12 |
| `@design-engineer` | Design system, dark mode | 1.8-1.9 |
| `@accessibility-champion` | WCAG compliance, keyboard | 2.6-2.7 |
| `@mobile-engineer` | Mobile gestures, haptics | 3.6-3.8 |
| `@tddmaster` | Test-driven development | All phases |
| `@qa` | Quality assurance | All phases |
| `@reviewer` | Code review | After each phase |
| `@security` | Security audit | Final review |

### Supporting Agents

| Agent | Role | When |
|-------|------|------|
| `@backend` | API route updates | If API changes needed |
| `@database` | Schema changes | If data model changes |
| `@debugger` | Bug investigation | If issues found |
| `@perf` | Performance optimization | Phase 3 |
| `@sre` | Monitoring, alerts | Production deployment |

---

## 📁 File Changes by Phase

### Phase 1 Files

```
app/
├── (auth)/register/page.tsx          [MODIFY] Add form validation
├── checkout/page.tsx                 [MODIFY] Add form validation
├── service/[slug]/
│   ├── loading.tsx                   [MODIFY] Better skeleton
│   └── error.tsx                     [CREATE] Error boundary
├── orders/[id]/
│   ├── loading.tsx                   [MODIFY] Better skeleton
│   └── error.tsx                     [CREATE] Error boundary
├── dashboard/
│   ├── provider/buka-jasa/page.tsx   [MODIFY] Add form validation
│   ├── admin/error.tsx               [CREATE] Error boundary
│   └── customer/error.tsx            [CREATE] Error boundary
components/
├── ui/
│   ├── input.tsx                     [MODIFY] Dark mode fix
│   └── error-panel.tsx               [MODIFY] Add retry button
app/
└── globals.css                       [MODIFY] Dark mode tokens
```

### Phase 2 Files

```
components/
├── layout/
│   ├── search-bar.tsx                [MODIFY] Add keyboard shortcut, recent history
│   └── notification-bell.tsx         [MODIFY] Add grouping, mark-as-read
├── provider/
│   └── order-kanban.tsx              [MODIFY] Add keyboard shortcuts
├── services/
│   ├── catalog-filters.tsx           [MODIFY] Add micro-interactions
│   └── save-button.tsx               [MODIFY] Add optimistic update, animation
├── orders/
│   └── review-form.tsx               [MODIFY] Add optimistic update
├── ui/
│   └── dialog.tsx                    [MODIFY] Add focus trap
app/
├── services/loading.tsx              [MODIFY] Page transition
├── service/[slug]/loading.tsx        [MODIFY] Page transition
└── checkout/loading.tsx              [MODIFY] Page transition
```

### Phase 3 Files

```
app/dashboard/
├── customer/page.tsx                 [MODIFY] Add onboarding
├── provider/page.tsx                 [MODIFY] Add onboarding
└── layout.tsx                        [MODIFY] Add welcome modal
components/
├── dashboard/
│   └── onboarding-checklist.tsx      [MODIFY] Enhance with tooltips
├── ui/
│   └── empty-state.tsx               [MODIFY] Add illustrations
├── services/
│   └── service-tile.tsx              [MODIFY] Add blur placeholder
└── layout/
    └── offline-indicator.tsx         [CREATE] Offline banner
public/
├── sw.js                             [CREATE] Service worker
└── manifest.json                     [MODIFY] PWA config
```

---

## 🔗 Dependencies

```
Phase 1 (Critical)
├── 1.1 Error boundaries ──────────┐
├── 1.2-1.3 Loading skeletons ─────┤
├── 1.4-1.6 Form validation ───────┤
├── 1.7 Retry buttons ─────────────┤
└── 1.8-1.9 Dark mode fixes ───────┘
                                    │
Phase 2 (UX) ◄─────────────────────┘
├── 2.1-2.3 Optimistic updates ────┐
├── 2.4-2.5 Keyboard shortcuts ────┤
├── 2.6-2.7 Accessibility ─────────┤
├── 2.8-2.9 Notifications ─────────┤
├── 2.10-2.11 Search UX ───────────┤
├── 2.12-2.13 Micro-interactions ──┤
└── 2.14 Page transitions ─────────┘
                                    │
Phase 3 (Polish) ◄─────────────────┘
├── 3.1-3.4 Onboarding ────────────┐
├── 3.5 Empty states ──────────────┤
├── 3.6-3.8 Mobile gestures ───────┤
├── 3.9-3.10 Performance ──────────┤
└── 3.11-3.12 Offline/PWA ─────────┘
```

---

## ✅ Acceptance Criteria

### Phase 1
- [ ] All route segments have `error.tsx` with retry button
- [ ] All data-fetching pages have loading skeletons
- [ ] Registration form shows inline errors for: email, password, name
- [ ] Checkout form shows inline errors for: address, payment method
- [ ] Service creation form shows inline errors for: title, description, price, category
- [ ] Dark mode inputs have `bg-card` background
- [ ] Dark mode borders have ≥ 18% lightness

### Phase 2
- [ ] Service toggle updates UI before server response
- [ ] Saved service toggle updates UI before server response
- [ ] Review submission shows optimistic bubble
- [ ] Pressing `/` focuses search bar
- [ ] Kanban cards can be moved with keyboard
- [ ] All modals trap focus and close on Escape
- [ ] Dynamic content has `aria-live="polite"`
- [ ] Notifications grouped by type
- [ ] Notifications can be marked as read
- [ ] Search shows recent history
- [ ] Search dropdown supports arrow key navigation
- [ ] Filter chips have press feedback
- [ ] Save button has heart animation
- [ ] Page transitions have loading animation

### Phase 3
- [ ] Customer dashboard shows onboarding checklist
- [ ] Provider dashboard shows onboarding checklist
- [ ] First login shows welcome modal
- [ ] Empty states have animated illustrations
- [ ] Mobile supports pull-to-refresh
- [ ] Order cards support swipe gestures
- [ ] Actions trigger haptic feedback
- [ ] Images have blur placeholders
- [ ] Long lists use virtual scrolling
- [ ] Offline banner shows when disconnected
- [ ] Service worker enables offline support

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)
- Form validation schemas (Zod)
- Optimistic update logic
- Notification grouping logic
- Search history management

### Integration Tests
- Form submission with validation
- Keyboard navigation flows
- Notification read/unread state
- Search history persistence

### E2E Tests (Playwright)
- Complete registration flow with validation
- Checkout flow with address validation
- Kanban keyboard navigation
- Search with keyboard shortcuts
- Onboarding checklist completion

### Accessibility Tests
- Keyboard-only navigation
- Screen reader testing (NVDA/VoiceOver)
- Color contrast verification
- Focus management in modals

---

## 📅 Timeline

| Phase | Duration | Start | End |
|-------|----------|-------|-----|
| Phase 1: Critical | 2 days | Day 1 | Day 2 |
| Phase 2: UX | 3 days | Day 3 | Day 5 |
| Phase 3: Polish | 4 days | Day 6 | Day 9 |
| Testing & Review | 1 day | Day 10 | Day 10 |
| **Total** | **10 days** | | |

---

## 🚀 Deployment Strategy

1. **Phase 1** → Merge to `main`, deploy to preview
2. **Phase 2** → Merge to `main`, deploy to preview
3. **Phase 3** → Merge to `main`, deploy to preview
4. **Final** → Full regression test, deploy to production

---

## 📝 Notes

- All changes follow existing design system (shadcn-style, Tailwind, HSL tokens)
- New components go in `components/ui/` for primitives, `components/{feature}/` for features
- All form validation uses `react-hook-form` + `zod` (already installed)
- All mutations use `@tanstack/react-query` (already installed)
- Micro-interactions respect `prefers-reduced-motion`
- All new components have proper TypeScript types
- All new components follow existing naming conventions

---

## 🔐 Security Considerations

- Form validation happens client-side AND server-side
- CSRF protection maintained on all state-changing endpoints
- Rate limiting unchanged
- No new API endpoints required
- No new secrets or environment variables

---

## 📚 References

- `UI_UX_AUDIT.md` — Full audit findings
- `CODEEXP.md` — Codebase architecture map
- `AGENTS.md` — Subagent and skill definitions
- `docs/PLANNING.md` — Original planning document
