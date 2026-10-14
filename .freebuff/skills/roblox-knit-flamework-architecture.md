---
name: roblox-knit-flamework-architecture
description: Architect Roblox games with single-script Knit or Flamework patterns, modular Services, Client Controllers, and Component lifecycle.
---

# ⚡ Roblox Knit & Flamework Architecture

This skill provides modular service-controller architecture for high-density Roblox game codebases.

---

## 🎯 Production Invariants
1. **Single Entry Point**: Exactly one `Script` on the server and one `LocalScript` on the client boots Knit/Flamework.
2. **Knit Services (Server)**:
   - Encapsulate database access, game loop cycles, player inventories.
   - Expose client-safe remote APIs via `Client` table.
3. **Knit Controllers (Client)**:
   - Handle camera, viewmodels, UI bindings, and user input.

---

## 💻 Sample Knit Service Implementation

```lua
--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Knit = require(ReplicatedStorage.Packages.Knit)

local ShopService = Knit.CreateService {
    Name = "ShopService",
    Client = {
        ItemPurchased = Knit.CreateSignal(),
    },
}

function ShopService.Client:PurchaseItem(player: Player, itemId: string): boolean
    return self.Server:ProcessPurchase(player, itemId)
end

function ShopService:ProcessPurchase(player: Player, itemId: string): boolean
    -- 1. Validate itemId existence in item catalog
    -- 2. Deduct currency atomically
    -- 3. Grant item to inventory
    self.Client.ItemPurchased:Fire(player, itemId)
    return true
end

function ShopService:KnitInit()
    print("[ShopService] Initialized dependencies.")
end

function ShopService:KnitStart()
    print("[ShopService] Started listening to game events.")
end

return ShopService
```
