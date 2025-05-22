"use client"
import { motion } from "framer-motion"
import Image from "next/image"

export default function ThreeDContent() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <motion.div
        className="relative w-32 h-32"
        animate={{
          y: [0, -10, 0],
        }}
        transition={{
          repeat: Number.POSITIVE_INFINITY,
          duration: 3,
          ease: "easeInOut",
        }}
      >
        <Image
          src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/450afcf7-4de2-4b4e-b998-33f3231593ac-BsfX8oIoAiapdt9dnpeePhqHN8pNb4.png"
          alt="AI Assistant Character"
          width={128}
          height={128}
          className="object-contain"
          priority
        />
      </motion.div>
    </div>
  )
}
