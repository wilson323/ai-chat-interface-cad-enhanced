# Kiro 智能体约束验证脚本
# 自动检查代码是否符合智能体约束规范

param(
    [Parameter(Mandatory=$true)]
    [string]$ProjectPath,
    
    [Parameter(Mandatory=$false)]
    [string]$TargetPath = ".kiro/hooks",
    
    [Parameter(Mandatory=$false)]
    [switch]$Fix,
    
    [Parameter(Mandatory=$false)]
    [switch]$VerboseOutput
)

# 错误处理设置
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

# 脚本信息
$ScriptName = "Kiro 智能体约束验证脚本"
$ScriptVersion = "1.0.0"

Write-Output "🔍 $ScriptName v$ScriptVersion"
Write-Output "=" * 50

# 约束检查结果
$script:ViolationCount = 0
$script:CriticalViolations = @()
$script:HighViolations = @()
$script:MediumViolations = @()
$script:LowViolations = @()

function Write-Violation {
    param(
        [string]$Level,
        [string]$File,
        [int]$Line,
        [string]$Message,
        [string]$Rule
    )
    
    $violation = @{
        Level = $Level
        File = $File
        Line = $Line
        Message = $Message
        Rule = $Rule
        Timestamp = Get-Date
    }
    
    $script:ViolationCount++
    
    switch ($Level) {
        "CRITICAL" { 
            $script:CriticalViolations += $violation
            Write-Host "❌ CRITICAL: ${File}:${Line} - $Message" -ForegroundColor Red
        }
        "HIGH" { 
            $script:HighViolations += $violation
            Write-Host "⚠️ HIGH: ${File}:${Line} - $Message" -ForegroundColor Yellow
        }
        "MEDIUM" { 
            $script:MediumViolations += $violation
            Write-Host "⚡ MEDIUM: ${File}:${Line} - $Message" -ForegroundColor Cyan
        }
        "LOW" { 
            $script:LowViolations += $violation
            if ($VerboseOutput) {
                Write-Host "💡 LOW: ${File}:${Line} - $Message" -ForegroundColor Gray
            }
        }
    }
}

function Test-TypeScriptConstraints {
    <#
    .SYNOPSIS
    检查TypeScript代码约束
    #>
    param([string]$ProjectPath, [string]$TargetPath)
    
    Write-Output "📜 检查 TypeScript 代码约束..."
    
    $tsFiles = Get-ChildItem -Path (Join-Path $ProjectPath $TargetPath) -Filter "*.ts" -Recurse
    
    foreach ($file in $tsFiles) {
        $content = Get-Content $file.FullName -Raw
        $lines = Get-Content $file.FullName
        
        # 检查 any 类型使用
        if ($content -match '\bany\b(?!\s*\[\])') {
            $lineNumber = 1
            foreach ($line in $lines) {
                if ($line -match '\bany\b(?!\s*\[\])') {
                    Write-Violation -Level "CRITICAL" -File $file.Name -Line $lineNumber -Message "禁止使用 any 类型" -Rule "TS-001"
                }
                $lineNumber++
            }
        }
        
        # 检查函数返回类型
        $functionMatches = [regex]::Matches($content, 'function\s+\w+\s*\([^)]*\)\s*{')
        foreach ($match in $functionMatches) {
            if ($match.Value -notmatch ':\s*\w+') {
                $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
                Write-Violation -Level "HIGH" -File $file.Name -Line $lineNumber -Message "函数缺少返回类型注解" -Rule "TS-002"
            }
        }
        
        # 检查钩子类继承
        if ($file.Name -match '\.kiro\.hook$' -or $file.Name -match 'Hook\.ts$') {
            if ($content -match 'class\s+\w+.*implements\s+Hook' -and $content -notmatch 'extends\s+BaseHook') {
                Write-Violation -Level "CRITICAL" -File $file.Name -Line 1 -Message "钩子类必须继承 BaseHook" -Rule "ARCH-001"
            }
        }
        
        # 检查相对导入路径
        $importMatches = [regex]::Matches($content, "import.*from\s+['\`"](\.\./\.\./\.\./[^'\`"]*)['\`"]")
        foreach ($match in $importMatches) {
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
            Write-Violation -Level "MEDIUM" -File $file.Name -Line $lineNumber -Message "相对导入路径超过2级" -Rule "TS-003"
        }
        
        # 检查硬编码敏感信息
        $sensitivePatterns = @(
            'sk-[a-zA-Z0-9]{32,}',
            'password\s*[:=]\s*["''][^"'']+["'']',
            'token\s*[:=]\s*["''][^"'']+["'']',
            'api[_-]?key\s*[:=]\s*["''][^"'']+["'']'
        )
        
        foreach ($pattern in $sensitivePatterns) {
            if ($content -match $pattern) {
                $lineNumber = 1
                foreach ($line in $lines) {
                    if ($line -match $pattern) {
                        Write-Violation -Level "CRITICAL" -File $file.Name -Line $lineNumber -Message "发现硬编码敏感信息" -Rule "SEC-001"
                    }
                    $lineNumber++
                }
            }
        }
        
        # 检查异常处理
        $tryMatches = [regex]::Matches($content, 'try\s*{[^}]*}\s*catch\s*(?:\([^)]*\))?\s*{\s*}')
        foreach ($match in $tryMatches) {
            $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
            Write-Violation -Level "HIGH" -File $file.Name -Line $lineNumber -Message "空的异常处理块" -Rule "TS-004"
        }
    }
}

function Test-PythonConstraints {
    <#
    .SYNOPSIS
    检查Python代码约束
    #>
    param([string]$ProjectPath, [string]$TargetPath)
    
    Write-Output "🐍 检查 Python 代码约束..."
    
    $pyFiles = Get-ChildItem -Path (Join-Path $ProjectPath $TargetPath) -Filter "*.py" -Recurse -ErrorAction SilentlyContinue
    
    if ($pyFiles.Count -eq 0) {
        Write-Output "📝 未找到Python文件，跳过Python约束检查"
        return
    }
    
    foreach ($file in $pyFiles) {
        $content = Get-Content $file.FullName -Raw
        $lines = Get-Content $file.FullName
        
        # 检查函数类型注解
        $functionMatches = [regex]::Matches($content, 'def\s+\w+\s*\([^)]*\)\s*:')
        foreach ($match in $functionMatches) {
            if ($match.Value -notmatch '->' -and $match.Value -notmatch '__init__') {
                $lineNumber = ($content.Substring(0, $match.Index) -split "`n").Count
                Write-Violation -Level "CRITICAL" -File $file.Name -Line $lineNumber -Message "函数缺少返回类型注解" -Rule "PY-001"
            }
        }
        
        # 检查裸露的异常处理
        if ($content -match 'except\s*:') {
            $lineNumber = 1
            foreach ($line in $lines) {
                if ($line -match 'except\s*:') {
                    Write-Violation -Level "CRITICAL" -File $file.Name -Line $lineNumber -Message "禁止使用裸露的except" -Rule "PY-002"
                }
                $lineNumber++
            }
        }
    }
}

function Test-ArchitectureConstraints {
    <#
    .SYNOPSIS
    检查架构约束
    #>
    param([string]$ProjectPath, [string]$TargetPath)
    
    Write-Output "🏗️ 检查架构约束..."
    
    $hooksPath = Join-Path $ProjectPath $TargetPath
    
    # 检查必需的目录结构
    $requiredDirs = @("core", "types", "config")
    foreach ($dir in $requiredDirs) {
        $dirPath = Join-Path $hooksPath $dir
        if (-not (Test-Path $dirPath)) {
            Write-Violation -Level "HIGH" -File $TargetPath -Line 1 -Message "缺少必需目录: $dir" -Rule "ARCH-002"
        }
    }
    
    # 检查禁止的目录
    $forbiddenDirs = @("utils", "helpers", "misc")
    foreach ($dir in $forbiddenDirs) {
        $dirPath = Join-Path $hooksPath $dir
        if (Test-Path $dirPath) {
            Write-Violation -Level "MEDIUM" -File $TargetPath -Line 1 -Message "禁止使用目录: $dir" -Rule "ARCH-003"
        }
    }
    
    # 检查文件命名规范
    $files = Get-ChildItem -Path $hooksPath -File -Recurse
    foreach ($file in $files) {
        $fileName = $file.Name
        
        # 检查TypeScript文件命名
        if ($fileName -match '\.ts$') {
            if ($fileName -match '^[A-Z]' -and $fileName -notmatch '\.d\.ts$') {
                Write-Violation -Level "MEDIUM" -File $fileName -Line 1 -Message "TypeScript文件应使用kebab-case命名" -Rule "ARCH-004"
            }
        }
        
        # 检查钩子文件命名
        if ($fileName -match 'Hook\.ts$' -and $fileName -notmatch '\.kiro\.hook$') {
            Write-Violation -Level "HIGH" -File $fileName -Line 1 -Message "钩子文件应使用.kiro.hook扩展名" -Rule "ARCH-005"
        }
    }
}

function Test-MCPToolsConstraints {
    <#
    .SYNOPSIS
    检查MCP工具集成约束
    #>
    param([string]$ProjectPath, [string]$TargetPath)
    
    Write-Output "🔧 检查 MCP 工具集成约束..."
    
    $tsFiles = Get-ChildItem -Path (Join-Path $ProjectPath $TargetPath) -Filter "*.ts" -Recurse
    
    foreach ($file in $tsFiles) {
        $content = Get-Content $file.FullName -Raw
        $lines = Get-Content $file.FullName
        
        # 检查直接API调用
        $directApiPatterns = @(
            'fetch\s*\(\s*["'']https?://',
            'axios\.\w+\s*\(\s*["'']https?://',
            'http\.\w+\s*\(\s*["'']https?://'
        )
        
        foreach ($pattern in $directApiPatterns) {
            if ($content -match $pattern) {
                $lineNumber = 1
                foreach ($line in $lines) {
                    if ($line -match $pattern) {
                        Write-Violation -Level "HIGH" -File $file.Name -Line $lineNumber -Message "应通过MCP工具管理器调用外部API" -Rule "MCP-001"
                    }
                    $lineNumber++
                }
            }
        }
        
        # 检查MCP工具错误处理
        if ($content -match 'mcpToolsManager\.callTool' -and $content -notmatch 'try.*catch') {
            Write-Violation -Level "MEDIUM" -File $file.Name -Line 1 -Message "MCP工具调用应包含错误处理" -Rule "MCP-002"
        }
    }
}

function Test-SecurityConstraints {
    <#
    .SYNOPSIS
    检查安全约束
    #>
    param([string]$ProjectPath, [string]$TargetPath)
    
    Write-Output "🔒 检查安全约束..."
    
    $allFiles = Get-ChildItem -Path (Join-Path $ProjectPath $TargetPath) -File -Recurse
    
    foreach ($file in $allFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        $lines = Get-Content $file.FullName
        
        # 检查危险函数使用
        $dangerousFunctions = @(
            'eval\s*\(',
            'Function\s*\(',
            'setTimeout\s*\(\s*["''][^"'']*["'']',
            'setInterval\s*\(\s*["''][^"'']*["'']'
        )
        
        foreach ($pattern in $dangerousFunctions) {
            if ($content -match $pattern) {
                $lineNumber = 1
                foreach ($line in $lines) {
                    if ($line -match $pattern) {
                        Write-Violation -Level "CRITICAL" -File $file.Name -Line $lineNumber -Message "禁止使用危险函数" -Rule "SEC-002"
                    }
                    $lineNumber++
                }
            }
        }
        
        # 检查输入验证
        if ($file.Extension -eq '.ts' -and $content -match 'context\.files' -and $content -notmatch 'validate.*Context') {
            Write-Violation -Level "HIGH" -File $file.Name -Line 1 -Message "外部输入应进行验证" -Rule "SEC-003"
        }
    }
}

function Test-PerformanceConstraints {
    <#
    .SYNOPSIS
    检查性能约束
    #>
    param([string]$ProjectPath, [string]$TargetPath)
    
    Write-Output "🚀 检查性能约束..."
    
    $tsFiles = Get-ChildItem -Path (Join-Path $ProjectPath $TargetPath) -Filter "*.ts" -Recurse
    
    foreach ($file in $tsFiles) {
        $content = Get-Content $file.FullName -Raw
        $lines = Get-Content $file.FullName
        
        # 检查同步IO操作
        $syncIOPatterns = @(
            'fs\.readFileSync',
            'fs\.writeFileSync',
            'fs\.existsSync'
        )
        
        foreach ($pattern in $syncIOPatterns) {
            if ($content -match $pattern) {
                $lineNumber = 1
                foreach ($line in $lines) {
                    if ($line -match $pattern) {
                        Write-Violation -Level "MEDIUM" -File $file.Name -Line $lineNumber -Message "应使用异步IO操作" -Rule "PERF-001"
                    }
                    $lineNumber++
                }
            }
        }
        
        # 检查Promise错误处理
        if ($content -match '\.\w+\(\)(?!\s*\.(?:then|catch|finally))' -and $content -match 'async') {
            Write-Violation -Level "HIGH" -File $file.Name -Line 1 -Message "异步操作应包含错误处理" -Rule "PERF-002"
        }
    }
}

function Test-WindowsConstraints {
    <#
    .SYNOPSIS
    检查Windows环境约束
    #>
    param([string]$ProjectPath, [string]$TargetPath)
    
    Write-Output "🪟 检查 Windows 环境约束..."
    
    $allFiles = Get-ChildItem -Path (Join-Path $ProjectPath $TargetPath) -File -Recurse
    
    foreach ($file in $allFiles) {
        $content = Get-Content $file.FullName -Raw -ErrorAction SilentlyContinue
        if (-not $content) { continue }
        
        $lines = Get-Content $file.FullName
        
        # 检查硬编码Unix路径
        $unixPathPatterns = @(
            '/home/',
            '/usr/',
            '/var/',
            '/tmp/',
            '/etc/'
        )
        
        foreach ($pattern in $unixPathPatterns) {
            if ($content -match $pattern) {
                $lineNumber = 1
                foreach ($line in $lines) {
                    if ($line -match $pattern) {
                        Write-Violation -Level "HIGH" -File $file.Name -Line $lineNumber -Message "硬编码Unix路径，不兼容Windows" -Rule "WIN-001"
                    }
                    $lineNumber++
                }
            }
        }
        
        # 检查路径分隔符
        if ($content -match '["''][^"'']*\\\\[^"'']*["'']' -and $content -notmatch 'path\.') {
            Write-Violation -Level "MEDIUM" -File $file.Name -Line 1 -Message "应使用path模块处理路径" -Rule "WIN-002"
        }
    }
}

function Invoke-AutoFix {
    <#
    .SYNOPSIS
    自动修复部分约束违规
    #>
    param([string]$ProjectPath, [string]$TargetPath)
    
    if (-not $Fix) {
        return
    }
    
    Write-Output "🔧 尝试自动修复部分违规..."
    
    $tsFiles = Get-ChildItem -Path (Join-Path $ProjectPath $TargetPath) -Filter "*.ts" -Recurse
    $fixCount = 0
    
    foreach ($file in $tsFiles) {
        $content = Get-Content $file.FullName -Raw
        $originalContent = $content
        
        # 修复简单的类型注解问题
        $content = $content -replace 'function\s+(\w+)\s*\([^)]*\)\s*{', 'function $1(): void {'
        
        # 修复导入路径
        $content = $content -replace "from\s+['\`"](\.\./\.\./\.\./[^'\`"]*)['\`"]", "from '$1'"
        
        if ($content -ne $originalContent) {
            Set-Content -Path $file.FullName -Value $content -Encoding UTF8
            $fixCount++
            Write-Output "✅ 已修复文件: $($file.Name)"
        }
    }
    
    if ($fixCount -gt 0) {
        Write-Output "🎉 自动修复了 $fixCount 个文件"
    } else {
        Write-Output "📝 没有可自动修复的问题"
    }
}

function Show-ViolationSummary {
    <#
    .SYNOPSIS
    显示违规摘要
    #>
    
    Write-Output ""
    Write-Output "📊 约束检查摘要"
    Write-Output "=" * 30
    
    Write-Output "总违规数量: $script:ViolationCount"
    Write-Output "严重违规 (CRITICAL): $($script:CriticalViolations.Count)"
    Write-Output "高危违规 (HIGH): $($script:HighViolations.Count)"
    Write-Output "中等违规 (MEDIUM): $($script:MediumViolations.Count)"
    Write-Output "轻微违规 (LOW): $($script:LowViolations.Count)"
    
    if ($script:CriticalViolations.Count -gt 0) {
        Write-Output ""
        Write-Output "🚨 严重违规详情:"
        foreach ($violation in $script:CriticalViolations) {
            Write-Output "  - $($violation.File):$($violation.Line) - $($violation.Message) [$($violation.Rule)]"
        }
    }
    
    if ($script:HighViolations.Count -gt 0) {
        Write-Output ""
        Write-Output "⚠️ 高危违规详情:"
        foreach ($violation in $script:HighViolations) {
            Write-Output "  - $($violation.File):$($violation.Line) - $($violation.Message) [$($violation.Rule)]"
        }
    }
    
    # 生成违规报告文件
    $reportPath = Join-Path $ProjectPath "constraint-violations-report.json"
    $report = @{
        timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
        totalViolations = $script:ViolationCount
        critical = $script:CriticalViolations
        high = $script:HighViolations
        medium = $script:MediumViolations
        low = $script:LowViolations
    }
    
    $report | ConvertTo-Json -Depth 10 | Set-Content -Path $reportPath -Encoding UTF8
    Write-Output ""
    Write-Output "📄 详细报告已保存到: $reportPath"
}

# 主执行逻辑
try {
    Write-Output "🔍 开始检查项目: $ProjectPath"
    Write-Output "🎯 目标路径: $TargetPath"
    
    # 验证项目路径
    if (-not (Test-Path $ProjectPath)) {
        throw "项目路径不存在: $ProjectPath"
    }
    
    $targetFullPath = Join-Path $ProjectPath $TargetPath
    if (-not (Test-Path $targetFullPath)) {
        throw "目标路径不存在: $targetFullPath"
    }
    
    # 执行各项约束检查
    Test-TypeScriptConstraints -ProjectPath $ProjectPath -TargetPath $TargetPath
    Test-PythonConstraints -ProjectPath $ProjectPath -TargetPath $TargetPath
    Test-ArchitectureConstraints -ProjectPath $ProjectPath -TargetPath $TargetPath
    Test-MCPToolsConstraints -ProjectPath $ProjectPath -TargetPath $TargetPath
    Test-SecurityConstraints -ProjectPath $ProjectPath -TargetPath $TargetPath
    Test-PerformanceConstraints -ProjectPath $ProjectPath -TargetPath $TargetPath
    Test-WindowsConstraints -ProjectPath $ProjectPath -TargetPath $TargetPath
    
    # 尝试自动修复
    Invoke-AutoFix -ProjectPath $ProjectPath -TargetPath $TargetPath
    
    # 显示摘要
    Show-ViolationSummary
    
    # 确定退出代码
    if ($script:CriticalViolations.Count -gt 0) {
        Write-Output ""
        Write-Output "❌ 发现严重违规，必须修复后才能继续"
        exit 1
    } elseif ($script:HighViolations.Count -gt 0) {
        Write-Output ""
        Write-Output "⚠️ 发现高危违规，建议修复后再继续"
        exit 2
    } else {
        Write-Output ""
        Write-Output "✅ 所有关键约束检查通过！"
        exit 0
    }
    
} catch {
    Write-Error ""
    Write-Error "💥 约束检查失败: $_"
    Write-Error ""
    Write-Error "🔧 故障排除建议:"
    Write-Error "1. 确保项目路径正确且可访问"
    Write-Error "2. 检查目标路径是否存在"
    Write-Error "3. 确保有足够的文件系统权限"
    Write-Error "4. 使用 -VerboseOutput 参数查看详细信息"
    
    exit 1
}。和