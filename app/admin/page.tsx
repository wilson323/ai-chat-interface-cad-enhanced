"use client"

import { useRouter, useSearchParams } from "next/navigation"
import type React from "react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"

export default function AdminLogin() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError("")

    try {
      // 简单演示目的（后续应接入真实鉴权服务）
      if (username === "admin" && password === "fastgpt") {
        const token = "demo-token-12345"
        // 兼容中间件：设置 cookie，path=/，SameSite=Lax
        document.cookie = `adminToken=${token}; Path=/; SameSite=Lax`
        // 同步本地存储，兼容已有逻辑
        localStorage.setItem("adminToken", token)

        toast({
          title: "登录成功",
          description: "欢迎进入管理员仪表板",
        })

        const redirect = searchParams.get("redirect") || "/admin/dashboard"
        router.push(redirect)
      } else {
        setError("用户名或密码无效")
      }
    } catch (err) {
      setError("登录失败，请重试")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-white p-4">
      <Card className="w-full max-w-md backdrop-blur-md bg-white/70 border-green-200 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-green-700">管理员登录</CardTitle>
          <CardDescription>输入您的凭据以访问管理员仪表板</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="username" className="text-sm font-medium">
                用户名
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                placeholder="admin"
                className="border-green-200 focus:border-[#6cb33f] focus:ring-[#6cb33f]"
                required
              />
            </div>
            <div className="space-y-2">
              <label htmlFor="password" className="text-sm font-medium">
                密码
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="border-green-200 focus:border-[#6cb33f] focus:ring-[#6cb33f]"
                required
              />
            </div>
            {error && <p className="text-red-500 text-sm">{error}</p>}
          </form>
        </CardContent>
        <CardFooter>
          <Button onClick={handleLogin} disabled={isLoading} className="w-full bg-[#6cb33f] hover:bg-green-600">
            {isLoading ? "登录中..." : "登录"}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
