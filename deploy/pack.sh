#!/bin/bash
# 打包项目脚本

echo "=================== 打包项目 ==================="
rm -rf dist.tar.gz
tar --exclude="node_modules" --exclude=".next" --exclude="dist.tar.gz" --exclude=".git" -czf dist.tar.gz .
echo "打包完成: dist.tar.gz" 