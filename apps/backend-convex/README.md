# backend-convex

**backend-convex** is an additional backend for the project, powered by [Convex](https://convex.dev), read and try the tutorial on their site if you don't know what Convex is.

Convex helps you kick-start amazing apps super fast and simple.

## Cookbook:

For developing a new feature, and for small features, create functions in `convex/` directly as per common Convex usage.

When it's stable and grows, move it to `functions/` and re-exports it from there.
  * When it's in the `functions/` directory, changes won't cause a dev deploy immediately, you need to save some files in `convex` to trigger a deploy.

Reusable utils that does not closely tied to any function / table should be placed in `utils/`.
