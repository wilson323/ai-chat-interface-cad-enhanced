"use client"

import { ArrowLeft, MoreVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { useMobile } from "@/hooks/use-mobile"
import { useRouter } from "next/navigation"

interface MobileHeaderProps {
  title: string
  subtitle?: string
  avatarSrc?: string
  onBackClick?: () => void
  showBackButton?: boolean
}

export function MobileHeader({ title, subtitle, avatarSrc, onBackClick, showBackButton = true }: MobileHeaderProps) {
  const isMobile = useMobile()
  const router = useRouter()

  const handleBackClick = () => {
    if (onBackClick) {
      onBackClick()
    } else {
      router.back()
    }
  }

  if (!isMobile) return null

  return (
    <div className="fixed top-0 left-0 right-0 z-50 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md border-b border-gray-200/80 dark:border-gray-800/80 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            className="mr-2 h-9 w-9 rounded-full text-gray-600 dark:text-gray-300"
            onClick={handleBackClick}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}

        {avatarSrc && (
          <Avatar className="h-8 w-8 mr-3">
            <AvatarImage src={avatarSrc || "/placeholder.svg"} alt={title} />
            <AvatarFallback>{title.charAt(0)}</AvatarFallback>
          </Avatar>
        )}

        <div className="overflow-hidden">
          <h1 className="text-base font-medium text-gray-800 dark:text-gray-200 truncate">{title}</h1>
          {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
        </div>
      </div>

      <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-gray-600 dark:text-gray-300">
        <MoreVertical className="h-5 w-5" />
      </Button>
    </div>
  )
}
