# Redlock Algorithm & Safe Release Lua Script

## Safe Lock Release Lua Script

```lua
-- KEYS[1] = lock_key
-- ARGV[1] = random_owner_token
if redis.call("get", KEYS[1]) == ARGV[1] then
    return redis.call("del", KEYS[1])
else
    return 0
end
```

This guarantees atomicity: the key is only deleted if and only if the current value matches the unique owner token.
