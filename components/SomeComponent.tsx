"use client"

import React, { useEffect,useState } from 'react'

export function SomeComponent() {
  // 错误方式 - 会在服务器和客户端产生不同结果
  // const random = Math.random()
  
  // 正确方式 - 只在客户端计算
  const [random, setRandom] = useState(0)
  useEffect(() => {
    setRandom(Math.random())
  }, [])
  
  return <div>{random}</div>
} 