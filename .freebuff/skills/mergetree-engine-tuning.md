# ClickHouse MergeTree Family & Indexing Guide

## Core Table Engines

| Engine | Best Used For |
|---|---|
| **`MergeTree`** | General-purpose high-volume time-series events |
| **`ReplacingMergeTree`** | Deduplication of events by version/timestamp during background merges |
| **`SummingMergeTree`** | Real-time counters and numerical metrics pre-aggregation |
| **`AggregatingMergeTree`** | Storing complex aggregate states (e.g. `uniqExactState`, `quantilesExactWeightedState`) |
