---
name: roblox-rojo-workflow-tooling
description: Setup professional Roblox Rojo workflow with default.project.json, Wally dependencies, Selene linter, and Git version control.
---

# 🛠️ Roblox Rojo & Modern Tooling Workflow

This skill establishes enterprise git-backed Roblox development using Rojo, Wally, Selene, and StyLua.

---

## 🎯 Production Invariants
1. Source of truth lives in filesystem (`src/`), synced into Roblox Studio via Rojo daemon.
2. Package dependencies managed through `wally.toml`.
3. Code quality guarded by Selene (`selene.toml`) and StyLua (`stylua.toml`).

---

## 📁 Rojo Project Topology (`default.project.json`)

```json
{
  "name": "RobloxProject",
  "tree": {
    "$className": "DataModel",
    "ReplicatedStorage": {
      "Shared": {
        "$path": "src/shared"
      },
      "Packages": {
        "$path": "Packages"
      }
    },
    "ServerScriptService": {
      "Server": {
        "$path": "src/server"
      },
      "ServerPackages": {
        "$path": "ServerPackages"
      }
    },
    "StarterPlayer": {
      "StarterPlayerScripts": {
        "Client": {
          "$path": "src/client"
        }
      }
    }
  }
}
```

## 🚀 Quick Commands
- `rojo serve` — Start local sync server on port 34872.
- `rojo build -o Game.rbxl` — Compile project into binary place file.
- `wally install` — Download and link dependencies into `Packages/`.
- `selene src/` — Run static linting.
- `stylua src/` — Auto-format code according to Roblox style guidelines.
