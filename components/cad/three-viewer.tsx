"use client"

import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { is3DFileType } from '@/lib/utils/cad-file-utils'
import { Loader2, AlertTriangle, Move, ZoomIn, RotateCw } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface ThreeViewerProps {
  modelUrl: string
  fileType: string
  className?: string
  backgroundColor?: string
  showGrid?: boolean
  showAxes?: boolean
  autoRotate?: boolean
  width?: number
  height?: number
}

export default function ThreeViewer({
  modelUrl,
  fileType,
  className,
  backgroundColor = '#f5f5f5',
  showGrid = true,
  showAxes = true,
  autoRotate = false,
  width,
  height
}: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const modelRef = useRef<THREE.Object3D | null>(null)
  
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  
  // 验证文件类型是否为3D
  const normalizedFileType = fileType.toLowerCase().replace(/^\./, '')
  const is3D = is3DFileType(normalizedFileType)
  
  useEffect(() => {
    if (!is3D) {
      setError('不支持的文件类型：仅支持3D模型文件')
      setIsLoading(false)
      return
    }
    
    if (!modelUrl) {
      setError('未提供模型URL')
      setIsLoading(false)
      return
    }
    
    let animationFrameId: number
    let mixer: THREE.AnimationMixer | null = null
    const clock = new THREE.Clock()
    
    // 初始化场景
    const initScene = () => {
      if (!containerRef.current) return
      
      // 设置容器尺寸
      const containerWidth = width || containerRef.current.clientWidth
      const containerHeight = height || containerRef.current.clientHeight
      
      // 创建场景
      const scene = new THREE.Scene()
      scene.background = new THREE.Color(backgroundColor)
      sceneRef.current = scene
      
      // 创建相机
      const camera = new THREE.PerspectiveCamera(
        45,
        containerWidth / containerHeight,
        0.1,
        1000
      )
      camera.position.z = 5
      camera.position.y = 2
      camera.position.x = 2
      cameraRef.current = camera
      
      // 创建渲染器
      const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
      renderer.setSize(containerWidth, containerHeight)
      renderer.setPixelRatio(window.devicePixelRatio)
      renderer.shadowMap.enabled = true
      rendererRef.current = renderer
      
      // 添加渲染器到DOM
      if (containerRef.current.firstChild) {
        containerRef.current.removeChild(containerRef.current.firstChild)
      }
      containerRef.current.appendChild(renderer.domElement)
      
      // 添加轨道控制
      const controls = new OrbitControls(camera, renderer.domElement)
      controls.enableDamping = true
      controls.dampingFactor = 0.05
      controls.autoRotate = autoRotate
      controls.autoRotateSpeed = 1.0
      controlsRef.current = controls
      
      // 添加光源
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.5)
      scene.add(ambientLight)
      
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1)
      directionalLight.position.set(1, 2, 3)
      directionalLight.castShadow = true
      scene.add(directionalLight)
      
      // 添加辅助对象
      if (showGrid) {
        const gridHelper = new THREE.GridHelper(10, 10)
        scene.add(gridHelper)
      }
      
      if (showAxes) {
        const axesHelper = new THREE.AxesHelper(5)
        scene.add(axesHelper)
      }
      
      // 加载模型
      loadModel(scene)
      
      // 动画循环
      const animate = () => {
        animationFrameId = requestAnimationFrame(animate)
        
        if (mixer) {
          const delta = clock.getDelta()
          mixer.update(delta)
        }
        
        if (controlsRef.current) {
          controlsRef.current.update()
        }
        
        if (rendererRef.current && cameraRef.current && sceneRef.current) {
          rendererRef.current.render(sceneRef.current, cameraRef.current)
        }
      }
      
      animate()
      
      // 窗口大小变化事件
      const handleResize = () => {
        if (!containerRef.current || !rendererRef.current || !cameraRef.current) return
        
        const containerWidth = width || containerRef.current.clientWidth
        const containerHeight = height || containerRef.current.clientHeight
        
        cameraRef.current.aspect = containerWidth / containerHeight
        cameraRef.current.updateProjectionMatrix()
        
        rendererRef.current.setSize(containerWidth, containerHeight)
      }
      
      window.addEventListener('resize', handleResize)
      
      return () => {
        window.removeEventListener('resize', handleResize)
      }
    }
    
    // 加载模型
    const loadModel = (scene: THREE.Scene) => {
      setIsLoading(true)
      setError(null)
      
      let loader: GLTFLoader | STLLoader | OBJLoader
      
      // 根据文件类型选择加载器
      switch (normalizedFileType) {
        case 'gltf':
        case 'glb':
          loader = new GLTFLoader()
          
          loader.load(
            modelUrl,
            (gltf) => {
              // 处理gltf模型
              const model = gltf.scene
              
              // 适配模型大小
              const box = new THREE.Box3().setFromObject(model)
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              const scale = 5 / maxDim
              model.scale.set(scale, scale, scale)
              
              // 将模型放在中心
              const center = box.getCenter(new THREE.Vector3())
              center.multiplyScalar(scale)
              model.position.sub(center)
              
              // 处理动画
              if (gltf.animations && gltf.animations.length > 0) {
                mixer = new THREE.AnimationMixer(model)
                const animation = gltf.animations[0]
                mixer.clipAction(animation).play()
              }
              
              scene.add(model)
              modelRef.current = model
              
              setIsLoading(false)
            },
            (xhr) => {
              // 加载进度
              console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
            },
            (error) => {
              console.error('GLTF加载错误:', error)
              setError('无法加载GLTF/GLB模型: ' + error.message)
              setIsLoading(false)
            }
          )
          break
          
        case 'stl':
          loader = new STLLoader()
          
          loader.load(
            modelUrl,
            (geometry) => {
              // 处理STL模型
              const material = new THREE.MeshStandardMaterial({
                color: 0x7c9cb0,
                metalness: 0.2,
                roughness: 0.5
              })
              
              const mesh = new THREE.Mesh(geometry, material)
              
              // 适配模型大小
              geometry.computeBoundingBox()
              const box = geometry.boundingBox!
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              const scale = 5 / maxDim
              mesh.scale.set(scale, scale, scale)
              
              // 将模型放在中心
              const center = box.getCenter(new THREE.Vector3())
              center.multiplyScalar(scale)
              mesh.position.sub(center)
              
              scene.add(mesh)
              modelRef.current = mesh
              
              setIsLoading(false)
            },
            (xhr) => {
              // 加载进度
              console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
            },
            (error) => {
              console.error('STL加载错误:', error)
              setError('无法加载STL模型: ' + error.message)
              setIsLoading(false)
            }
          )
          break
          
        case 'obj':
          loader = new OBJLoader()
          
          loader.load(
            modelUrl,
            (object) => {
              // 处理OBJ模型
              // 为模型添加默认材质
              object.traverse((child) => {
                if (child instanceof THREE.Mesh) {
                  child.material = new THREE.MeshStandardMaterial({
                    color: 0x7c9cb0,
                    metalness: 0.2,
                    roughness: 0.5
                  })
                }
              })
              
              // 适配模型大小
              const box = new THREE.Box3().setFromObject(object)
              const size = box.getSize(new THREE.Vector3())
              const maxDim = Math.max(size.x, size.y, size.z)
              const scale = 5 / maxDim
              object.scale.set(scale, scale, scale)
              
              // 将模型放在中心
              const center = box.getCenter(new THREE.Vector3())
              center.multiplyScalar(scale)
              object.position.sub(center)
              
              scene.add(object)
              modelRef.current = object
              
              setIsLoading(false)
            },
            (xhr) => {
              // 加载进度
              console.log((xhr.loaded / xhr.total) * 100 + '% loaded')
            },
            (error) => {
              console.error('OBJ加载错误:', error)
              setError('无法加载OBJ模型: ' + error.message)
              setIsLoading(false)
            }
          )
          break
          
        case 'step':
        case 'stp':
        case 'iges':
        case 'igs':
          // 这些格式需要特殊处理，实际应用可能需要服务端转换
          setError(`${normalizedFileType.toUpperCase()} 格式需要先转换，请使用转换功能`)
          setIsLoading(false)
          break
          
        default:
          setError(`不支持的文件类型: ${normalizedFileType}`)
          setIsLoading(false)
          break
      }
    }
    
    // 初始化
    initScene()
    
    // 清理
    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId)
      }
      
      if (rendererRef.current) {
        rendererRef.current.dispose()
      }
      
      if (modelRef.current) {
        sceneRef.current?.remove(modelRef.current)
        
        // 释放几何体和材质
        modelRef.current.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            if (object.geometry) {
              object.geometry.dispose()
            }
            
            if (object.material) {
              if (Array.isArray(object.material)) {
                object.material.forEach((material) => material.dispose())
              } else {
                object.material.dispose()
              }
            }
          }
        })
      }
    }
  }, [modelUrl, fileType, backgroundColor, showGrid, showAxes, autoRotate, width, height, normalizedFileType, is3D])
  
  // 重置相机位置
  const resetCamera = () => {
    if (cameraRef.current && controlsRef.current) {
      cameraRef.current.position.set(2, 2, 5)
      controlsRef.current.target.set(0, 0, 0)
      controlsRef.current.update()
    }
  }
  
  // 切换自动旋转
  const toggleAutoRotate = () => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = !controlsRef.current.autoRotate
    }
  }
  
  return (
    <div className={cn("relative w-full h-full min-h-[300px]", className)}>
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <div className="flex flex-col items-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="mt-2 text-sm text-muted-foreground">加载3D模型中...</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/80 z-10">
          <Alert variant="destructive" className="max-w-md">
            <AlertTriangle className="h-4 w-4" />
            <AlertTitle>加载错误</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
      )}
      
      <div ref={containerRef} className="w-full h-full" />
      
      {showControls && !isLoading && !error && (
        <div className="absolute bottom-2 right-2 flex gap-1">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={resetCamera}>
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>重置视角</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button size="icon" variant="outline" onClick={toggleAutoRotate}>
                  <RotateCw className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>自动旋转</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      )}
      
      {!isLoading && !error && (
        <div className="absolute bottom-2 left-2 text-xs text-muted-foreground">
          <p>拖动: 旋转模型 | 滚轮: 缩放 | 右键拖动: 平移</p>
        </div>
      )}
    </div>
  )
} 