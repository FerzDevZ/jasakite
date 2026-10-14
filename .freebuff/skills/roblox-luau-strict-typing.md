---
name: roblox-luau-strict-typing
description: Master modern Roblox Luau with strict mode (--!strict), export types, nominal types, type guards, and zero any casts.
---

# 🛡️ Roblox Luau Strict Typing Masterclass

This skill equips developers with senior-level Luau type system conventions, ensuring compile-time safety and self-documenting code.

---

## 🎯 Production Invariants
1. Every script must declare `--!strict` as the first line.
2. Zero implicit `any` conversions. Use type guards and narrowing functions.
3. Centralize shared types in a `Types.luau` ModuleScript inside `ReplicatedStorage`.
4. Replace deprecated Globals (`wait()`, `spawn()`, `delay()`) with the `task` library.

---

## 💻 Luau Architecture Pattern

```lua
--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")

export type PlayerData = {
    UserId: number,
    Coins: number,
    Inventory: { string },
    Level: number,
    LastLogin: number,
}

export type CombatResult = {
    Success: boolean,
    DamageDealt: number,
    TargetDied: boolean,
}

local PlayerService = {}
PlayerService.__index = PlayerService

function PlayerService.CreateDefaultData(userId: number): PlayerData
    return {
        UserId = userId,
        Coins = 100,
        Inventory = {},
        Level = 1,
        LastLogin = os.time(),
    }
end

function PlayerService.ValidateData(data: unknown): (boolean, string?)
    if type(data) ~= "table" then
        return false, "Data is not a table"
    end
    local raw = data :: { [any]: any }
    if type(raw.UserId) ~= "number" or raw.UserId <= 0 then
        return false, "Invalid UserId"
    end
    if type(raw.Coins) ~= "number" or raw.Coins < 0 then
        return false, "Invalid Coins value"
    end
    return true, nil
end

return PlayerService
```
