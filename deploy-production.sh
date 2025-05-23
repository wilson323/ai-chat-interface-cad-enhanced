#!/bin/bash

# =================================
# AI Chat Interface 生产环境自动部署脚本
# Production Deployment Script for AI Chat Interface
# =================================

set -e  # 遇到错误立即退出

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 生产环境配置
PRODUCTION_SERVER="171.43.138.237"
PRODUCTION_PORT="8005"
PRODUCTION_USER="root"
SERVER_PASSWORD="Zkteco@135"
PROJECT_NAME="ai-chat-interface"
DEPLOY_PATH="/mnt/data/ai-chat-interface"

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

# 主要的部署脚本调用
./scripts/deploy-production.sh "$@" 