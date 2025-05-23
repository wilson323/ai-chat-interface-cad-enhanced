#!/usr/bin/env node
/**
 * Docker健康检查脚本
 * 检查应用是否正常运行
 */

const http = require('http');

const options = {
  host: 'localhost',
  port: process.env.PORT || 3000,
  path: '/api/health',
  timeout: 2000,
  method: 'GET'
};

const request = http.request(options, (res) => {
  console.log(`健康检查状态: ${res.statusCode}`);
  if (res.statusCode === 200) {
    process.exit(0);
  } else {
    process.exit(1);
  }
});

request.on('error', (err) => {
  console.log('健康检查失败:', err.message);
  process.exit(1);
});

request.on('timeout', () => {
  console.log('健康检查超时');
  request.destroy();
  process.exit(1);
});

request.setTimeout(2000);
request.end(); 