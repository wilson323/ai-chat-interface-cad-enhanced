"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"

import { useToast } from "@/hooks/use-toast"

export default function AutoLogin() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [status, setStatus] = useState<"checking" | "success" | "error">("checking")
  const [message, setMessage] = useState("正在处理登录请求...")

  useEffect(() => {
    const userId = searchParams.get("userId")
    const password = searchParams.get("password")

    if (!userId || !password) {
      setStatus("error")
      setMessage("登录参数不完整，请检查URL")
      return
    }

    // 模拟API调用来检查用户是否存在
    const checkUserAndLogin = async () => {
      try {
        // 在实际应用中，这里应该是一个API调用
        // 这里我们使用localStorage模拟用户存储
        const existingUsers = JSON.parse(localStorage.getItem("users") || "[]")
        const userExists = existingUsers.some((user: any) => user.id === userId)

        if (userExists) {
          // 用户存在，直接登录
          console.log("用户已存在，直接登录")
        } else {
          // 用户不存在，创建新用户
          const newUser = {
            id: userId,
            password: password, // 注意：实际应用中应该加密存储
            createdAt: new Date().toISOString(),
          }

          existingUsers.push(newUser)
          localStorage.setItem("users", JSON.stringify(existingUsers))
          console.log("已创建新用户")
        }

        // 设置登录状态
        localStorage.setItem(
          "currentUser",
          JSON.stringify({
            id: userId,
            loggedInAt: new Date().toISOString(),
          }),
        )

        setStatus("success")
        setMessage("登录成功，即将跳转...")

        // 显示成功消息
        toast({
          title: "登录成功",
          description: `欢迎回来，用户 ${userId}`,
        })

        // 延迟一下再跳转，让用户看到成功消息
        setTimeout(() => {
          router.push("/")
        }, 1500)
      } catch (error) {
        console.error("登录过程中出错:", error)
        setStatus("error")
        setMessage("登录过程中出错，请稍后再试")

        toast({
          title: "登录失败",
          description: "处理您的请求时出现错误",
          variant: "destructive",
        })
      }
    }

    checkUserAndLogin()
  }, [searchParams, router, toast])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-white dark:from-gray-900 dark:to-gray-800">
      <div className="w-full max-w-md p-8 space-y-8 bg-white/80 dark:bg-gray-800/80 backdrop-blur-md rounded-xl shadow-lg border border-gray-200/80 dark:border-gray-700/80">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            {status === "checking" && (
              <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#6cb33f] border-t-transparent"></div>
            )}
            {status === "success" && (
              <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
            )}
            {status === "error" && (
              <div className="h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center text-red-600 dark:text-red-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-8 w-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
            )}
          </div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            {status === "checking" ? "自动登录" : status === "success" ? "登录成功" : "登录失败"}
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">{message}</p>
        </div>

        {status === "error" && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-[#6cb33f] hover:bg-green-600 text-white rounded-lg transition-colors"
            >
              返回首页
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
