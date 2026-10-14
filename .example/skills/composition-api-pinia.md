# Vue 3 Composition API & Pinia Guide

## Pinia Setup Store Pattern

```typescript
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<{ id: string; name: string } | null>(null);
  const isAuthenticated = computed(() => currentUser.value !== null);

  function setUser(user: { id: string; name: string }) {
    currentUser.value = user;
  }

  function logout() {
    currentUser.value = null;
  }

  return { currentUser, isAuthenticated, setUser, logout };
});
```
