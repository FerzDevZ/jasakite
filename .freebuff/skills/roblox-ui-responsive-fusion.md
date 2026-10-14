---
name: roblox-ui-responsive-fusion
description: Build reactive, resolution-independent Roblox user interfaces using Fusion or Roact with responsive scaling and spring animations.
---

# 🎨 Roblox UI/UX with Fusion & Reactive State

This skill enables modern, cross-platform UI development for Mobile, PC, and Console.

---

## 🎯 Production Invariants
1. **Scale Over Offset**: Always prioritize scale components (`UDim2.fromScale(x, y)`) over fixed pixels to support mobile viewports.
2. **Spring Physics Transitions**: Use smooth spring dynamics instead of linear tweens for button interactions and window popups.
3. **Gamepad Virtual Navigation**: Ensure UI elements have explicit `NextSelectionUp`, `NextSelectionDown`, etc., or enable `GuiService.AutoSelectGuiEnabled`.

---

## 💻 Reactive Fusion Button Component

```lua
--!strict
local ReplicatedStorage = game:GetService("ReplicatedStorage")
local Fusion = require(ReplicatedStorage.Packages.Fusion)

local New = Fusion.New
local State = Fusion.State
local Spring = Fusion.Spring
local OnEvent = Fusion.OnEvent

local function PrimaryButton(props: { Text: string, OnClick: () => () })
    local isHovered = State(false)
    local isPressed = State(false)

    local buttonScale = Spring(
        Fusion.Computed(function()
            if isPressed:get() then
                return 0.92
            elseif isHovered:get() then
                return 1.05
            else
                return 1.0
            end
        end),
        25, -- Speed
        0.75 -- Damping
    )

    return New "TextButton" {
        Size = UDim2.fromScale(0.3, 0.08),
        AnchorPoint = Vector2.new(0.5, 0.5),
        BackgroundColor3 = Color3.fromRGB(0, 162, 255),
        Text = props.Text,
        TextColor3 = Color3.new(1, 1, 1),
        Font = Enum.Font.GothamBold,
        TextScaled = true,

        [New "UIScale"] = {
            Scale = buttonScale,
        },

        [New "UICorner"] = {
            CornerRadius = UDim.new(0.2, 0),
        },

        [OnEvent "MouseEnter"] = function()
            isHovered:set(true)
        end,

        [OnEvent "MouseLeave"] = function()
            isHovered:set(false)
            isPressed:set(false)
        end,

        [OnEvent "MouseButton1Down"] = function()
            isPressed:set(true)
        end,

        [OnEvent "MouseButton1Up"] = function()
            isPressed:set(false)
            props.OnClick()
        end,
    }
end

return PrimaryButton
```
