#!/bin/bash
# 自动化部署脚本

# 打包项目
echo "=================== 打包项目 ==================="
rm -rf dist.tar.gz

# 使用--warning=no-file-changed选项忽略文件变化警告
tar --exclude="node_modules" --exclude=".next" --exclude="dist.tar.gz" --exclude=".git" --warning=no-file-changed -czf dist.tar.gz .

# 部署到服务器
echo "=================== 部署到服务器 ==================="

# 添加服务器密钥到known_hosts（自动接受）
ssh-keyscan -H 171.43.138.237 >> ~/.ssh/known_hosts 2>/dev/null

# 上传文件并执行部署
scp dist.tar.gz root@171.43.138.237:/root/
ssh root@171.43.138.237 'bash -s' << 'ENDSSH'
  echo ">> 登录服务器成功，开始部署"
  
  # 创建项目目录
  mkdir -p /var/www/ai-chat-interface
  
  # 解压项目文件
  rm -rf /var/www/ai-chat-interface/*
  tar -xzf /root/dist.tar.gz -C /var/www/ai-chat-interface
  cd /var/www/ai-chat-interface
  
  # 安装依赖并构建
  echo ">> 安装 Node.js"
  if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
    apt-get install -y nodejs
  fi
  
  echo ">> 安装 pnpm"
  if ! command -v pnpm &> /dev/null; then
    npm install -g pnpm@8.15.5
  fi
  
  # 安装 Redis
  echo ">> 安装 Redis"
  if ! command -v redis-server &> /dev/null; then
    apt-get update
    apt-get install -y redis-server
    
    # 配置Redis
    cp /etc/redis/redis.conf /etc/redis/redis.conf.backup
    
    # 修改Redis配置：开启持久化、设置密码
    cat > /etc/redis/redis.conf << 'REDISCONF'
bind 127.0.0.1
port 6379
protected-mode yes
daemonize yes
save 900 1
save 300 10
save 60 10000
rdbcompression yes
dbfilename dump.rdb
dir /var/lib/redis
appendonly yes
appendfilename "appendonly.aof"
requirepass RedisPassword123
maxmemory 256mb
maxmemory-policy allkeys-lru
REDISCONF
    
    # 重启Redis服务
    systemctl enable redis-server
    systemctl restart redis-server
    
    echo "Redis安装完成并已启动"
  fi
  
  echo ">> 安装构建依赖"
  apt-get update
  apt-get install -y build-essential libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev
  
  # 创建.env文件
  echo ">> 创建环境配置文件"
  cat > .env << 'ENVCONFIG'
NODE_ENV=production
PORT=5008
REDIS_URL=redis://:RedisPassword123@localhost:6379
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
FASTGPT_API_URL=/api/proxy/fastgpt
FASTGPT_API_KEY=sk-fastgpt-xxxx
ENVCONFIG
  
  echo ">> 安装项目依赖"
  pnpm install
  
  echo ">> 构建项目"
  pnpm build
  
  # 使用 PM2 运行项目
  echo ">> 设置 PM2"
  if ! command -v pm2 &> /dev/null; then
    npm install -g pm2
  fi
  
  # 创建 PM2 配置文件
  cat > pm2.config.js << 'EOF'
module.exports = {
  apps: [
    {
      name: 'ai-chat-interface',
      script: 'pnpm',
      args: 'start',
      cwd: '/var/www/ai-chat-interface',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 5008
      }
    }
  ]
}
EOF
  
  # 停止旧的实例（如果存在）
  pm2 stop ai-chat-interface || true
  pm2 delete ai-chat-interface || true
  
  # 启动应用
  echo ">> 启动应用"
  pm2 start pm2.config.js
  pm2 save
  pm2 startup
  
  # 配置 Nginx
  echo ">> 配置 Nginx"
  if ! command -v nginx &> /dev/null; then
    apt-get install -y nginx
  fi
  
  cat > /etc/nginx/sites-available/ai-chat-interface << 'EOF'
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
EOF
  
  # 启用站点配置
  ln -sf /etc/nginx/sites-available/ai-chat-interface /etc/nginx/sites-enabled/
  
  # 测试并重启 Nginx
  nginx -t && systemctl restart nginx
  
  echo ">> 部署完成！"
  echo ">> 应用运行在 http://171.43.138.237 (通过端口5008)"
ENDSSH

echo "=================== 部署完成 ===================" 