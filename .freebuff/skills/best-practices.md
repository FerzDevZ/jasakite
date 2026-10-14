# Antigravity Skill Best Practices

1. **Third-Person Description**:
   - Write frontmatter descriptions in third person (e.g. *"Use this skill when the user asks to..."*).
   - This ensures the LLM planner accurately matches intent with skill capabilities.

2. **Progressive Disclosure**:
   - Keep `SKILL.md` under 150 lines.
   - Offload extensive reference tables, manuals, and deep theory into `references/*.md`.

3. **Executable Helpers**:
   - Encapsulate tedious commands into `scripts/*.sh` or `scripts/*.py` so the agent can execute them with `run_command`.
