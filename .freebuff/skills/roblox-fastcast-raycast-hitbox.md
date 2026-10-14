---
name: roblox-fastcast-raycast-hitbox
description: Master combat mechanics, FastCast projectile simulation, RaycastHitbox melee hit registration, and server-sided lag compensation.
---

# ⚔️ Roblox FastCast & Raycast Hitbox Engine

This skill delivers responsive, exploit-resistant hitboxes for guns, bows, and melee weapons.

---

## 🎯 Production Invariants
1. **Server Hit Validation**: The client calculates visual muzzle trails and cosmetic FX, but the server performs or verifies all terminal hit logic.
2. **Spatial Partitioning / RaycastParams**: Filter out teammates, dead bodies, and debris via `RaycastParams.FilterDescendantsInstances`.
3. **Collision Groups**: Separate character physics from projectile raycasts to prevent self-collision bugs.

---

## 💻 Melee Raycast Hitbox Module

```lua
--!strict
local Workspace = game:GetService("Workspace")

export type Hitbox = {
    BladeAttachment0: Attachment,
    BladeAttachment1: Attachment,
    FilterInstances: { Instance },
    IsActive: boolean,
}

local function CreateHitbox(att0: Attachment, att1: Attachment, ignoreList: { Instance }): Hitbox
    return {
        BladeAttachment0 = att0,
        BladeAttachment1 = att1,
        FilterInstances = ignoreList,
        IsActive = false,
    }
end

local function CastFrame(hitbox: Hitbox, lastPos: Vector3, currentPos: Vector3): RaycastResult?
    local params = RaycastParams.new()
    params.FilterType = RaycastFilterType.Exclude
    params.FilterDescendantsInstances = hitbox.FilterInstances

    local direction = currentPos - lastPos
    return Workspace:Raycast(lastPos, direction, params)
end

return {
    CreateHitbox = CreateHitbox,
    CastFrame = CastFrame,
}
```
