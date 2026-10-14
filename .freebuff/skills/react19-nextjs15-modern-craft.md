---
name: react19-nextjs15-modern-craft
description: Master Next.js 15+ App Router, React 19 Server Actions, useActionState, useOptimistic, Turbopack, and zero-leak React Server Component (RSC) boundaries.
---

# ⚡ React 19 & Next.js 15+ Modern Fullstack Craft

Build blazing-fast, strictly-typed web applications leveraging the latest paradigms of **React 19** and **Next.js 15+ App Router**.

---

## 🏛️ CORE ARCHITECTURAL INVARIANTS

### 1. Minimal `'use client'` Directive Boundary
- Default to **React Server Components (RSC)** for 100% of data fetching, database access, and static layout generation.
- Push `'use client'` down to the smallest interactive leaf nodes (buttons, inputs, local modals).
- Never place `'use client'` on an entire page or large container unless unavoidable.

### 2. Modern Form Mutations with React 19 `useActionState`
Never write legacy `onSubmit={(e) => { e.preventDefault(); ... }}` boilerplate. Use idiomatic Server Actions with `useActionState`:

```tsx
// app/actions/todos.ts
'use server'

import { revalidateTag } from 'next/cache'
import { z } from 'zod'

const TodoSchema = z.object({
  title: z.string().min(3).max(100),
})

export type FormState = {
  success?: boolean
  message?: string
  errors?: Record<string, string[]>
}

export async function createTodoAction(prevState: FormState, formData: FormData): Promise<FormState> {
  const result = TodoSchema.safeParse({
    title: formData.get('title'),
  })

  if (!result.success) {
    return {
      success: false,
      errors: result.error.flatten().fieldErrors,
    }
  }

  try {
    // Database mutation (e.g. Prisma / Drizzle)
    // await db.todo.create({ data: { title: result.data.title } })
    revalidateTag('todos')
    return { success: true, message: 'Todo created successfully' }
  } catch (err) {
    return { success: false, message: 'Internal server error' }
  }
}
```

```tsx
// components/TodoForm.tsx
'use client'

import { useActionState } from 'react'
import { createTodoAction, type FormState } from '@/app/actions/todos'

const initialState: FormState = {}

export function TodoForm() {
  const [state, formAction, isPending] = useActionState(createTodoAction, initialState)

  return (
    <form action={formAction} className="space-y-4 max-w-md">
      <div>
        <input
          name="title"
          type="text"
          placeholder="Enter todo item..."
          className="w-full px-3 py-2 border rounded-md"
          disabled={isPending}
        />
        {state.errors?.title && (
          <p className="text-sm text-red-500 mt-1">{state.errors.title[0]}</p>
        )}
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="px-4 py-2 bg-primary text-white rounded-md disabled:opacity-50"
      >
        {isPending ? 'Saving...' : 'Add Todo'}
      </button>

      {state.message && (
        <p className={`text-sm ${state.success ? 'text-emerald-500' : 'text-red-500'}`}>
          {state.message}
        </p>
      )}
    </form>
  )
}
```

### 3. Immediate Perceived Performance via `useOptimistic`
Provide instant, lag-free UI feedback for user mutations before server confirmation:
```tsx
'use client'

import { useOptimistic } from 'react'

export function TodoList({ todos, onToggle }: { todos: Todo[], onToggle: (id: string) => Promise<void> }) {
  const [optimisticTodos, setOptimisticTodos] = useOptimistic(
    todos,
    (state, updatedId: string) =>
      state.map((t) => (t.id === updatedId ? { ...t, completed: !t.completed } : t))
  )

  const handleToggle = async (id: string) => {
    setOptimisticTodos(id)
    await onToggle(id)
  }

  return (
    <ul className="divide-y border rounded-lg">
      {optimisticTodos.map((todo) => (
        <li key={todo.id} className="p-3 flex items-center justify-between">
          <span className={todo.completed ? 'line-through text-muted-foreground' : ''}>
            {todo.title}
          </span>
          <button onClick={() => handleToggle(todo.id)} className="text-xs text-blue-600">
            Toggle
          </button>
        </li>
      ))}
    </ul>
  )
}
```

### 4. Next.js 15 Cache Invariants
- Route handlers default to `no-store` in Next.js 15.
- Explicitly declare cache strategies when caching is required: `export const revalidate = 3600` or `fetch(url, { next: { tags: ['data-tag'] } })`.
- Purge cache surgically via `revalidateTag('data-tag')` or `revalidatePath('/dashboard')`.
