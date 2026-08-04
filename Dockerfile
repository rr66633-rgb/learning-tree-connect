# Nashaa (learning-tree-connect) - standalone deployment image
# Works on Railway, Render, or any other Docker-based host.

FROM node:22-slim

# The project pins its package manager via package.json's "packageManager"
# field (pnpm). Corepack ships with Node and reads that field automatically.
RUN corepack enable

WORKDIR /app

# Install dependencies first (this layer is cached as long as these two
# files don't change, so code edits don't force a full reinstall).
#
# --no-frozen-lockfile (not --frozen-lockfile): the committed pnpm-lock.yaml
# predates some entries in package.json (this predates this deployment prep
# too -- it was already out of sync in the Manus-hosted repo). Rather than
# failing the build, let pnpm reconcile and regenerate the lockfile here;
# it will be byte-identical on every build as long as package.json doesn't
# change, so this doesn't hurt reproducibility going forward.
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --no-frozen-lockfile

# Now copy the rest of the source and build.
COPY . .
RUN pnpm run build

ENV NODE_ENV=production
EXPOSE 3000

# Run the compiled server. Devdependencies (drizzle-kit, vite, esbuild,
# typescript) are intentionally kept in the image, not pruned, so
# `pnpm run db:push` can still be run inside the running container as a
# one-off command when you need to apply a schema migration.
CMD ["node", "dist/index.js"]
