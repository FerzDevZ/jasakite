# Next.js App Router & State Management Guide

## 1. RSC vs Client Components

| Feature | Server Components (RSC) | Client Components (`'use client'`) |
|---|---|---|
| Direct DB / Secret access | ✅ Allowed | ❌ Forbidden (Leaks secrets to browser) |
| Bundle size impact | 0 KB (Runs on server only) | Included in JavaScript bundle |
| React Hooks (`useState`, `useEffect`) | ❌ Not available | ✅ Available |
| Event handlers (`onClick`, `onSubmit`) | ❌ Not available | ✅ Available |

## 2. Server Action Mutations

```typescript
'use server';

import { revalidateTag } from 'next/cache';
import { z } from 'zod';
import { db } from '@/lib/db';

const schema = z.object({ title: z.string().min(3) });

export async function createItemAction(prevState: any, formData: FormData) {
  const parsed = schema.safeParse({ title: formData.get('title') });
  if (!parsed.success) {
    return { error: 'Invalid title format' };
  }

  await db.item.create({ data: { title: parsed.data.title } });
  revalidateTag('items');
  return { success: true };
}
```
