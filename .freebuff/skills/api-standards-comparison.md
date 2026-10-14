# API Design Standards & RFC 7807 Error Model

## RFC 7807 Standard Error Response

```json
{
  "type": "https://api.example.com/errors/insufficient-funds",
  "title": "Insufficient Funds",
  "status": 422,
  "detail": "Your account balance of $25.00 is lower than the transaction amount of $50.00.",
  "instance": "/transactions/txn_987654",
  "invalid_params": [
    {
      "name": "amount",
      "reason": "Amount exceeds available balance"
    }
  ]
}
```

## Cursor Pagination Format

```json
{
  "data": [
    { "id": "ord_102", "amount": 99.00 }
  ],
  "pagination": {
    "has_more": true,
    "next_cursor": "eyJpZCI6Im9yZF8xMDIiLCJ0cyI6MTY3MDAwMDAwMH0="
  }
}
```
