# WCAG 2.2 AA Accessibility (a11y) Master Checklist

## 1. Perceivable
- [ ] **Images**: Non-decorative images have informative `alt="..."` text; decorative images use `alt=""` or `aria-hidden="true"`.
- [ ] **Color Contrast**: 4.5:1 for body text, 3:1 for large text (>= 18pt / 24px) and UI components/borders.
- [ ] **Audio/Video**: Captions provided for video content.

## 2. Operable
- [ ] **Keyboard Only**: All actions executable without a mouse.
- [ ] **Focus Visible**: Clear focus ring on focused items (`focus-visible:ring-2 focus-visible:ring-offset-2`).
- [ ] **No Keyboard Trap**: Users can easily tab into and out of all widgets.

## 3. Understandable
- [ ] **Form Validation**: Error messages are explicitly associated with inputs via `aria-describedby="field-error-id"` and `aria-invalid="true"`.
- [ ] **Consistent Navigation**: Primary navigation links appear in the same order across pages.

## 4. Robust
- [ ] **Semantic HTML**: `<button>` used for actions, `<a>` used for navigation links. No `<div onClick={...}>` without `role="button"` and `tabIndex={0}`.
