export COREPACK_ENABLE_DOWNLOAD_PROMPT=0

# Automatically install pnpm via corepack if not found
if ! command -v pnpm >/dev/null 2>&1
then
  npm i -g --no-update-notifier corepack@latest @antfu/ni
  corepack install
  corepack enable pnpm
fi

# Force pnpm to use global store instead of $PWD, ref: https://stackoverflow.com/questions/76573556/pnpm-use-docker-volume-as-store-path
pnpm config -g set store-dir $PNPM_HOME/store
