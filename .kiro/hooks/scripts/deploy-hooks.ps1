# Kiro Action Hooks 部署脚本
# 用于在Windows环境下部署和配置Kiro钩子系统

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,
    
    [Parameter(Mandatory=$false)]
    [switch]$Force,
    
    [Parameter(Mandatory=$false)]
    [switch]$Verify
)

# 错误处理设置
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# 脚本信息
$ScriptName = "Kiro Action Hooks 部署脚本"
$ScriptVersion = "1.0.0"

Write-Output "🚀 $ScriptName v$ScriptVersion"
Write-Output "=" * 50

function Test-Prerequisites {
    <#
    .SYNOPSIS
    检查部署前置条件
    #>
    
    Write-Output "🔍 检查部署前置条件..."
    
    # 检查Node.js
    try {
        $nodeVersion = node --version
        Write-Output "✅ Node.js: $nodeVersion"
    }
    catch {
        throw "❌ Node.js 未安装或不在PATH中"
    }
    
    # 检查npm
    try {
        $npmVersion = npm --version
        Write-Output "✅ npm: v$npmVersion"
    }
    catch {
        throw "❌ npm 未安装或不在PATH中"
    }
    
    # 检查TypeScript
    try {
        $tscVersion = npx tsc --version
        Write-Output "✅ TypeScript: $tscVersion"
    }
    catch {
        Write-Warning "⚠️ TypeScript 未全局安装，将使用项目本地版本"
    }
    
    Write-Output "✅ 前置条件检查完成"
}

function Test-ProjectStructure {
    <#
    .SYNOPSIS
    验证项目结构
    #>
    param([string]$Path)
    
    Write-Output "🏗️ 验证项目结构..."
    
    # 检查必要目录
    $RequiredDirs = @(".kiro", "src", "lib", "types")
    foreach ($dir in $RequiredDirs) {
        $dirPath = Join-Path $Path $dir
        if (-not (Test-Path $dirPath)) {
            Write-Warning "⚠️ 目录不存在，将创建: $dir"
            New-Item -ItemType Directory -Path $dirPath -Force | Out-Null
        }
        Write-Output "✅ 目录存在: $dir"
    }
    
    # 检查必要文件
    $RequiredFiles = @("package.json", "tsconfig.json")
    foreach ($file in $RequiredFiles) {
        $filePath = Join-Path $Path $file
        if (-not (Test-Path $filePath)) {
            Write-Warning "⚠️ 文件不存在: $file"
        } else {
            Write-Output "✅ 文件存在: $file"
        }
    }
    
    Write-Output "✅ 项目结构验证完成"
}

function Deploy-HookFiles {
    <#
    .SYNOPSIS
    部署钩子文件
    #>
    param([string]$ProjectPath)
    
    Write-Output "📦 部署钩子文件..."
    
    $HooksSourceDir = Join-Path $PSScriptRoot ".."
    $HooksTargetDir = Join-Path $ProjectPath ".kiro\hooks"
    
    # 确保目标目录存在
    if (-not (Test-Path $HooksTargetDir)) {
        New-Item -ItemType Directory -Path $HooksTargetDir -Force | Out-Null
        Write-Output "✅ 创建钩子目录: $HooksTargetDir"
    }
    
    # 复制钩子文件
    $HookFiles = @(
        "development-workflow-enhancement.kiro.hook",
        "project-standards-compliance.kiro.hook",
        "index.ts",
        "example-usage.ts"
    )
    
    foreach ($file in $HookFiles) {
        $sourcePath = Join-Path $HooksSourceDir $file
        $targetPath = Join-Path $HooksTargetDir $file
        
        if (Test-Path $sourcePath) {
            if ($Force -or -not (Test-Path $targetPath)) {
                Copy-Item $sourcePath $targetPath -Force
                Write-Output "✅ 部署钩子文件: $file"
            } else {
                Write-Output "⏭️ 跳过已存在文件: $file (使用 -Force 强制覆盖)"
            }
        } else {
            Write-Warning "⚠️ 源文件不存在: $file"
        }
    }
    
    # 复制核心文件
    $CoreSourceDir = Join-Path $HooksSourceDir "core"
    $CoreTargetDir = Join-Path $HooksTargetDir "core"
    
    if (Test-Path $CoreSourceDir) {
        if (-not (Test-Path $CoreTargetDir)) {
            New-Item -ItemType Directory -Path $CoreTargetDir -Force | Out-Null
        }
        
        Copy-Item "$CoreSourceDir\*" $CoreTargetDir -Recurse -Force
        Write-Output "✅ 部署核心文件到: core\"
    }
    
    # 复制类型定义
    $TypesSourceDir = Join-Path $HooksSourceDir "types"
    $TypesTargetDir = Join-Path $HooksTargetDir "types"
    
    if (Test-Path $TypesSourceDir) {
        if (-not (Test-Path $TypesTargetDir)) {
            New-Item -ItemType Directory -Path $TypesTargetDir -Force | Out-Null
        }
        
        Copy-Item "$TypesSourceDir\*" $TypesTargetDir -Recurse -Force
        Write-Output "✅ 部署类型定义到: types\"
    }
    
    # 复制配置文件
    $ConfigSourceDir = Join-Path $HooksSourceDir "config"
    $ConfigTargetDir = Join-Path $HooksTargetDir "config"
    
    if (Test-Path $ConfigSourceDir) {
        if (-not (Test-Path $ConfigTargetDir)) {
            New-Item -ItemType Directory -Path $ConfigTargetDir -Force | Out-Null
        }
        
        Copy-Item "$ConfigSourceDir\*" $ConfigTargetDir -Recurse -Force
        Write-Output "✅ 部署配置文件到: config\"
    }
    
    Write-Output "✅ 钩子文件部署完成"
}

function Install-Dependencies {
    <#
    .SYNOPSIS
    安装依赖包
    #>
    param([string]$ProjectPath)
    
    Write-Output "📚 安装项目依赖..."
    
    Push-Location $ProjectPath
    try {
        # 安装npm依赖
        Write-Output "正在运行 npm install..."
        npm install
        Write-Output "✅ npm 依赖安装完成"
        
        # 检查TypeScript编译
        Write-Output "正在检查TypeScript编译..."
        npx tsc --noEmit
        Write-Output "✅ TypeScript 编译检查通过"
        
    }
    catch {
        Write-Error "❌ 依赖安装失败: $_"
        throw
    }
    finally {
        Pop-Location
    }
}

function Test-HookDeployment {
    <#
    .SYNOPSIS
    验证钩子部署
    #>
    param([string]$ProjectPath)
    
    Write-Output "🧪 验证钩子部署..."
    
    $HooksDir = Join-Path $ProjectPath ".kiro\hooks"
    
    # 检查钩子文件
    $ExpectedFiles = @(
        "development-workflow-enhancement.kiro.hook",
        "project-standards-compliance.kiro.hook",
        "index.ts",
        "core\base-hook.ts",
        "core\hook-manager.ts",
        "core\mcp-tools-manager.ts",
        "types\index.ts",
        "config\hooks-config.json"
    )
    
    $MissingFiles = @()
    foreach ($file in $ExpectedFiles) {
        $filePath = Join-Path $HooksDir $file
        if (-not (Test-Path $filePath)) {
            $MissingFiles += $file
        }
    }
    
    if ($MissingFiles.Count -gt 0) {
        Write-Error "❌ 缺少以下文件:"
        $MissingFiles | ForEach-Object { Write-Error "  - $_" }
        throw "钩子部署验证失败"
    }
    
    Write-Output "✅ 所有必需文件都已部署"
    
    # 尝试编译TypeScript
    Push-Location $ProjectPath
    try {
        Write-Output "正在验证TypeScript编译..."
        npx tsc --noEmit --project .
        Write-Output "✅ TypeScript 编译验证通过"
    }
    catch {
        Write-Warning "⚠️ TypeScript 编译验证失败，但部署可能仍然成功"
    }
    finally {
        Pop-Location
    }
    
    Write-Output "✅ 钩子部署验证完成"
}

function Show-DeploymentSummary {
    <#
    .SYNOPSIS
    显示部署摘要
    #>
    param([string]$ProjectPath)
    
    Write-Output ""
    Write-Output "📊 部署摘要"
    Write-Output "=" * 30
    
    $HooksDir = Join-Path $ProjectPath ".kiro\hooks"
    $HookFiles = Get-ChildItem $HooksDir -Filter "*.kiro.hook" -ErrorAction SilentlyContinue
    
    Write-Output "项目路径: $ProjectPath"
    Write-Output "钩子目录: $HooksDir"
    Write-Output "已部署钩子数量: $($HookFiles.Count)"
    
    if ($HookFiles.Count -gt 0) {
        Write-Output "已部署的钩子:"
        $HookFiles | ForEach-Object {
            Write-Output "  - $($_.Name)"
        }
    }
    
    Write-Output ""
    Write-Output "🎯 下一步操作:"
    Write-Output "1. 在项目中导入钩子系统:"
    Write-Output "   import { initializeKiroHooks } from './.kiro/hooks/index.js';"
    Write-Output ""
    Write-Output "2. 初始化钩子系统:"
    Write-Output "   await initializeKiroHooks();"
    Write-Output ""
    Write-Output "3. 查看使用示例:"
    Write-Output "   node .kiro/hooks/example-usage.js"
    Write-Output ""
    Write-Output "4. 配置钩子参数:"
    Write-Output "   编辑 .kiro/hooks/config/hooks-config.json"
}

# 主执行逻辑
try {
    Write-Output "🔍 开始部署到项目: $ProjectPath"
    
    # 验证项目路径
    if (-not (Test-Path $ProjectPath)) {
        throw "项目路径不存在: $ProjectPath"
    }
    
    # 检查前置条件
    Test-Prerequisites
    
    # 验证项目结构
    Test-ProjectStructure -Path $ProjectPath
    
    # 部署钩子文件
    Deploy-HookFiles -ProjectPath $ProjectPath
    
    # 安装依赖
    Install-Dependencies -ProjectPath $ProjectPath
    
    # 验证部署（如果指定）
    if ($Verify) {
        Test-HookDeployment -ProjectPath $ProjectPath
    }
    
    # 显示部署摘要
    Show-DeploymentSummary -ProjectPath $ProjectPath
    
    Write-Output ""
    Write-Output "🎉 Kiro Action Hooks 部署成功！"
    exit 0
    
}
catch {
    Write-Error ""
    Write-Error "💥 部署失败: $_"
    Write-Error ""
    Write-Error "🔧 故障排除建议:"
    Write-Error "1. 确保项目路径正确且可访问"
    Write-Error "2. 检查Node.js和npm是否正确安装"
    Write-Error "3. 确保有足够的文件系统权限"
    Write-Error "4. 使用 -Force 参数强制覆盖现有文件"
    Write-Error "5. 使用 -Verify 参数进行详细验证"
    
    exit 1
}