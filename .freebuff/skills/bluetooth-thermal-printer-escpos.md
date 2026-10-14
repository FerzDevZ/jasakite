---
name: bluetooth-thermal-printer-escpos
description: Master Bluetooth BLE & classic thermal printer ESC/POS command generation, bitmap receipt rendering, paper feeds, Chinese/Latin code-page handling, and 58mm/80mm layout formatting for Flutter, Android, and web.
---

# 🖨️ Bluetooth Thermal Printer & ESC/POS Architecture

Build robust receipt and invoice printing systems for POS, sales canvas, and field operations using thermal printers (58mm / 80mm).

---

## ⚡ CORE PRINTER PROTOCOLS

### 1. Paper Width Dimensions & Character Grid
- **58mm Paper**: 384 dots per line $\rightarrow$ **32 characters** (Font A: 12x24) or 42 characters (Font B: 9x17).
- **80mm Paper**: 576 dots per line $\rightarrow$ **48 characters** (Font A: 12x24) or 64 characters (Font B: 9x17).

### 2. Standard ESC/POS Command Sequences
```dart
// Raw ESC/POS byte generator constants
const int ESC = 0x1B;
const int GS = 0x1D;

final List<int> initPrinter = [ESC, 0x40]; // Initialize / reset printer
final List<int> alignLeft = [ESC, 0x61, 0x00];
final List<int> alignCenter = [ESC, 0x61, 0x01];
final List<int> alignRight = [ESC, 0x61, 0x02];

final List<int> boldOn = [ESC, 0x45, 0x01];
final List<int> boldOff = [ESC, 0x45, 0x00];

final List<int> doubleHeightWidth = [GS, 0x21, 0x11];
final List<int> normalSize = [GS, 0x21, 0x00];

final List<int> cutPaper = [GS, 0x56, 0x42, 0x00]; // Full cut
```

### 3. Monospace Alignment Engine (Two-Column & Three-Column)
Never rely on spaces created by tabs (`\t`) because thermal printers interpret them inconsistently. Always pad strings mathematically to exact character widths:
```dart
String formatTwoColumns(String left, String right, {int totalWidth = 32}) {
  int spaceNeeded = totalWidth - left.length - right.length;
  if (spaceNeeded < 1) spaceNeeded = 1;
  return left + (' ' * spaceNeeded) + right;
}
```

### 4. Connection State Machine & BLE MTU Fragmentation
- Thermal printers have small receive buffers. Chunk outgoing payload bytes into slices (max 20 to 100 bytes per write) with a 20ms delay between chunks to avoid buffer overflow (`printer buffer overrun`).
- Handle auto-reconnect gracefully when the Bluetooth printer enters sleep mode.
