# Nashaa (learning-tree-connect) - standalone deployment image
# Works on Railway, Render, or any other Docker-based host.

FROM node:22-slim

# The project pins its package manager via package.json's "packageManager"
# field (pnpm). Corepack ships with Node and reads that field automatically.
RUN corepack enable

WORKDIR /app

# Install dependencies first (this layer is cached as long as these two
# files don't change, so code edits don't force a full reinstall).
COPY package.json pnpm-lock.yaml ./
COPY patches ./patches
RUN pnpm install --frozen-lockfile

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
