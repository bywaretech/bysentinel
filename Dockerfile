FROM node:24-alpine AS base
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/collector/package.json apps/collector/package.json
COPY apps/dashboard/package.json apps/dashboard/package.json
COPY packages/core/package.json packages/core/package.json
COPY packages/aws-lambda/package.json packages/aws-lambda/package.json
COPY packages/providers/package.json packages/providers/package.json
COPY examples/aws-lambda-node/package.json examples/aws-lambda-node/package.json
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
RUN pnpm --filter @bysentinel/collector... build

# ---------------------------------------------------------------- collector
FROM node:24-alpine AS runtime
ENV NODE_ENV=production
# git is required for the code-context pipeline (clone at commit SHA).
RUN apk add --no-cache git openssh-client
WORKDIR /app
COPY --from=build /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/apps/collector ./apps/collector
COPY --from=build /app/packages/core ./packages/core
COPY --from=build /app/packages/providers ./packages/providers
RUN mkdir -p /data
EXPOSE 4000
CMD ["node", "apps/collector/dist/index.js"]

# ---------------------------------------------------------------- dashboard
FROM deps AS dashboard-build
COPY . .
RUN pnpm --filter @bysentinel/dashboard build

FROM node:24-alpine AS dashboard
ENV NODE_ENV=production
WORKDIR /app
COPY --from=dashboard-build /app/apps/dashboard/.output ./.output
EXPOSE 3000
ENV NITRO_PORT=3000
ENV NITRO_HOST=0.0.0.0
CMD ["node", ".output/server/index.mjs"]
