#!/bin/bash

# 新仓库配置
NEW_REPO_NAME="ai-chat-interface-cad-enhanced"
GITHUB_USERNAME="wilson323"
NEW_REPO_URL="https://github.com/${GITHUB_USERNAME}/${NEW_REPO_NAME}.git"

echo "=== 推送代码到新的GitHub仓库 ==="
echo "新仓库URL: ${NEW_REPO_URL}"
echo ""

# 备份当前remote
echo "1. 备份当前remote配置..."
git remote rename origin origin-backup

# 添加新的remote
echo "2. 添加新的remote..."
git remote add origin "${NEW_REPO_URL}"

# 推送所有分支和标签到新仓库
echo "3. 推送代码到新仓库..."
git push -u origin main

echo ""
echo "=== 推送完成 ==="
echo "新仓库地址: https://github.com/${GITHUB_USERNAME}/${NEW_REPO_NAME}"
echo ""
echo "如果需要恢复到原仓库，运行："
echo "git remote remove origin"
echo "git remote rename origin-backup origin" 