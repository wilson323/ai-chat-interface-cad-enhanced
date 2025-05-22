# Monaco Editor Workers

这个目录包含Monaco编辑器所需的Web Worker文件。

要生成这些文件，你需要使用webpack或其他打包工具。以下是一个简单的方法：

1. 安装monaco-editor-webpack-plugin:
\`\`\`bash
npm install monaco-editor-webpack-plugin --save-dev
\`\`\`

2. 在webpack配置中添加:
\`\`\`js
const MonacoWebpackPlugin = require('monaco-editor-webpack-plugin');

module.exports = {
  plugins: [
    new MonacoWebpackPlugin({
      languages: ['javascript', 'typescript', 'html', 'css', 'json'],
      filename: '[name].worker.js',
      publicPath: '/monaco-editor-workers/'
    })
  ]
};
\`\`\`

3. 构建应用程序，然后将生成的worker文件复制到此目录。
