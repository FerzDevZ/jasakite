# Model Context Protocol (MCP) Specifications

## JSON-RPC 2.0 Core Methods

### 1. `tools/list`
Returns all tools exposed by the server.
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "tools": [
      {
        "name": "query_database",
        "description": "Executes read-only SQL query on PostgreSQL",
        "inputSchema": {
          "type": "object",
          "properties": {
            "query": { "type": "string" }
          },
          "required": ["query"]
        }
      }
    ]
  }
}
```

### 2. `tools/call`
Executes a specified tool.
```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "query_database",
    "arguments": {
      "query": "SELECT count(*) FROM users;"
    }
  }
}
```
