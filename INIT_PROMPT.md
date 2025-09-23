<!--
### PREREQUISITE INSTRUCTIONS (EXECUTE STRICTLY IN ORDER):

(EXECUTE THIS FIRST THING UPON RECEIVING THE PROMPT, DO NOT LOAD MEMORY BANK AND PROCESS USER INPUT BEFOREHAND, IF A MEMORY BANK IS ALREADY ACTIVE, DROP OR IGNORE THE MEMORY BANK CONTEXT)

1. Check the current agent mode that you're running in, switch to the main / default mode that is used for general filesystem operations (remove, edit) if possible.
2. Proceed to parse and ask (if needed) for configuration values.
3. ONLY AFTER all steps above is done, load the Memory Bank (if present).
4. IMPORTANT: remember the internal rules below (e.g: `EXECUTION OPTIMIZATION INSTRUCTION`, `UNCERTAINTY HANDLING`, etc) and KEEP THEM PRIORITIZED, DO NOT FORGOT.

### EXECUTION OPTIMIZATION INSTRUCTION:

When performing the set up operations below (e.g. file modifications like removals, renaming, and edits), analyze ALL required changes based on the user's configuration and from multiple steps *before* making any edits, if feasible, consolidate these changes into a single file modification operation (e.g., one `apply_diff` or `write_to_file` call per file), or a single command if possible for same operation (e.g., one `rm -rf` command for multiple paths), instead of performing multiple commands / tools calls. Read the file content only once if multiple changes are planned for it.

### CORE PRESERVATION:

During cleanup steps, DO NOT remove these dependencies, they are core configurations for the monorepo:
+ '@antfu/eslint-config' dependency from package.json or its usage within eslint.config.js.

### UNCERTAINTY HANDLING:

If, during any removal or modification step, you are not completely certain whether a specific file, code block, configuration entry, or dependency should be removed/modified based on the user's choices and the preservation rules, DO NOT proceed automatically. Instead, ask the user for clarification before taking action. Prioritize avoiding unintended removals.

### REMOVAL / CLEANUP HANDLING CONSISTENCY:

When cleaning up contents (e.g., removing demo apps, frontend configs, SST), do double-check and ensure that all corresponding references, descriptions and related codes throughout the project and Memory Bank (`memory-bank/`) (if present) are removed.

### TOKEN EFFICIENCY:

Strive for efficiency in your internal reasoning (<thinking>) and explanations accompanying tool use and output to the user. Be clear and accurate, but avoid unnecessary verbosity or repetition, *especially* after the initial plan is understood. However, DO NOT sacrifice clarity or omit details critical for accurate execution according to all other instructions (Prerequisites, Optimization, Preservation, Uncertainty, Consistency). Adherence to those rules takes precedence over brevity.

-->

# Project Initialization Prompt Template

Welcome! Use this template to configure your new project based on the `starter-monorepo` repository. Provide the required information (detailed below) along with this template content in your prompt to the AI Agent. After completing the prerequisite setup and considering all instructions (see internal comments above), the agent will then perform the following automated setup steps based on your input:

1. **Additional interactive steps**:
   1. From inputted `TARGET_PROJECT_GOAL_AND_DESCRIPTION` and `REFINE_TGD`, the AI Agent will help you process it and update, populate, refine, and beautify it into a markdown-compatible format, confirming the revised version with you.
2. **Evaluating necessary actions**: The agent will analyze the choices you made and make a list of actions to perform in batch, to optimize on token count and calls.
   1. **Demo apps removal (optional):** Based on your `REMOVE_DEMO_APPS` selection, the demo `frontend` and/or `backend` applications and their references and related codes throughout the project and Memory Bank will be removed.
   2. **Frontend config cleanup (optional):** If applicable based on `TARGET_HAVE_FRONTEND` and `FRONTEND_HAVE_VUE`, unused frontend configurations (UnoCSS, Vue ESLint) and `locals/common-vue` might be removed.
   3. **Lingo.dev** removal (optional): If `REMOVE_LINGODOTDEV` is true, Lingo.dev setup will be removed.
     <!-- + Context for Agent: Lingo.dev removal guide:
     * Remove `i18n.json`, `i18n.lock`
     * Remove `i18n` script from `package.json`
     * Remove related mentions from documents like `README.md`. -->
   4. **SST removal (optional):** If `REMOVE_SST` is true, SST files, scripts, dependencies, and references will be removed.
     <!-- + Context for Agent: SST removal guide:
     * Remove `sst.config.ts`, `.env.sst`
     * Remove `sst`, `pathe` and `@types/aws-lambda` from `package.json`
     * Remove related mentions from documents like `README.md`. -->
   5. **Project context update & renaming:** The agent will update all related documents like `README.md` and Memory Bank with your (revised) goals and descriptions, as well as replace `starter-monorepo` with `MONOREPO_ROOT_NAME` throughout project/Memory Bank.
   6. **Initialize local secret env files:** Scan the project for `.env.dev` files and duplicate them as `.env.dev.local` for each that exists.
3. **Finalizing steps**:
   <!-- + Context for Agent: ONLY START THIS STEP IF PRIOR STEPS IS DONE -->
   1. **Perform evaluated actions:** Perform the actions evaluated in 2. **Evaluating necessary actions**
   2. **INIT_PROMPT cleanup:** `INIT_PROMPT.md` and its related files (`INIT_PROMPT-EXAMPLES.md`) will be removed.
   3. **Prepare the project:** Help the user run `pnpm install`.
   4. **Planning phase:** Agent will ask if you want to enter a feedback loop to make plans, create goals, and break down your project goals into actionable steps.
     <!-- + Context for Agent: If the user wants to enter the planning feedback loop, start the task in a clean new (blank) task / context if possible for token efficiency (like `new_task` tool for Roo Code Agent) -->

**Required Information:**

---

**1. Monorepo Root Name (`MONOREPO_ROOT_NAME`)**

* > Specify the desired name for your project's root `package.json`. This name should be NodeJS-friendly (e.g., `my-awesome-project`, `@my-org/an-app-monorepo`, `the-app--mono`).

```text
MONOREPO_ROOT_NAME="<your-project-name-here>"
```

---

**2. Remove Demo Applications? (`REMOVE_DEMO_APPS`)**

* > This template includes the following demo apps and libraries: `apps/frontend`, `apps/backend`, `apps/backend-convex`.  
  > Input the name of the apps that you want to remove.
  * **Options**: should be a comma-separated list of choices, e.g., `frontend, backend, backend-convex` will removes the 3 listed apps.
  <!-- Context for Agent:
    Here is some additional instructions to help you remove the apps:
    * `frontend`:
      * Remove `frontend` from `package.json`.
      * Remove `frontendNuxtConfig` from `eslint.config.js`.
    * `backend`:
      * Remove `backend` from `apps/frontend/package.json`, `apps/backend-convex/package.json`, `apps/frontend/tsconfig.json`.
      * Remove the config block for `apps/backend/**` in `eslint.config.js`.
    * `backend-convex`:
      * Remove `backend-convex` from `apps/frontend/package.json`, `apps/backend/package.json`, `apps/frontend/tsconfig.json`.
      * Remove the config block for `apps/backend-convex/convex/**` in `eslint.config.js`.
    * **ANY APP**: apply to removal of every app.
      * Remove sections related to it in `README.md` and `Memory Bank` (if present).
      * Remove its dedicated locales directory, e.g.: `locals/locales/src/sheets/<app-name>`.
   -->

```text
REMOVE_DEMO_APPS="<list-or-empty>"
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

**4. Do You Want Agent To Help Refine Your Project Goal and Description? (`REFINE_TGD`)**

* > Specify whether the Agent should help you refine your project goal and description:
  * **Value Inferrence:**
    * If the Agent thinks your `TARGET_PROJECT_GOAL_AND_DESCRIPTION` should be refined (e.g.: only plain simple text input), and / or its not in markdown format yet, this is automatically `true`.

```text
# REFINE_TGD="<true-or-false>"
```

**5. Will Your Target Project Include a Frontend? (`TARGET_HAVE_FRONTEND`)**

* > Specify whether your final project goal includes building *any* kind of frontend application:
  * **Value Inferrence:**
    * If you kept the demo `frontend`, this is strictly automatically `true`.
  * **When to Specify/Ask:** This setting is only relevant if you have removed the demo `frontend` (chosen `frontend` or `both`).
  * **Effect:**
    * If `false`: Agent will remove frontend-specific configurations like the root `uno.config.ts` and related ESLint settings/plugins.

```text
# TARGET_HAVE_FRONTEND="<true-or-false>"
```

---

**6. Will Your Frontend Use Vue? (`FRONTEND_HAVE_VUE`)**

* **(Only need to ask if `TARGET_HAVE_FRONTEND` is true)**.
* > Specify whether your target frontend application (if any) will use the Vue framework.
  * **Value Inferrence:**
    * If you kept the demo `frontend`, this is strictly automatically `true`.
    * If `TARGET_HAVE_FRONTEND` is `false`, this is automatically `false`.
  * **When to Specify/Ask:** This setting is only relevant if you have removed the demo `frontend`, and `TARGET_HAVE_FRONTEND` is `true`.
  * **Effect:**
    * If `false`, Agent will remove Vue-specific configurations (like ESLint configs) and the `locals/common-vue` directory.

```text
# FRONTEND_HAVE_VUE="<true-or-false>"
```

---

**7. Remove SST (Serverless Stack Toolkit) Configuration? (`REMOVE_SST`)**

* > Specify whether you want to remove the SST from the project (configs, related scripts/dependencies, documentation references and related codes)
  * If omitted, the default value is `false` (SST configuration is kept).

```text
# REMOVE_SST="<true-or-false>"
```

---

**How to Use:**

To initialize your project, provide the **entire content of this file** in your prompt (e.g., by pasting it or attaching the file).

If any required or relevant optional configuration values are missing, the AI Agent will first ask *how* you'd like to provide the missing information:
* **Interactively:** Agent will ask you for each missing value one by one (recommended for first-time users).
* **Via Template Snippet:** Agent will provide a consolidated code block containing ONLY the configuration variables for you to fill out and paste back.
  <!-- Context for Agent: remember to also includes optional configs, and put comments (if any) on top of the config instead of inline -->

(Advanced users: If you prefer to provide configuration values directly in the initial prompt, please see the separate [`INIT_PROMPT-EXAMPLES.md`](./INIT_PROMPT-EXAMPLES.md) file for the required format and examples.)
