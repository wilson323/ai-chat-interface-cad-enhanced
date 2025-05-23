# 构建阶段
FROM node:18-alpine AS builder

# 安装系统级构建依赖（包含中文字体）
RUN apk add --no-cache --virtual .build-deps \
    python3 \
    make \
    g++ \
    # 图形库依赖
    cairo-dev \
    pango-dev \
    giflib-dev \
    librsvg-dev \
    # 字体支持
    fontconfig \
    ttf-freefont \
    && fc-cache -fv

# 配置pnpm
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate

WORKDIR /app
COPY . .

# 修复npm canvas配置
RUN echo "canvas_binary_host_mirror=https://npmmirror.com/mirrors/canvas" > .npmrc

# 安装依赖并构建
RUN pnpm install --frozen-lockfile \
    && pnpm build \
    && pnpm prune --production

# 生产阶段
FROM node:18-alpine

# 安装运行时依赖
RUN apk add --no-cache \
    # 图形渲染
    cairo \
    pango \
    giflib \
    librsvg \
    # 字体支持
    fontconfig \
    ttf-freefont \
    # 系统兼容
    libc6-compat \
    # 图形加速
    mesa-gl \
    && fc-cache -fv

# 配置pnpm
RUN corepack enable && corepack prepare pnpm@8.15.5 --activate

WORKDIR /app
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json .
COPY --from=builder /app/node_modules ./node_modules

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget --no-verbose --tries=1 --spider http://localhost:5008/api/health || exit 1

EXPOSE 5008
CMD ["pnpm", "start"]
