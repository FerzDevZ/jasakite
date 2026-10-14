---
name: stripe-webhooks-idempotency-subscriptions
description: Implement bulletproof Stripe payment processing, webhook signature verification, and automated invoice lifecycle.
---
# Stripe Billing, Subscriptions & Webhook Security
- Raw cryptographic payload signature verification (`stripe.webhooks.constructEvent`).
- Idempotent webhook event dispatching with database transaction deduplication.
