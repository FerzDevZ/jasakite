# Transient State Updates (Zero Re-render)

`useStore.subscribe((state) => (domRef.current.innerText = state.count));`
Updates DOM directly without triggering virtual DOM reconciliation.
