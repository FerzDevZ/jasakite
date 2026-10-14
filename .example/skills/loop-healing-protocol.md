# SWE Self-Healing Loop Protocol & Error Triage

## Error Diagnosis Checklist

1. **Syntax / Compiler Errors**: Parse compiler error column and fix typo, missing import, or mismatched bracket immediately.
2. **Type Errors**: Check function signatures and interface definitions.
3. **Runtime Null / Undefined / Index Errors**: Introduce defensive bounds checking and non-null guarantees.
4. **Assertion Failures**: Compare actual output vs expected schema to resolve calculation or transformation discrepancies.
