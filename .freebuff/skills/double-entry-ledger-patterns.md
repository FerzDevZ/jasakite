# Double-Entry General Ledger & Financial Reconciliation Guide

## Fundamental Accounting Equation

$$\text{Assets} = \text{Liabilities} + \text{Equity}$$

## Transaction Journal Table DDL

```sql
CREATE TABLE journal_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    transaction_id UUID NOT NULL,
    account_id UUID NOT NULL,
    entry_type VARCHAR(6) CHECK (entry_type IN ('DEBIT', 'CREDIT')),
    amount_cents BIGINT NOT NULL CHECK (amount_cents > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'USD',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_journal_transaction ON journal_entries(transaction_id);
```
