---
name: clean-code-anti-slop
description: Eliminate AI code slop, lazy placeholders, generic naming, and gratuitous refactors. Enforce human engineering craft, surgical diffs, guard clauses, and strict typing with concrete ❌ Bad vs ✅ Good few-shot patterns.
---

# 🛡️ Clean Code & Anti-AI-Slop Engineering Standard

AI code generators tend to leave predictable "code slop" signatures. Follow these strict invariants and concrete **❌ Bad vs ✅ Good** few-shot patterns on every single file change:

---

## 🚫 ZERO-TOLERANCE CODE SLOP INVARIANTS

1. **Zero Placeholders & Truncations**: Never write `// TODO: implement later`, `pass`, or `/* ... rest unchanged ... */`. Every emission must be syntactically complete and executable.
2. **Zero Generic Naming**: Never name variables `data`, `item`, `res`, `result`, `temp`, `obj`, `val`. Use explicit domain identifiers.
3. **Zero Type Evasion**: Never use `any` or loose type assertions (`as unknown as TargetType`). Use discriminated unions and Zod validation.
4. **Surgical Diffs (Chesterton's Fence)**: Never touch or refactor working code outside the user's specific request.

---

## 🥊 FEW-SHOT CONTRAST PATTERNS (❌ BAD vs ✅ GOOD)

### Pattern 1: API Endpoint & Input Validation (Node / Express / TypeScript)

```typescript
// ❌ BAD (AI-Slop: Generic variables, any type, unhandled edge cases, status 200 on error)
app.post('/api/orders', async (req: any, res: any) => {
  try {
    let data = req.body;
    // TODO: add validation
    let item = await db.orders.create({ data: data });
    res.json({ success: true, item });
  } catch (err: any) {
    res.json({ success: false, err: err.message }); // 200 OK with error string!
  }
});

// ✅ GOOD (Production-Grade: Zod schema, explicit types, HTTP 201/400/500, custom error handling)
const CreateOrderInputSchema = z.object({
  customerId: z.string().uuid("Invalid customer UUID"),
  items: z.array(z.object({ sku: z.string().min(3), quantity: z.number().int().positive() })).nonempty("Order must have at least one item"),
  currency: z.enum(["IDR", "USD"]).default("IDR"),
});

type CreateOrderInput = z.infer<typeof CreateOrderInputSchema>;

app.post('/api/v1/orders', async (req: Request, res: Response): Promise<void> => {
  const parseResult = CreateOrderInputSchema.safeParse(req.body);
  if (!parseResult.success) {
    res.status(400).json({
      error: "VALIDATION_FAILED",
      details: parseResult.error.flatten().fieldErrors,
    });
    return;
  }

  try {
    const validatedOrder: CreateOrderInput = parseResult.data;
    const createdOrder = await orderService.createPendingOrder(validatedOrder);
    res.status(201).json({ success: true, data: createdOrder });
  } catch (error) {
    logger.error({ error, customerId: req.body?.customerId }, "Order creation failed");
    res.status(500).json({ error: "INTERNAL_SERVER_ERROR" });
  }
});
```

---

### Pattern 2: Database Query & Transactions (Prisma / SQL)

```typescript
// ❌ BAD (AI-Slop: Sequential await inside loop, N+1 query vulnerability)
async function updateStocks(items: any[]) {
  for (let itm of items) {
    const current = await prisma.product.findUnique({ where: { id: itm.id } });
    await prisma.product.update({
      where: { id: itm.id },
      data: { stock: current.stock - itm.qty }
    });
  }
}

// ✅ GOOD (Production-Grade: Atomic interactive transaction, atomic decrement, zero race conditions)
async function deductProductInventory(
  inventoryDeductions: ReadonlyArray<{ productId: string; quantity: number }>
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    for (const deduction of inventoryDeductions) {
      const updatedProduct = await tx.product.update({
        where: { id: deduction.productId },
        data: {
          stock: { decrement: deduction.quantity },
        },
      });

      if (updatedProduct.stock < 0) {
        throw new InsufficientStockError(`Product ${deduction.productId} has insufficient stock.`);
      }
    }
  });
}
```

---

### Pattern 3: Mobile State & Null-Safety (Flutter / Dart)

```dart
// ❌ BAD (AI-Slop: Force unwrap !, mutable state everywhere, raw print)
void submitData() {
  print("submit");
  var user = userBox.get('user')!; // Crash if null!
  api.post('/visit', {'userId': user.id, 'lat': currentPosition!.latitude});
}

// ✅ GOOD (Production-Grade: Safe null-handling, Result pattern, typed entity)
Future<Either<Failure, VisitRecord>> submitStoreVisit({
  required UserProfile currentUser,
  required Position verifiedPosition,
}) async {
  if (verifiedPosition.isMocked) {
    return Left(SecurityFailure("Mock GPS location is strictly forbidden."));
  }

  try {
    final visitPayload = StoreVisitEntity(
      salesId: currentUser.id,
      latitude: verifiedPosition.latitude,
      longitude: verifiedPosition.longitude,
      capturedAt: DateTime.now().toUtc(),
    );
    final savedRecord = await visitLocalRepository.insertOutbox(visitPayload);
    return Right(savedRecord);
  } catch (exception, stackTrace) {
    AppLogger.error("Failed to persist store visit", exception, stackTrace);
    return Left(DatabaseFailure("Failed to record visit locally."));
  }
}
```
