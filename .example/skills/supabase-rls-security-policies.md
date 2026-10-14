# Supabase Row Level Security (RLS) Guide

```sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
ON documents FOR SELECT
TO authenticated
USING (auth.uid() = user_id);
```
