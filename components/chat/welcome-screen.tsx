"use client"

import { AnimatePresence,motion } from "framer-motion"
import { ArrowRight, MessageSquare, Moon, Sparkles, Sun, Zap } from "lucide-react"
import Image from "next/image"
import { useEffect, useRef,useState } from "react"

import { Button } from "@/components/ui/button"

type WelcomeScreenProps = {
  onGetStarted?: () => void
  onClose?: () => void
  isDarkMode?: boolean
  toggleTheme?: () => void
}

export function WelcomeScreen({ onGetStarted, onClose, isDarkMode = false, toggleTheme = () => {} }: WelcomeScreenProps) {
  const [animationStep, setAnimationStep] = useState(0)
  const [hoverButton, setHoverButton] = useState(false)

  useEffect(() => {
    // Animation sequence
    const timer1 = setTimeout(() => {
      setAnimationStep(1)
    }, 300)

    const timer2 = setTimeout(() => {
      setAnimationStep(2)
    }, 800)

    const timer3 = setTimeout(() => {
      setAnimationStep(3)
    }, 1300)

    return () => {
      clearTimeout(timer1)
      clearTimeout(timer2)
      clearTimeout(timer3)
    }
  }, [])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background with animated gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-purple-900 z-0">
        <div className="absolute inset-0 opacity-20">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute rounded-full bg-gradient-to-br from-[#6cb33f]/30 to-blue-400/30 dark:from-[#6cb33f]/20 dark:to-purple-500/20 animate-float"
              style={{
                width: `${Math.random() * 200 + 50}px`,
                height: `${Math.random() * 200 + 50}px`,
                top: `${Math.random() * 100}%`,
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 5}s`,
                animationDuration: `${Math.random() * 10 + 15}s`,
              }}
            />
          ))}
        </div>
      </div>

      {/* Theme toggle button */}
      <motion.div
        className="absolute top-4 right-4 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5, duration: 0.5 }}
      >
        <Button
          variant="outline"
          size="icon"
          className="rounded-full bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 shadow-md hover:shadow-lg transition-all"
          onClick={toggleTheme}
          aria-label={isDarkMode ? "切换到浅色模式" : "切换到深色模式"}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={isDarkMode ? "dark" : "light"}
              initial={{ scale: 0.5, opacity: 0, rotate: -180 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              exit={{ scale: 0.5, opacity: 0, rotate: 180 }}
              transition={{ duration: 0.3 }}
            >
              {isDarkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </motion.div>
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Main content */}
      <div className="max-w-md w-full mx-auto p-6 text-center relative z-10">
        {/* Character animation */}
        <AnimatePresence>
          {animationStep >= 0 && (
            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{
                type: "spring",
                stiffness: 260,
                damping: 20,
                delay: 0.1,
              }}
              className="relative h-48 w-48 mx-auto mb-6"
            >
              <motion.div
                animate={{
                  y: [0, -10, 0],
                }}
                transition={{
                  repeat: Number.POSITIVE_INFINITY,
                  duration: 3,
                  ease: "easeInOut",
                }}
                className="relative h-full w-full"
              >
                <Image
                  src="/images/mascot-character.png"
                  alt="AI Assistant Character"
                  fill
                  className="object-contain"
                  priority
                />
              </motion.div>

              {/* Sparkle effects */}
              {animationStep >= 2 && (
                <>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: [0, 1, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 0.5,
                    }}
                    className="absolute -top-4 -right-4 text-yellow-400"
                  >
                    <Sparkles className="h-6 w-6" />
                  </motion.div>
                  <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: [0, 1, 0] }}
                    transition={{
                      duration: 1.5,
                      repeat: Number.POSITIVE_INFINITY,
                      delay: 1.2,
                    }}
                    className="absolute -bottom-2 -left-4 text-blue-400"
                  >
                    <Sparkles className="h-6 w-6" />
                  </motion.div>
                </>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Title and description */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: animationStep >= 1 ? 1 : 0, y: animationStep >= 1 ? 0 : 20 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-4">
            欢迎使用{" "}
            <span className="text-[#6cb33f] relative">
              AI 对话助手
              <motion.span
                className="absolute -bottom-1 left-0 w-full h-1 bg-[#6cb33f]/30 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: "100%" }}
                transition={{ delay: 1, duration: 0.8 }}
              />
            </span>
          </h1>

          <motion.p
            className="text-gray-600 dark:text-gray-300 mb-8"
            initial={{ opacity: 0 }}
            animate={{ opacity: animationStep >= 2 ? 1 : 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            与由先进AI技术驱动的智能助手交流，获取即时回答、创意灵感和专业建议。
          </motion.p>
        </motion.div>

        {/* Feature cards and button */}
        <motion.div
          className="space-y-4"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: animationStep >= 3 ? 1 : 0, y: animationStep >= 3 ? 0 : 30 }}
          transition={{ duration: 0.6, delay: 0.9 }}
        >
          <div className="bg-white/90 dark:bg-gray-800/90 backdrop-blur-md p-5 rounded-2xl shadow-lg border border-gray-100/80 dark:border-gray-700/80 text-left transform transition-all">
            <h3 className="font-medium text-gray-900 dark:text-gray-100 mb-3 flex items-center">
              <Zap className="h-5 w-5 mr-2 text-[#6cb33f]" />
              主要功能
            </h3>
            <ul className="space-y-3 text-sm text-gray-600 dark:text-gray-300">
              <motion.li
                className="flex items-start"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.1, duration: 0.4 }}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6cb33f]/10 text-[#6cb33f] flex-shrink-0 mr-3">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <span>多种专业AI助手，满足不同场景需求</span>
              </motion.li>
              <motion.li
                className="flex items-start"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.3, duration: 0.4 }}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6cb33f]/10 text-[#6cb33f] flex-shrink-0 mr-3">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <span>支持文字、语音、图片多模态交互</span>
              </motion.li>
              <motion.li
                className="flex items-start"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5, duration: 0.4 }}
              >
                <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#6cb33f]/10 text-[#6cb33f] flex-shrink-0 mr-3">
                  <MessageSquare className="h-3.5 w-3.5" />
                </span>
                <span>对话历史保存与管理，随时查阅</span>
              </motion.li>
            </ul>
          </div>

          <motion.div
            className="mt-6"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 1.7, duration: 0.5 }}
            whileHover={{ scale: 1.03 }}
            onHoverStart={() => setHoverButton(true)}
            onHoverEnd={() => setHoverButton(false)}
          >
            <Button
              onClick={() => {
                onGetStarted?.()
                onClose?.()
              }}
              size="lg"
              className="bg-[#6cb33f] hover:bg-[#5da32f] text-white w-full rounded-xl py-6 px-6 font-medium text-base shadow-lg hover:shadow-xl transition-all"
            >
              <span className="flex-1">开始使用</span>
              <motion.div
                animate={{
                  x: hoverButton ? 5 : 0,
                }}
                transition={{ duration: 0.3 }}
              >
                <ArrowRight className="h-5 w-5 ml-2" />
              </motion.div>
            </Button>
          </motion.div>
        </motion.div>
      </div>

      {/* Footer */}
      <motion.div
        className="absolute bottom-4 text-center text-sm text-gray-500 dark:text-gray-400"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2, duration: 0.5 }}
      >
        © 2025 ZKTeco AI 助手. 保留所有权利.
      </motion.div>
    </div>
  )
}
