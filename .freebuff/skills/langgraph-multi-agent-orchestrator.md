---
name: langgraph-multi-agent-orchestrator
description: Architect stateful multi-agent workflows using LangGraph and Python/TypeScript. Cyclic graphs, human-in-the-loop approvals, persistent checkpointers (PostgreSQL / SQLite), conditional branch routing, and tool calling resilience.
---

# 🤖 LangGraph Multi-Agent Orchestration Standard

Design resilient, production-ready autonomous agent teams with cyclic state machines and state persistence.

---

## 🏛️ CORE MULTI-AGENT STATE PATTERNS

### 1. State Definition with Typed Channels
Always define immutable state reducers to prevent race conditions during concurrent agent tool execution:

```python
from typing import Annotated, Sequence, TypedDict
from langchain_core.messages import BaseMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langgraph.checkpoint.sqlite import SqliteSaver

class AgentSwarmState(TypedDict):
    # Appends new messages rather than overwriting
    messages: Annotated[Sequence[BaseMessage], add_messages]
    active_agent: str
    iteration_count: int
    review_status: str

# 2. Node Execution & Conditional Routing
def research_node(state: AgentSwarmState):
    # Execute research agent logic
    return {"active_agent": "critic", "iteration_count": state["iteration_count"] + 1}

def should_continue(state: AgentSwarmState) -> str:
    if state["review_status"] == "APPROVED":
        return END
    if state["iteration_count"] >= 5:
        return "human_in_the_loop_gate"
    return "researcher"

# 3. Construct Graph with Checkpointer
memory = SqliteSaver.from_conn_string("checkpoints.db")
workflow = StateGraph(AgentSwarmState)

workflow.add_node("researcher", research_node)
workflow.add_node("critic", critic_node)
workflow.add_node("human_in_the_loop_gate", human_approval_node)

workflow.set_entry_point("researcher")
workflow.add_conditional_edges("critic", should_continue)

app = workflow.compile(checkpointer=memory, interrupt_before=["human_in_the_loop_gate"])
```

### 2. Guardrails for Production Agents
- **Recursion Limits**: Enforce `recursion_limit: 25` to prevent infinite loops.
- **Fail-Safe Fallbacks**: If an agent tool fails twice, catch the exception and route to the `@debugger` node instead of crashing the whole run.
- **Human-In-The-Loop**: Always require explicit human approval before destructive tool calls (e.g. database DROP, production cloud deploys, money transfers).
