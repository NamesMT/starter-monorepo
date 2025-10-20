# backend-convex

**backend-convex** is an additional backend for the project, powered by [Convex](https://convex.dev), read and try the tutorial on their site if you don't know what Convex is.

Convex helps you kick-start amazing apps super fast and simple.

## Notes:

Auth is optional, you can remove it or just put the following sample config into Convex (for testing and development, do not deploy a production app with this config):
```
CUSTOM_JWT_ISSUER=https://api.workos.com
CUSTOM_JWT_JWKS_URL=https://api.workos.com/sso/jwks/client_01JW6JMTP3CCKVBR5V7K8BT6R4
CUSTOM_JWT_CLIENT_ID=client_01JW6JMTP3CCKVBR5V7K8BT6R4
```
**NOTE**: for auth to work with **WorkOS**, you currently need to manually add `aud` field to WorkOS's JWT payload yourself via `JWT Template` feature of WorkOS.  
Ref: https://docs.convex.dev/auth/authkit/#debugging-authentication

`convex dev` might create a few new files when you run it for the first time, you should discard it: `tsconfig.json`, `.gitignore`, `README.md`

## Cookbook:

For developing a new feature, and for small features, create functions in `convex/` directly as per common Convex usage.

When it's stable and grows, move it to `functions/` and re-exports it from there.

Reusable utils that does not closely tied to any function / table should be placed in `utils/`.
