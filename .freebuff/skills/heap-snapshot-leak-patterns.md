# Common Frontend Memory Leak Culprits

1. Forgotten `setInterval` or `addEventListener` on unmounted components.
2. Global caches storing DOM references.
3. Closures retaining heavy scope variables.
