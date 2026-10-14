# EVM Smart Contract Vulnerabilities & Mitigations

| Vulnerability | Attack Mechanism | Standard Mitigation |
|---|---|---|
| **Reentrancy** | External call calls back into contract before state updates | Follow Checks-Effects-Interactions (CEI) & OpenZeppelin `ReentrancyGuard` |
| **Oracle Manipulation** | Attacker manipulates single AMM pool price with flash loan | Use Chainlink Decentralized Data Feeds or Uniswap v3 TWAP |
| **Unprotected Initializer** | Upgradeable proxy contract initialized by attacker | Call `_disableInitializers()` in contract constructor |
| **tx.origin Authentication** | Phishing contract acts as proxy to steal funds | Use `msg.sender` exclusively for authorization checks |
