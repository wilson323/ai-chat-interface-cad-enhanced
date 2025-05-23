#!/bin/bash
# Docker 自动化部署脚本

# 创建Dockerfile
echo "=================== 创建Dockerfile ==================="
cat > deploy/Dockerfile << 'EOF'
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
EOF

# 创建.env文件
echo "=================== 创建环境配置文件 ==================="
cat > deploy/.env << 'EOF'
NODE_ENV=production
PORT=5008
REDIS_URL=redis://:RedisPassword123@redis:6379
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
FASTGPT_API_URL=/api/proxy/fastgpt
FASTGPT_API_KEY=sk-fastgpt-xxxx
EOF

# 创建docker-compose文件
echo "=================== 创建docker-compose文件 ==================="
cat > deploy/docker-compose.yml << 'EOF'
version: '3.8'

services:
  redis:
    image: redis:alpine
    command: redis-server --requirepass RedisPassword123 --appendonly yes
    volumes:
      - redis-data:/data
    restart: always
    healthcheck:
      test: ["CMD", "redis-cli", "-a", "RedisPassword123", "ping"]
      interval: 30s
      timeout: 5s
      retries: 3

  ai-chat-interface:
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    ports:
      - "5008:5008"
    env_file:
      - .env
    depends_on:
      - redis
    environment:
      - NODE_ENV=production
      - PORT=5008
      - REDIS_URL=redis://:RedisPassword123@redis:6379
    deploy:
      resources:
        limits:
          memory: 2G

volumes:
  redis-data:
EOF

# 打包项目
echo "=================== 打包项目 ==================="
rm -rf deploy/dist.tar.gz
# 使用--warning=no-file-changed选项忽略文件变化警告
tar --exclude="node_modules" --exclude=".next" --exclude="deploy/dist.tar.gz" --exclude=".git" --warning=no-file-changed -czf deploy/dist.tar.gz .

# 部署到服务器
echo "=================== 部署到服务器 ==================="

# 添加服务器密钥到known_hosts（自动接受）
ssh-keyscan -H 171.43.138.237 >> ~/.ssh/known_hosts 2>/dev/null

# 上传文件并执行部署
scp deploy/dist.tar.gz deploy/Dockerfile deploy/docker-compose.yml deploy/.env root@171.43.138.237:/root/
ssh root@171.43.138.237 << 'EOF'
  echo ">> 登录服务器成功，开始部署"
  
  # 创建项目目录
  mkdir -p /var/www/ai-chat-interface
  
  # 解压项目文件
  rm -rf /var/www/ai-chat-interface/*
  tar -xzf /root/dist.tar.gz -C /var/www/ai-chat-interface
  cp /root/Dockerfile /root/docker-compose.yml /root/.env /var/www/ai-chat-interface/
  cd /var/www/ai-chat-interface
  
  # 安装Docker（如果需要）
  if ! command -v docker &> /dev/null; then
    echo ">> 安装Docker"
    apt-get update
    apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
    echo "deb [arch=amd64 signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null
    apt-get update
    apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
    systemctl enable docker
    systemctl start docker
  fi
  
  # 确保安装Docker Compose
  if ! command -v docker-compose &> /dev/null; then
    echo ">> 安装Docker Compose"
    apt-get install -y docker-compose
  fi
  
  # 构建和启动容器
  echo ">> 构建和启动Docker容器"
  docker-compose up -d --build
  
  # 配置Nginx（如果需要）
  if command -v nginx &> /dev/null; then
    echo ">> 配置Nginx"
    cat > /etc/nginx/sites-available/ai-chat-interface << 'END'
server {
    listen 80;
    server_name _;
    
    location / {
        proxy_pass http://localhost:5008;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
END
    
    # 启用站点配置
    ln -sf /etc/nginx/sites-available/ai-chat-interface /etc/nginx/sites-enabled/
    
    # 测试并重启Nginx
    nginx -t && systemctl restart nginx
  else
    echo ">> Nginx未安装，跳过Nginx配置"
  fi
  
  echo ">> 部署完成！"
  echo ">> 应用运行在 http://171.43.138.237 (通过端口5008)"
EOF

echo "=================== 部署完成 ===================" 