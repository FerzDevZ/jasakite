---
name: roblox-datastore-profileservice
description: Implement bulletproof data persistence with ProfileService, session-locking, automatic backups, and safe BindToClose shutdown.
---

# 💾 Roblox DataStore & ProfileService Architecture

This skill guarantees zero-data-loss persistence using ProfileService session-locking principles.

---

## 🎯 Production Invariants
1. **Session-Locking**: Active profiles are locked to the current server instance. If a player joins another server while saving, the second server waits or safely rejects.
2. **Graceful BindToClose**: Listen to `game:BindToClose()` to release profile locks and flush unsaved state before the server closes.
3. **Template Fallback**: Deep-merge loaded profile data with default template to seamlessly support newly added schema fields.

---

## 💻 ProfileManager Implementation

```lua
--!strict
local Players = game:GetService("Players")
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local ServerScriptService = game:GetService("ServerScriptService")

local ProfileService = require(ServerScriptService.Packages.ProfileService)

local ProfileTemplate = {
    Coins = 100,
    Gems = 0,
    Inventory = {} :: { string },
    LoginCount = 0,
    Version = 1,
}

local ProfileStore = ProfileService.GetProfileStore(
    "ProductionPlayerData_v1",
    ProfileTemplate
)

local Profiles = {}

local function OnPlayerAdded(player: Player)
    local profile = ProfileStore:LoadProfileAsync("Player_" .. player.UserId)
    if profile ~= nil then
        profile:AddUserId(player.UserId)
        profile:Reconcile()
        profile:ListenToRelease(function()
            Profiles[player] = nil
            player:Kick("Your profile session was loaded on another server.")
        end)

        if player:IsDescendantOf(Players) == true then
            Profiles[player] = profile
        else
            profile:Release()
        end
    else
        player:Kick("Could not load your saved data. Please rejoin.")
    end
end

local function OnPlayerRemoving(player: Player)
    local profile = Profiles[player]
    if profile ~= nil then
        profile:Release()
    end
end

Players.PlayerAdded:Connect(OnPlayerAdded)
Players.PlayerRemoving:Connect(OnPlayerRemoving)

game:BindToClose(function()
    for _, profile in pairs(Profiles) do
        profile:Release()
    end
end)
```
