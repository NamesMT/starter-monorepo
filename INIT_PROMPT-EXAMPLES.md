# INIT_PROMPT.md - Upfront Configuration Examples

Below are examples showing how you can provide configuration values directly in your prompt along with `INIT_PROMPT.md` for a faster process. See `INIT_PROMPT.md` for full details on each variable.

```
# Example 1: Keeping demo apps, removing SST only
MONOREPO_ROOT_NAME="demo-eval-project"
REMOVE_DEMO_FULLSTACK="keep_both"
TARGET_PROJECT_GOAL_AND_DESCRIPTION="""
Learn the monorepo structure and app interaction using the demos, without SST deployment complexity.
"""
# Remove SST config
REMOVE_SST="true"

[Include/Paste INIT_PROMPT.md]

-----

# Example 2: Removing demo apps and SST
MONOREPO_ROOT_NAME="my-cli-tool"
REMOVE_DEMO_FULLSTACK="remove_both"
TARGET_PROJECT_GOAL_AND_DESCRIPTION="""
Build a cool CLI tool.
"""
# Explicitly state no frontend. FRONTEND_HAVE_VUE is inferred false.
TARGET_HAVE_FRONTEND="false"
# Remove SST config
REMOVE_SST="true"

[Include/Paste INIT_PROMPT.md]

-----

# Example 3: Removing demo apps, target is a non-Vue frontend + Go backend, no SST
MONOREPO_ROOT_NAME="my-react-go-fullstack"
REMOVE_DEMO_FULLSTACK="remove_both"
TARGET_PROJECT_GOAL_AND_DESCRIPTION="""
Build a fullstack that uses React frontend and Go backend.
"""
# Must specify true if removing demo but still want a frontend
TARGET_HAVE_FRONTEND="true"
# Must specify false if frontend is not Vue
FRONTEND_HAVE_VUE="false"
# Remove SST config (assuming Go backend doesn't use it)
REMOVE_SST="true"

[Include/Paste INIT_PROMPT.md]

-----

# Example 4: Keeping demo backend (uses SST), replacing demo frontend with own Vue app
MONOREPO_ROOT_NAME="my-custom-vue-fullstack"
REMOVE_DEMO_FULLSTACK="remove_frontend"
TARGET_PROJECT_GOAL_AND_DESCRIPTION="""
Build a fullstack that uses simple Vue
"""
# Must specify true since demo frontend is removed
TARGET_HAVE_FRONTEND="true"
# Must specify true if the new frontend uses Vue
FRONTEND_HAVE_VUE="true"
# REMOVE_SST is omitted (defaults to false), keeping SST for the demo backend.
# If TARGET_HAVE_FRONTEND or FRONTEND_HAVE_VUE were omitted here, Roo would ask.

[Include/Paste INIT_PROMPT.md]
