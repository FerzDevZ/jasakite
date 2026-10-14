---
name: roblox-memory-leak-gc-optimization
description: Eliminate Roblox memory leaks, manage event lifecycles with Maid/Janitor/Trove, optimize Luau garbage collection, and enforce StreamingEnabled.
---

# 🧹 Roblox Memory Leak & GC Optimization

This skill prevents memory leaks, dangling `RBXScriptConnection` instances, and server lag.

---

## 🎯 Production Invariants
1. **Never Leave Orphaned Connections**: Any connection hooked to `Player`, `Character`, or dynamic instances must be cleaned up when the instance leaves the DataModel.
2. **Use Maid / Janitor / Trove**: Register connections, tweens, and temporary instances to a disposal manager.
3. **StreamingEnabled Support**: Client code must never assume instances under `workspace` exist immediately; always use `WaitForChild()` or model streamers.

---

## 💻 Trove / Maid Cleanup Pattern

```lua
--!strict
local Trove = require(game:GetService("ReplicatedStorage").Packages.Trove)

local function SetupCharacterObserver(player: Player)
    local playerTrove = Trove.new()

    player.CharacterAdded:Connect(function(character)
        local charTrove = playerTrove:Extend()

        local humanoid = character:WaitForChild("Humanoid") :: Humanoid
        local rootPart = character:WaitForChild("HumanoidRootPart") :: BasePart

        -- Bind connection to character lifetime
        charTrove:Connect(humanoid.Died, function()
            print(`Player {player.Name} died. Cleaning up character resources.`)
            charTrove:Clean()
        end)

        -- Bind temporary effects
        local aura = Instance.new("Highlight")
        aura.Adornee = character
        aura.Parent = character
        charTrove:Add(aura)
    end)

    player.AncestryChanged:Connect(function(_, parent)
        if not parent then
            playerTrove:Clean()
        end
    end)
end
```
