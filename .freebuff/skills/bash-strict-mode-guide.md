# Robust Shell Scripting Golden Rules

`set -euo pipefail`
`trap 'cleanup' EXIT INT TERM`
Always quote variable expansions: `"$VAR"`
