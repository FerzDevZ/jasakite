---
name: langgraph-agentic-workflow-memory
description: Master multi-agent systems with LangGraph, cyclic StateGraphs, tool calling, persistent checkpointers, and human-in-the-loop validation.
---

# 🤖 LangGraph Multi-Agent Architecture & Memory

This skill delivers production-grade stateful agent loops, tool validation, and persistent memory stores.

---

## 🎯 Production Invariants
1. Use `StateGraph` with strictly typed schemas (`TypedDict` or Pydantic).
2. Insert conditional edges for tool evaluation and self-reflection loops.
3. Attach persistent checkpointers (`SqliteSaver` / `PostgresSaver`) for conversation recovery.

---

## 💻 ReAct Self-Refine Agent Graph

```python
from typing import TypedDict, Annotated
import operator
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.sqlite import SqliteSaver
from langchain_core.messages import BaseMessage, HumanMessage, AIMessage

class AgentState(TypedDict):
    messages: Annotated[list[BaseMessage], operator.add]
    attempts: int
    is_satisfactory: bool

def draft_node(state: AgentState):
    # LLM drafting code solution
    return {"messages": [AIMessage(content="def solve(): return 42")], "attempts": state["attempts"] + 1}

def critique_node(state: AgentState):
    # Critique logic inspecting edge cases
    last_msg = state["messages"][-1].content
    passed = "solve()" in last_msg and state["attempts"] >= 1
    return {"is_satisfactory": passed}

def should_continue(state: AgentState):
    if state["is_satisfactory"] or state["attempts"] >= 3:
        return END
    return "draft"

workflow = StateGraph(AgentState)
workflow.add_node("draft", draft_node)
workflow.add_node("critique", critique_node)

workflow.set_entry_point("draft")
workflow.add_edge("draft", "critique")
workflow.add_conditional_edges("critique", should_continue)

with SqliteSaver.from_conn_string(":memory:") as memory:
    app = workflow.compile(checkpointer=memory)
    result = app.invoke({"messages": [HumanMessage(content="Write solve function")], "attempts": 0, "is_satisfactory": False}, config={"configurable": {"thread_id": "1"}})
    print("Final Output:", result["messages"][-1].content)
```
