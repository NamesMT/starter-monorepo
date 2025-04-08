<!--
### ROO PREREQUISITE INSTRUCTIONS (EXECUTE STRICTLY IN ORDER):

(EXECUTE THIS FIRST THING UPON RECEIVING THE PROMPT, DO NOT LOAD MEMORY BANK AND PROCESS USER INPUT BEFOREHAND, IF THE MEMORY BANK IS ALREADY ACTIVE, DROP OR IGNORE THE MEMORY BANK CONTEXT)

1. Check the current agent mode that you're running in, switch to `default` mode if possible.
2. Proceed to parse and ask (if needed) for configuration values.
3. ONLY AFTER all steps above is done, load the Memory Bank (if present).
4. Re-read the internal rules below (e.g: `ROO EXECUTION OPTIMIZATION INSTRUCTION`, ...) and KEEP THEM IN MIND, DO NOT FORGOT ABOUT THEM, THEY ARE IMPORTANT.

### ROO EXECUTION OPTIMIZATION:

When performing the setup steps below (especially steps involving file modifications like removals, renaming, and context updates), analyze ALL required changes for a specific file based on the user's configuration *before* making any edits. Consolidate these changes into a single file modification operation (e.g., one `apply_diff` or `write_to_file` call per file) whenever feasible, instead of performing multiple separate edits on the same file. Read the file content only once if multiple changes are planned for it. Similarly, if multiple files or directories need to be deleted as part of a single logical step (like removing a demo app), consolidate these deletions into a single `execute_command` call (e.g., `rm -rf path/to/app path/to/related/config`).

### ROO CORE DEPENDENCY PRESERVATION:

During cleanup steps, DO NOT remove these dependencies, they are core configurations for the monorepo:
+ '@antfu/eslint-config' dependency from package.json or its usage within eslint.config.js.

### ROO UNCERTAINTY HANDLING:

If, during any removal or modification step, you are not completely certain whether a specific file, code block, configuration entry, or dependency should be removed/modified based on the user's choices and the preservation rules, DO NOT proceed automatically. Instead, ask the user for clarification before taking action. Prioritize avoiding unintended removals.

### ROO CLEANUP HANDLING CONSISTENCY:

When cleaning up contents (e.g., removing demo apps, frontend configs, SST), do double-check and ensure that all corresponding references, descriptions and related codes throughout the project and Memory Bank (`memory-bank/`) are removed.

### ROO TOKEN EFFICIENCY:

While executing the steps below, strive for efficiency in your internal reasoning (<thinking>) and explanations accompanying tool use and output to the user. Be clear and accurate, but avoid unnecessary verbosity or repetition, *especially* after the initial plan is understood. However, DO NOT sacrifice clarity or omit details critical for accurate execution according to all other instructions (Prerequisites, Optimization, Preservation, Uncertainty, Consistency). Adherence to those rules takes precedence over brevity.

-->

# Project Initialization Prompt Template

Welcome! Use this template to configure your new project based on the `starter-monorepo` repository. Provide the required information (detailed below) along with this template content in your prompt to Roo. After completing the prerequisite setup and considering all instructions (see internal comments above), Roo will then perform the following automated setup steps based on your input:

1. **Demo App Removal (Optional):** Based on your `REMOVE_DEMO_FULLSTACK` selection, the demo `frontend` and/or `backend` applications and their references and related codes throughout the project and Memory Bank will be removed.
2. **Frontend Config Cleanup (Optional):** If applicable based on `TARGET_HAVE_FRONTEND` and `FRONTEND_HAVE_VUE`, unused frontend configurations (UnoCSS, Vue ESLint) and `locals/common-vue` might be removed.
3. **SST Removal (Optional):** If `REMOVE_SST` is true, SST files, scripts, dependencies, and references will be removed.
  <!-- + Context For Roo: when doing SST Removal, these are SST's files: (`sst.config.ts`, `.env.sst`), also remove the `pathe` and `@types/aws-lambda` dependency, they are only used by SST -->
4. **Context Update & Renaming:** Process `TARGET_PROJECT_GOAL_AND_DESCRIPTION` (refine, confirm with user), then update related documents like `README.md` and Memory Bank, as well as replace `starter-monorepo` with `MONOREPO_ROOT_NAME` throughout project/Memory Bank.
5. **Initialize local secret env files:** Scan project for `.env.local` files and copy them to `.env.local.ignored`.
6. **INIT_PROMPT cleanup:** `INIT_PROMPT.md` its related files (`INIT_PROMPT-EXAMPLES.md`) will be removed.
7. **Planning Phase:** After cleanup, Roo can optionally enter a feedback loop with you to help make plans, create goals, and break down your project goals into actionable steps.

**Required Information:**

---

**1. Monorepo Root Name (`MONOREPO_ROOT_NAME`)**

* > Specify the desired name for your project's root `package.json`. This name should be NodeJS-friendly (e.g., `my-awesome-project`, `@my-org/an-app-monorepo`, `the-app--mono`).

```text
MONOREPO_ROOT_NAME="<your-project-name-here>"
```

---

**2. Remove Demo Applications? (`REMOVE_DEMO_FULLSTACK`)**

* > This template includes a demo full-stack setup (`apps/frontend` and `apps/backend`). Do you want remove one, or both?
  * **Options**:
    * `keep_both`: Keep both frontend and backend demo apps.
    * `remove_frontend`: Remove `apps/frontend`.
    * `remove_backend`: Remove `apps/backend`.
    * `remove_both`: Remove both `apps/frontend` and `apps/backend`.

```text
REMOVE_DEMO_FULLSTACK="<your-choice-here>"
```

---

**3. Target Project Goal and Description (`TARGET_PROJECT_GOAL_AND_DESCRIPTION`)**

* > Describe the main goal/intent of your project. Used for documents like README/Memory Bank updates.

```text
TARGET_PROJECT_GOAL_AND_DESCRIPTION="""
<your-project-goal-and-description-here>
"""
```

---

**Optional Information (Provide if needed based on your choices above):**

---

**4. Will Your Target Project Include a Frontend? (`TARGET_HAVE_FRONTEND`)**

* > Specify whether your final project goal includes building *any* kind of frontend application:
  * **Value Inferrence:**
    * If you kept the demo `frontend`, this is strictly automatically `true`.
  * **When to Specify/Ask:** This setting is only relevant if you have removed the demo `frontend` (chosen `frontend` or `both`).
  * **Effect:**
    * If `false`: Roo will remove frontend-specific configurations like the root `uno.config.ts` and related ESLint settings/plugins.

```text
# TARGET_HAVE_FRONTEND="<true-or-false>"
```

---

**5. Will Your Frontend Use Vue? (`FRONTEND_HAVE_VUE`)**

* **(Only need to ask if `TARGET_HAVE_FRONTEND` is true)**.
* > Specify whether your target frontend application (if any) will use the Vue framework.
  * **Value Inferrence:**
    * If you kept the demo `frontend`, this is strictly automatically `true`.
    * If `TARGET_HAVE_FRONTEND` is `false`, this is automatically `false`.
  * **When to Specify/Ask:** This setting is only relevant if you have removed the demo `frontend`, and `TARGET_HAVE_FRONTEND` is `true`.
  * **Effect:**
    * If `false`, Roo will remove Vue-specific configurations (like ESLint configs) and the `locals/common-vue` directory.

```text
# FRONTEND_HAVE_VUE="<true-or-false>"
```

---

**6. Remove SST (Serverless Stack Toolkit) Configuration? (`REMOVE_SST`)**

* > Specify whether you want to remove the SST from the project (configs, related scripts/dependencies, documentation references and related codes)
  * If omitted, the default value is `false` (SST configuration is kept).

```text
# REMOVE_SST="<true-or-false>"
```

---

**How to Use:**

To initialize your project, provide the **entire content of this file** in your prompt to Roo (e.g., by pasting it or attaching the file).

If any required or relevant optional configuration values are missing, Roo will first ask *how* you'd like to provide the missing information:
* **Interactively:** Roo will ask you for each missing value one by one (recommended for first-time users).
* **Via Template Snippet:** Roo will provide a consolidated code block containing ONLY the configuration variables for you to fill out and paste back.
  <!-- Context for Roo: remember to also includes optional configs, and put comments (if any) on top of the config instead of inline -->

(Advanced users: If you prefer to provide configuration values directly in the initial prompt, please see the separate [`INIT_PROMPT-EXAMPLES.md`](./INIT_PROMPT-EXAMPLES.md) file for the required format and examples.)
