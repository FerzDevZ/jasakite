# Tree-Shaking Requirements

- Packages must declare `"sideEffects": false` in package.json.
- Avoid `import * as _ from 'lodash'`; use named modular imports.
