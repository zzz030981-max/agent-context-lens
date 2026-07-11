# Architecture

```text
repository files
      │
      ▼
agent adapters ──► normalized InstructionSource[]
      │
      ├── deterministic matching and ordering
      ├── confidence/evidence labels
      ▼
analyzers
      ├── conflicts
      ├── duplicates
      ├── broken references
      ├── credential-like values
      ├── dangerous commands
      └── context budget
      │
      ▼
RepositoryReport schema v1
      ├── CLI text/JSON
      └── local browser UI
```

The core package never executes repository commands. All file access is local and read-only. The CLI server exposes reports only on the local loopback interface by default.
