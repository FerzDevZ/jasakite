# Module Federation Shared Dependencies Guide

## Module Federation Plugin Config (Host)

```javascript
const { ModuleFederationPlugin } = require('@module-federation/enhanced/rspack');

module.exports = {
  plugins: [
    new ModuleFederationPlugin({
      name: 'host_app',
      remotes: {
        checkout: 'checkout@https://checkout.example.com/mf-manifest.json',
        dashboard: 'dashboard@https://dashboard.example.com/mf-manifest.json',
      },
      shared: {
        react: { singleton: true, eager: true, requiredVersion: '^18.3.0' },
        'react-dom': { singleton: true, eager: true, requiredVersion: '^18.3.0' },
      },
    }),
  ],
};
```
