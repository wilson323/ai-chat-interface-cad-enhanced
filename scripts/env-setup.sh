#!/bin/bash

# =================================
# AI Chat Interface 环境初始化脚本
# Environment Setup Script
# =================================

set -e

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 检查Node.js版本
check_node_version() {
    log_info "检查Node.js版本..."
    
    if ! command -v node &> /dev/null; then
        log_error "Node.js未安装"
        exit 1
    fi
    
    NODE_VERSION=$(node -v | cut -d'v' -f2)
    REQUIRED_VERSION="18.0.0"
    
    if ! npx semver -r ">=${REQUIRED_VERSION}" "${NODE_VERSION}" &> /dev/null; then
        log_error "Node.js版本过低: ${NODE_VERSION}，要求: >=${REQUIRED_VERSION}"
        exit 1
    fi
    
    log_success "Node.js版本检查通过: ${NODE_VERSION}"
}

# 检查npm版本
check_npm_version() {
    log_info "检查npm版本..."
    
    if ! command -v npm &> /dev/null; then
        log_error "npm未安装"
        exit 1
    fi
    
    NPM_VERSION=$(npm -v)
    REQUIRED_VERSION="9.0.0"
    
    if ! npx semver -r ">=${REQUIRED_VERSION}" "${NPM_VERSION}" &> /dev/null; then
        log_warning "npm版本过低: ${NPM_VERSION}，建议升级到: >=${REQUIRED_VERSION}"
    fi
    
    log_success "npm版本检查通过: ${NPM_VERSION}"
}

# 清理环境
clean_environment() {
    log_info "清理环境..."
    
    # 删除node_modules和lockfile
    rm -rf node_modules package-lock.json
    
    # 清理npm缓存
    npm cache clean --force
    
    log_success "环境清理完成"
}

# 安装依赖
install_dependencies() {
    log_info "安装项目依赖..."
    
    # 设置npm配置
    npm config set legacy-peer-deps true
    npm config set audit-level moderate
    
    # 安装依赖
    npm install --legacy-peer-deps --no-fund --no-audit
    
    log_success "依赖安装完成"
}

# 验证关键依赖
verify_critical_deps() {
    log_info "验证关键依赖..."
    
    # 检查React版本
    REACT_VERSION=$(npm ls react --depth=0 2>/dev/null | grep -o "react@[0-9]*\.[0-9]*\.[0-9]*" | cut -d'@' -f2)
    if [[ "${REACT_VERSION}" != "18.3.1" ]]; then
        log_error "React版本异常: ${REACT_VERSION}"
        exit 1
    fi
    
    # 检查Three.js版本
    THREE_VERSION=$(npm ls three --depth=0 2>/dev/null | grep -o "three@[0-9]*\.[0-9]*\.[0-9]*" | cut -d'@' -f2)
    if [[ "${THREE_VERSION}" != "0.149.0" ]]; then
        log_error "Three.js版本异常: ${THREE_VERSION}"
        exit 1
    fi
    
    # 检查Next.js版本
    NEXT_VERSION=$(npm ls next --depth=0 2>/dev/null | grep -o "next@[0-9]*\.[0-9]*\.[0-9]*" | cut -d'@' -f2)
    if [[ "${NEXT_VERSION}" != "15.3.2" ]]; then
        log_error "Next.js版本异常: ${NEXT_VERSION}"
        exit 1
    fi
    
    log_success "关键依赖验证通过"
}

# 检查TypeScript配置
verify_typescript() {
    log_info "验证TypeScript配置..."
    
    # 运行类型检查
    if npm run type-check; then
        log_success "TypeScript类型检查通过"
    else
        log_error "TypeScript类型检查失败"
        exit 1
    fi
}

# 生成依赖报告
generate_deps_report() {
    log_info "生成依赖报告..."
    
    echo "=== 依赖树状态 ===" > deps-report.txt
    npm ls --depth=1 >> deps-report.txt 2>&1
    
    echo "" >> deps-report.txt
    echo "=== 安全审计 ===" >> deps-report.txt
    npm audit --audit-level=moderate >> deps-report.txt 2>&1
    
    log_success "依赖报告已生成: deps-report.txt"
}

# 主函数
main() {
    echo "======================================"
    echo "🔧 AI Chat Interface 环境初始化"
    echo "======================================"
    
    check_node_version
    check_npm_version
    clean_environment
    install_dependencies
    verify_critical_deps
    verify_typescript
    generate_deps_report
    
    log_success "🎉 环境初始化完成！"
    echo ""
    echo "下一步操作："
    echo "- 运行开发服务器: npm run dev"
    echo "- 构建生产版本: npm run build"
    echo "- 依赖审计: npm run deps:audit"
    echo ""
}

# 错误处理
trap 'log_error "环境初始化失败，请检查错误信息"; exit 1' ERR

# 执行主函数
main "$@" 