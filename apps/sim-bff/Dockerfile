# Multi-stage build for @via-farm-lab/sim-bff.
# Run from the repo root:
#   docker build -f apps/sim-bff/Dockerfile -t via-farm-lab/sim-bff:dev .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /workspace
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY apps/sim-bff/package.json apps/sim-bff/
COPY packages/api-contracts/package.json packages/api-contracts/
COPY packages/telemetry/package.json packages/telemetry/
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY tsconfig.base.json tsconfig.node.json tsconfig.dom.json tsconfig.json ./
COPY apps/sim-bff apps/sim-bff
COPY packages/api-contracts packages/api-contracts
COPY packages/telemetry packages/telemetry
RUN pnpm -F @via-farm-lab/sim-bff build

FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/apps/sim-bff/dist ./apps/sim-bff/dist
COPY --from=build /workspace/apps/sim-bff/package.json ./apps/sim-bff/
COPY --from=build /workspace/packages packages
COPY --from=build /workspace/package.json /workspace/pnpm-workspace.yaml ./
EXPOSE 4000
HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD wget -qO- http://localhost:4000/health || exit 1
CMD ["node", "apps/sim-bff/dist/index.js"]
