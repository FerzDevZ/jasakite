# Storybook 8 CSF 3.0 Format

```tsx
import type { Meta, StoryObj } from '@storybook/react';
import { Button } from './Button';
const meta: Meta<typeof Button> = { component: Button };
export default meta;
type Story = StoryObj<typeof Button>;
export const Primary: Story = { args: { primary: true, label: 'Click Me' } };
```
