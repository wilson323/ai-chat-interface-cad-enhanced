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

# 检查依赖
check_dependencies() {
    log_info "检查部署依赖..."
    
    if ! sudo docker --version &> /dev/null; then
        log_error "Docker 未安装或无法运行，请检查Docker安装"
        exit 1
    fi
    
    if ! command -v sshpass &> /dev/null; then
        log_warning "sshpass 未安装，将使用SSH密钥认证"
    fi
    
    log_success "依赖检查完成"
}

# 创建生产环境配置
create_production_env() {
    log_info "创建生产环境配置..."
    
    if [ ! -f ".env.production" ]; then
        log_info "创建 .env.production 文件..."
        cat > .env.production << EOF
# 生产环境配置
NODE_ENV=production
NEXT_PUBLIC_APP_ENV=production
PORT=3000
NEXT_PUBLIC_APP_URL=http://171.43.138.237:8005

# AG-UI性能优化配置
NEXT_PUBLIC_AG_UI_PERFORMANCE_ENABLED=true
NEXT_PUBLIC_AG_UI_METRICS_ENABLED=false
AG_UI_STREAM_BUFFER_SIZE=8192
AG_UI_CHUNK_DELAY=16
AG_UI_TYPEWRITER_SPEED=120
AG_UI_BATCH_SIZE=10
AG_UI_MAX_BUFFER=65536
AG_UI_DEBOUNCE_MS=5

# 管理员配置
NEXT_PUBLIC_ADMIN_ENABLED=true
NEXT_PUBLIC_ADMIN_DASHBOARD_PATH=/admin/dashboard

# 监控配置
MONITORING_ENABLED=true
PERFORMANCE_LOGGING=true
HEALTH_CHECK_ENABLED=true
LOG_LEVEL=info

# Redis配置
REDIS_URL=redis://:RedisPassword123@redis:6379

# 限流配置
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=60000
EOF
        log_success ".env.production 文件已创建"
    fi
}

# 构建Docker镜像
build_image() {
    log_info "跳过本地构建，将在服务器上构建Docker镜像..."
    log_success "本地准备完成，准备传输到服务器"
}

# 执行SSH命令
ssh_exec() {
    local command="$1"
    if command -v sshpass &> /dev/null; then
        sshpass -p "${SERVER_PASSWORD}" ssh -o StrictHostKeyChecking=no "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "${command}"
    else
        ssh -o StrictHostKeyChecking=no "${PRODUCTION_USER}@${PRODUCTION_SERVER}" "${command}"
    fi
}

# 上传文件
scp_upload() {
    local source="$1"
    local dest="$2"
    if command -v sshpass &> /dev/null; then
        sshpass -p "${SERVER_PASSWORD}" scp -o StrictHostKeyChecking=no "${source}" "${PRODUCTION_USER}@${PRODUCTION_SERVER}:${dest}"
    else
        scp -o StrictHostKeyChecking=no "${source}" "${PRODUCTION_USER}@${PRODUCTION_SERVER}:${dest}"
    fi
}

# 部署到服务器
deploy_to_server() {
    log_info "部署到生产服务器..."
    
    # 创建临时部署目录
    TEMP_DIR=$(mktemp -d)
    
    # 复制项目文件到临时目录（排除node_modules和.git）
    log_info "准备项目文件..."
    mkdir -p "${TEMP_DIR}/project"
    cp -r . "${TEMP_DIR}/project/"
    
    # 清理不需要的目录
    rm -rf "${TEMP_DIR}/project/node_modules" 2>/dev/null || true
    rm -rf "${TEMP_DIR}/project/.git" 2>/dev/null || true
    rm -rf "${TEMP_DIR}/project/.next" 2>/dev/null || true
    rm -rf "${TEMP_DIR}/project/tmp" 2>/dev/null || true
    rm -rf "${TEMP_DIR}/project/.pytest_cache" 2>/dev/null || true
    
    # 复制部署相关文件到项目目录
    cp docker-compose.prod.yml "${TEMP_DIR}/project/docker-compose.yml"
    cp .env.production "${TEMP_DIR}/project/" 2>/dev/null || true
    cp healthcheck.js "${TEMP_DIR}/project/" 2>/dev/null || true
    
    # 创建项目压缩包
    log_info "创建项目压缩包..."
    cd "${TEMP_DIR}"
    tar -czf project.tar.gz project/
    cd - > /dev/null
    
    # 在服务器上创建目录
    log_info "准备服务器环境..."
    ssh_exec "
        # 检查存储盘挂载状态
        if [ ! -d '/mnt/data' ]; then
            echo '错误: 存储盘 /mnt/data 不存在，请检查挂载状态'
            exit 1
        fi
        
        # 检查存储盘可用空间 (至少需要2GB)
        AVAILABLE_SPACE=\$(df /mnt/data | awk 'NR==2 {print \$4}')
        REQUIRED_SPACE=2097152  # 2GB in KB
        if [ \$AVAILABLE_SPACE -lt \$REQUIRED_SPACE ]; then
            echo \"警告: 存储盘可用空间不足 (\${AVAILABLE_SPACE}KB < \${REQUIRED_SPACE}KB)\"
        fi
        
        mkdir -p "${DEPLOY_PATH}"
        cd "${DEPLOY_PATH}"
        docker-compose down 2>/dev/null || true
        docker system prune -f || true
        rm -rf project/ || true
        mkdir -p project/
    "
    
    # 上传项目文件
    log_info "上传项目文件..."
    scp_upload "${TEMP_DIR}/project.tar.gz" "${DEPLOY_PATH}/"
    
    # 在服务器上执行构建和部署
    log_info "在服务器上构建和启动服务..."
    ssh_exec "
        cd "${DEPLOY_PATH}"
        
        # 解压项目文件
        echo '解压项目文件...'
        tar -xzf project.tar.gz
        cd project/
        
        # 检查文件是否正确解压
        echo '检查文件结构...'
        ls -la
        
        # 直接使用Docker构建（服务器上网络正常）
        echo '构建Docker镜像...'
        docker build -f Dockerfile.prod -t ${PROJECT_NAME}:latest .
        
        # 启动服务
        echo '启动服务...'
        docker-compose up -d
        
        # 等待服务启动
        echo '等待服务启动...'
        sleep 30
        
        # 检查服务状态
        echo '检查服务状态...'
        docker-compose ps
        
        # 清理临时文件
        cd ..
        rm -f project.tar.gz
        
        echo 'Deployment completed!'
    "
    
    # 清理本地临时目录
    rm -rf "${TEMP_DIR}"
    
    log_success "服务器部署完成"
}

# 验证部署
verify_deployment() {
    log_info "验证部署结果..."
    
    # 等待服务完全启动
    sleep 20
    
    local max_attempts=10
    local attempt=1
    
    while [ "$attempt" -le "$max_attempts" ]; do
        log_info "尝试健康检查... ($attempt/$max_attempts)"
        
        if curl -f --connect-timeout 10 --max-time 30 "http://${PRODUCTION_SERVER}:${PRODUCTION_PORT}/api/health" > /dev/null 2>&1; then
            log_success "生产服务器健康检查通过！"
            break
        fi
        
        if [ "$attempt" -eq "$max_attempts" ]; then
            log_error "健康检查失败，请检查服务状态"
            # 显示服务器日志
            ssh_exec "cd \"${DEPLOY_PATH}\" && docker-compose logs --tail=50"
            return 1
        fi
        
        sleep 10
        ((attempt++))
    done
    
    # 显示访问信息
    echo ""
    log_success "部署验证完成！"
    echo "======================================"
    echo "生产环境访问信息："
    echo "- 主应用: http://${PRODUCTION_SERVER}:${PRODUCTION_PORT}"
    echo "- 管理面板: http://${PRODUCTION_SERVER}:${PRODUCTION_PORT}/admin/dashboard"
    echo "- 健康检查: http://${PRODUCTION_SERVER}:${PRODUCTION_PORT}/api/health"
    echo "- 性能监控: http://${PRODUCTION_SERVER}:${PRODUCTION_PORT}/api/ag-ui/performance"
    echo "======================================"
}

# 主函数
main() {
    echo "======================================"
    echo "🚀 AI Chat Interface 生产环境部署"
    echo "目标服务器: ${PRODUCTION_SERVER}:${PRODUCTION_PORT}"
    echo "用户: ${PRODUCTION_USER}"
    echo "======================================"
    
    read -p "确认开始部署吗？[y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "部署已取消"
        exit 0
    fi
    
    # 执行部署流程
    check_dependencies
    create_production_env
    build_image
    deploy_to_server
    verify_deployment
    
    log_success "🎉 生产环境部署成功完成！"
    echo ""
    echo "AG-UI性能优化功能已启用："
    echo "- 流式响应优化器 ✅"
    echo "- 性能监控系统 ✅"
    echo "- 管理员监控面板 ✅"
    echo "- 健康检查系统 ✅"
    echo ""
}

# 错误处理
trap 'log_error "部署过程中发生错误，请检查日志"; exit 1' ERR

# 执行主函数
main "$@" 