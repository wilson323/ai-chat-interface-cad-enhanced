"use client"

import React, { useEffect, useMemo,useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader'
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader'
import { EXRLoader } from 'three/examples/jsm/loaders/EXRLoader'
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader'
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader'
import { PLYLoader } from 'three/examples/jsm/loaders/PLYLoader'
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader'
import { TDSLoader } from 'three/examples/jsm/loaders/TDSLoader'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer'
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass'
import { SSAOPass } from 'three/examples/jsm/postprocessing/SSAOPass'
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass'
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader'
import { GammaCorrectionShader } from 'three/examples/jsm/shaders/GammaCorrectionShader'

import { 
  AdvancedRenderingOptions,
  CADSectionAnalysisConfig 
} from '@/lib/types/cad'

interface ThreeViewerProps {
  fileUrl?: string
  fileType?: string
  modelData?: any // For direct geometry data if available
  dimensions?: {
    width: number
    height: number
    depth?: number
    unit?: string
  }
  viewerConfig?: {
    showGrid?: boolean
    showAxes?: boolean
    backgroundColor?: string | number
    materialColor?: string | number
    enableOrbitControls?: boolean
    enableZoom?: boolean
    enablePan?: boolean
    enableRotation?: boolean
    showWireframe?: boolean
  }
  renderingOptions?: AdvancedRenderingOptions
  sectionAnalysis?: CADSectionAnalysisConfig
  onLoadStart?: () => void
  onLoadComplete?: () => void
  onLoadError?: (error: Error) => void
  onSelect?: (objectId: string) => void
}

export function ThreeViewer({
  fileUrl,
  fileType,
  modelData,
  dimensions,
  viewerConfig = {},
  renderingOptions,
  sectionAnalysis,
  onLoadStart,
  onLoadComplete,
  onLoadError,
  onSelect
}: ThreeViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null)
  const sceneRef = useRef<THREE.Scene | null>(null)
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null)
  const controlsRef = useRef<OrbitControls | null>(null)
  const composerRef = useRef<EffectComposer | null>(null)
  const modelRef = useRef<THREE.Group | null>(null)
  const frameIdRef = useRef<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [modelBounds, setModelBounds] = useState<THREE.Box3 | null>(null)
  const [selectedObject, setSelectedObject] = useState<string | null>(null)

  // 剖切平面
  const sectionPlaneRef = useRef<THREE.Plane | null>(null)
  const sectionPlaneHelperRef = useRef<THREE.PlaneHelper | null>(null)
  
  // 应用默认配置
  const config = {
    showGrid: true,
    showAxes: true,
    backgroundColor: 0xf5f5f5,
    materialColor: 0x7799cc,
    enableOrbitControls: true,
    enableZoom: true,
    enablePan: true,
    enableRotation: true,
    showWireframe: false,
    ...viewerConfig
  }
  
  // 渲染选项
  const renderConfig = useMemo(() => ({
    shadows: true,
    ambientOcclusion: true,
    reflections: false,
    antialiasing: true,
    textureQuality: 'medium',
    performance: 'balanced',
    wireframeMode: 'none',
    edgeHighlight: true,
    ...renderingOptions
  } as AdvancedRenderingOptions), [renderingOptions])
  
  // 截面分析配置
  const sectionConfig = useMemo(() => ({
    enabled: false,
    plane: 'xy',
    showIntersection: true,
    clipModel: true,
    ...sectionAnalysis
  } as CADSectionAnalysisConfig), [sectionAnalysis])
  
  // 材质创建函数
  const createMaterials = (color?: number | string) => {
    const materialColor = color || config.materialColor;
    
    return {
      standard: new THREE.MeshStandardMaterial({
        color: materialColor,
        roughness: 0.5,
        metalness: 0.1,
        flatShading: false
      }),
      pbr: new THREE.MeshPhysicalMaterial({
        color: materialColor,
        roughness: 0.5,
        metalness: 0.3,
        clearcoat: 0.2,
        clearcoatRoughness: 0.3,
        flatShading: false
      }),
      wireframe: new THREE.MeshBasicMaterial({
        color: 0x000000,
        wireframe: true,
        transparent: true,
        opacity: 0.15
      }),
      highlighted: new THREE.MeshStandardMaterial({
        color: 0xffaa00,
        roughness: 0.5,
        metalness: 0.3,
        emissive: 0x555500,
        flatShading: false
      })
    };
  };
  
  // 设置相机根据模型边界框
  const setupCameraForModel = (bbox: THREE.Box3) => {
    if (!cameraRef.current || !controlsRef.current) return;
    
    // 计算模型尺寸和中心
    const size = new THREE.Vector3();
    bbox.getSize(size);
    const center = new THREE.Vector3();
    bbox.getCenter(center);
    
    // 计算合适的相机距离
    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = cameraRef.current.fov * (Math.PI / 180);
    let cameraDistance = Math.abs(maxDim / Math.sin(fov / 2)) * 1.2;
    
    // 确保最小距离
    cameraDistance = Math.max(cameraDistance, 5);
    
    // 设置相机位置
    cameraRef.current.position.set(
      center.x + cameraDistance * 0.7, 
      center.y + cameraDistance * 0.7, 
      center.z + cameraDistance * 0.7
    );
    
    // 设置相机朝向
    cameraRef.current.lookAt(center);
    
    // 更新相机的近平面和远平面
    cameraRef.current.near = cameraDistance / 100;
    cameraRef.current.far = cameraDistance * 100;
    cameraRef.current.updateProjectionMatrix();
    
    // 更新轨道控制器目标
    controlsRef.current.target.copy(center);
    controlsRef.current.update();
    
    // 保存模型边界信息
    setModelBounds(bbox);
    
    // 设置剖切平面（如果启用）
    if (sectionConfig.enabled) {
      setupSectionPlane(center, size);
    }
  };
  
  // 设置剖切平面
  const setupSectionPlane = (center: THREE.Vector3, size: THREE.Vector3) => {
    if (!sceneRef.current) return;
    
    // 移除现有的剖切平面
    if (sectionPlaneHelperRef.current) {
      sceneRef.current.remove(sectionPlaneHelperRef.current);
      sectionPlaneHelperRef.current = null;
    }
    
    // 创建新的剖切平面
    let normal: THREE.Vector3;
    let position: THREE.Vector3;
    
    // 根据所选平面类型设置法线和位置
    switch (sectionConfig.plane) {
      case 'xy':
        normal = new THREE.Vector3(0, 0, 1);
        position = new THREE.Vector3(center.x, center.y, center.z);
        break;
      case 'xz':
        normal = new THREE.Vector3(0, 1, 0);
        position = new THREE.Vector3(center.x, center.y, center.z);
        break;
      case 'yz':
        normal = new THREE.Vector3(1, 0, 0);
        position = new THREE.Vector3(center.x, center.y, center.z);
        break;
      case 'custom':
        if (sectionConfig.customNormal && sectionConfig.customPosition) {
          normal = new THREE.Vector3(...sectionConfig.customNormal);
          position = new THREE.Vector3(...sectionConfig.customPosition);
        } else {
          normal = new THREE.Vector3(1, 1, 1).normalize();
          position = new THREE.Vector3(center.x, center.y, center.z);
        }
        break;
      default:
        normal = new THREE.Vector3(0, 0, 1);
        position = new THREE.Vector3(center.x, center.y, center.z);
    }
    
    // 创建平面
    sectionPlaneRef.current = new THREE.Plane(normal, -position.dot(normal));
    
    // 创建平面辅助对象
    const planeHelper = new THREE.PlaneHelper(
      sectionPlaneRef.current,
      Math.max(size.x, size.y, size.z) * 1.5,
      0xff0000
    );
    sceneRef.current.add(planeHelper);
    sectionPlaneHelperRef.current = planeHelper;
    
    // 如果需要，设置模型的剖切
    if (modelRef.current && sectionConfig.clipModel) {
      modelRef.current.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          child.material.clippingPlanes = [sectionPlaneRef.current!];
          child.material.clipIntersection = false;
          child.material.clipShadows = true;
          child.material.needsUpdate = true;
        }
      });
    }
  };
  
  // 初始化Three.js场景
  useEffect(() => {
    if (!containerRef.current) return;
    
    // 通知开始加载
    onLoadStart?.();
    
    // 设置场景
    const scene = new THREE.Scene();
    const bgColor = typeof config.backgroundColor === 'string' 
      ? new THREE.Color(config.backgroundColor)
      : new THREE.Color(config.backgroundColor);
    scene.background = bgColor;
    sceneRef.current = scene;
    
    // 添加光源
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);
    
    const directionalLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight1.position.set(1, 1, 1);
    if (renderConfig.shadows) {
      directionalLight1.castShadow = true;
      directionalLight1.shadow.mapSize.width = 2048;
      directionalLight1.shadow.mapSize.height = 2048;
      directionalLight1.shadow.camera.near = 0.5;
      directionalLight1.shadow.camera.far = 500;
      directionalLight1.shadow.bias = -0.0001;
    }
    scene.add(directionalLight1);
    
    const directionalLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight2.position.set(-1, 0.5, -1);
    if (renderConfig.shadows) {
      directionalLight2.castShadow = true;
    }
    scene.add(directionalLight2);
    
    // 添加半球光
    const hemisphereLight = new THREE.HemisphereLight(0xffffff, 0x303030, 0.5);
    scene.add(hemisphereLight);
    
    // 设置相机
    const aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
    const camera = new THREE.PerspectiveCamera(50, aspect, 0.1, 2000);
    camera.position.set(10, 10, 10);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;
    
    // 设置渲染器
    const renderer = new THREE.WebGLRenderer({ 
      antialias: renderConfig.antialiasing,
      alpha: true,
      logarithmicDepthBuffer: true,
    });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    
    // 配置阴影
    if (renderConfig.shadows) {
      renderer.shadowMap.enabled = true;
      renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    }
    
    // 启用裁剪平面
    renderer.localClippingEnabled = true;
    
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // 设置控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 2;
    controls.maxDistance = 500;
    controls.enableZoom = config.enableZoom;
    controls.enablePan = config.enablePan;
    controls.enableRotate = config.enableRotation;
    controlsRef.current = controls;
    
    // 添加网格平面作为参考
    if (config.showGrid) {
      const gridHelper = new THREE.GridHelper(20, 20, 0x888888, 0xcccccc);
      scene.add(gridHelper);
    }
    
    // 添加坐标轴辅助
    if (config.showAxes) {
      const axesHelper = new THREE.AxesHelper(5);
      scene.add(axesHelper);
    }
    
    // 设置后期处理
    const composer = new EffectComposer(renderer);
    
    // 渲染通道
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // 环境光遮蔽
    if (renderConfig.ambientOcclusion) {
      const ssaoPass = new SSAOPass(scene as any, camera as any, containerRef.current.clientWidth, containerRef.current.clientHeight) as any
      if (ssaoPass) {
        if ('radius' in ssaoPass) ssaoPass.radius = 10
        if ('intensity' in ssaoPass) ssaoPass.intensity = 0.5
        if ('kernelRadius' in ssaoPass) ssaoPass.kernelRadius = 16
        if ('kernelSize' in ssaoPass) ssaoPass.kernelSize = 32
        composer.addPass(ssaoPass)
      }
    }
    
    // 边缘高光
    if (renderConfig.edgeHighlight) {
      const outlinePass = new OutlinePass(
        new THREE.Vector2(containerRef.current.clientWidth, containerRef.current.clientHeight),
        scene,
        camera
      );
      outlinePass.edgeStrength = 3;
      outlinePass.edgeGlow = 0.5;
      outlinePass.edgeThickness = 2;
      outlinePass.pulsePeriod = 0;
      outlinePass.visibleEdgeColor.set(0xffaa00);
      outlinePass.hiddenEdgeColor.set(0x333333);
      composer.addPass(outlinePass);
    }
    
    // 抗锯齿
    if (renderConfig.antialiasing) {
      const fxaaPass = new ShaderPass(FXAAShader);
      const pixelRatio = renderer.getPixelRatio();
      fxaaPass.material.uniforms['resolution'].value.x = 1 / (containerRef.current.clientWidth * pixelRatio);
      fxaaPass.material.uniforms['resolution'].value.y = 1 / (containerRef.current.clientHeight * pixelRatio);
      composer.addPass(fxaaPass);
    }
    
    // Gamma校正
    const gammaCorrectionPass = new ShaderPass(GammaCorrectionShader);
    composer.addPass(gammaCorrectionPass);
    
    composerRef.current = composer;
    
    // 添加射线投射器，用于对象选择
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    // 点击事件处理
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current || !sceneRef.current || !cameraRef.current) return;
      
      // 计算鼠标位置
      const rect = containerRef.current.getBoundingClientRect();
      mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
      
      // 设置射线投射器
      raycaster.setFromCamera(mouse, cameraRef.current);
      
      // 获取相交的对象
      const intersects = raycaster.intersectObjects(sceneRef.current.children, true);
      
      if (intersects.length > 0) {
        // 查找第一个具有用户数据的对象
        for (const intersect of intersects) {
          const object = intersect.object;
          
          if (object.userData && object.userData.id) {
            setSelectedObject(object.userData.id);
            onSelect?.(object.userData.id);
            
            // 取消已选中对象的材质
            if (modelRef.current) {
              modelRef.current.traverse((child) => {
                if (child instanceof THREE.Mesh && child.userData.isHighlighted) {
                  // 恢复原始材质
                  if (child.userData.originalMaterial) {
                    child.material = child.userData.originalMaterial;
                  }
                  child.userData.isHighlighted = false;
                }
              });
            }
            
            // 设置新选中对象的材质
            if (object instanceof THREE.Mesh) {
              // 保存原始材质
              object.userData.originalMaterial = object.material;
              object.userData.isHighlighted = true;
              
              // 设置高亮材质
              const materials = createMaterials();
              object.material = materials.highlighted;
            }
            
            break;
          }
        }
      } else {
        // 取消选择
        setSelectedObject(null);
        
        // 恢复所有对象的材质
        if (modelRef.current) {
          modelRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh && child.userData.isHighlighted) {
              // 恢复原始材质
              if (child.userData.originalMaterial) {
                child.material = child.userData.originalMaterial;
              }
              child.userData.isHighlighted = false;
            }
          });
        }
      }
    };
    
    containerRef.current.addEventListener('click', handleClick);
    
    // 动画循环
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      controls.update();
      
      // 使用后期处理器渲染
      if (composerRef.current) {
        composerRef.current.render();
      } else {
        renderer.render(scene, camera);
      }
    };
    
    animate();
    
    // 窗口大小调整处理
    const handleResize = () => {
      if (!containerRef.current || !cameraRef.current || !rendererRef.current || !composerRef.current) return;
      
      const width = containerRef.current.clientWidth;
      const height = containerRef.current.clientHeight;
      
      // 更新相机宽高比
      cameraRef.current.aspect = width / height;
      cameraRef.current.updateProjectionMatrix();
      
      // 更新渲染器尺寸
      rendererRef.current.setSize(width, height);
      
      // 更新后期处理器尺寸
      composerRef.current.setSize(width, height);
      
      // 更新FXAA分辨率
      const pixelRatio = rendererRef.current.getPixelRatio();
      const fxaaPass = composerRef.current.passes.find((pass: any) => pass?.material?.uniforms?.['resolution']) as any
      if (fxaaPass?.material?.uniforms?.['resolution']) {
        fxaaPass.material.uniforms['resolution'].value.x = 1 / (width * pixelRatio)
        fxaaPass.material.uniforms['resolution'].value.y = 1 / (height * pixelRatio)
      }
    };
    
    window.addEventListener('resize', handleResize);
    
    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      containerRef.current?.removeEventListener('click', handleClick);
      
      cancelAnimationFrame(frameIdRef.current);
      
      // 删除渲染器DOM元素
      if (rendererRef.current && rendererRef.current.domElement && containerRef.current) {
        containerRef.current.removeChild(rendererRef.current.domElement);
      }
      
      // 销毁渲染器
      rendererRef.current?.dispose();
      controlsRef.current?.dispose();
      
      // 销毁后期处理器
      composerRef.current?.dispose();
    };
  }, [config, renderConfig, onLoadStart, onSelect]);
  
  // 加载模型数据
  useEffect(() => {
    if (!sceneRef.current || (!fileUrl && !modelData)) return;
    
    const loadModel = async () => {
      try {
        setError(null);
        
        // 清除现有模型
        if (modelRef.current && sceneRef.current) {
          sceneRef.current.remove(modelRef.current);
          // 释放资源
          modelRef.current.traverse((child) => {
            if (child instanceof THREE.Mesh) {
              if (child.geometry) {
                child.geometry.dispose();
              }
              
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else if (child.material) {
                child.material.dispose();
              }
            }
          });
          modelRef.current = null;
        }
        
        // 创建模型组
        const modelGroup = new THREE.Group();
        modelGroup.name = 'cadModel';
        
        // 创建材质
        const materials = createMaterials(config.materialColor);
        
        // 根据数据来源加载模型
        if (modelData) {
          // 直接使用模型数据（如Components转Three.js对象）
          loadModelFromData(modelData, modelGroup, materials);
        } else if (fileUrl && fileType) {
          // 从文件URL加载
          await loadModelFromFile(fileUrl, fileType, modelGroup, materials);
        }
        
        // 添加到场景
        if (modelGroup.children.length > 0 && sceneRef.current) {
          sceneRef.current.add(modelGroup);
          modelRef.current = modelGroup;
          
          // 如果需要，添加线框
          if (config.showWireframe || renderConfig.wireframeMode === 'overlay') {
            addWireframe(modelGroup, materials.wireframe);
          }
          
          // 根据渲染选项应用体积光
          if (renderConfig.ambientOcclusion && composerRef.current) {
            const ssaoPass = composerRef.current.passes.find((pass: any) => pass?.constructor?.name === 'SSAOPass') as any
            if (ssaoPass && sceneRef.current && cameraRef.current) {
              ssaoPass.scene = sceneRef.current as any
              ssaoPass.camera = cameraRef.current as any
            }
          }
          
          // 获取边界框并调整相机
          const bbox = new THREE.Box3().setFromObject(modelGroup);
          setupCameraForModel(bbox);
        }
        
        // 完成回调
        onLoadComplete?.();
      } catch (error) {
        console.error('加载CAD模型出错:', error);
        setError(error instanceof Error ? error.message : String(error));
        onLoadError?.(error instanceof Error ? error : new Error(String(error)));
      }
    };
    
    loadModel();
  }, [fileUrl, fileType, modelData, dimensions, config, renderConfig, onLoadComplete, onLoadError]);
  
  // 监听截面配置变化
  useEffect(() => {
    if (sceneRef.current && modelRef.current && modelBounds && sectionConfig.enabled) {
      setupSectionPlane(
        new THREE.Vector3().copy(modelBounds.getCenter(new THREE.Vector3())),
        new THREE.Vector3().copy(modelBounds.getSize(new THREE.Vector3()))
      );
    } else if (sceneRef.current && sectionPlaneHelperRef.current && !sectionConfig.enabled) {
      // 移除剖切平面
      sceneRef.current.remove(sectionPlaneHelperRef.current);
      sectionPlaneHelperRef.current = null;
      
      // 移除网格剖切
      if (modelRef.current) {
        modelRef.current.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            child.material.clippingPlanes = [];
            child.material.needsUpdate = true;
          }
        });
      }
    }
  }, [sectionConfig, modelBounds]);
  
  // 从组件数据创建模型
  const loadModelFromData = (
    data: any, 
    targetGroup: THREE.Group,
    materials: Record<string, THREE.Material>
  ) => {
    if (!data || !Array.isArray(data)) return;
    
    // 根据数据类型处理
    data.forEach((component, index) => {
      try {
        // 创建几何体
        let geometry: THREE.BufferGeometry | null = null;
        
        if (component.geometry) {
          // 直接使用提供的几何数据
          if (component.geometry.attributes) {
            // BufferGeometry格式
            geometry = new THREE.BufferGeometry();
            
            // 添加属性
            for (const key in component.geometry.attributes) {
              const attribute = component.geometry.attributes[key];
              geometry.setAttribute(
                key,
                new THREE.BufferAttribute(
                  new Float32Array(attribute.array),
                  attribute.itemSize
                )
              );
            }
            
            // 设置索引（如果有）
            if (component.geometry.index) {
              geometry.setIndex(
                new THREE.BufferAttribute(
                  new Uint32Array(component.geometry.index.array),
                  component.geometry.index.itemSize
                )
              );
            }
          }
        } else if (component.type === 'box') {
          // 盒体几何体
          geometry = new THREE.BoxGeometry(
            component.width || 1,
            component.height || 1,
            component.depth || 1
          );
        } else if (component.type === 'sphere') {
          // 球体几何体
          geometry = new THREE.SphereGeometry(
            component.radius || 1,
            component.widthSegments || 32,
            component.heightSegments || 16
          );
        } else if (component.type === 'cylinder') {
          // 圆柱体几何体
          geometry = new THREE.CylinderGeometry(
            component.radiusTop || 1,
            component.radiusBottom || 1,
            component.height || 1,
            component.radialSegments || 32
          );
        }
        
        // 如果创建了几何体，添加到场景
        if (geometry) {
          // 选择材质
          let material = materials.standard;
          if (component.material) {
            // 如果组件指定了材质属性，创建自定义材质
            material = new THREE.MeshStandardMaterial({
              color: component.color || config.materialColor,
              roughness: component.roughness || 0.5,
              metalness: component.metalness || 0.1,
              flatShading: component.flatShading || false
            });
          }
          
          // 创建网格
          const mesh = new THREE.Mesh(geometry, material);
          
          // 设置位置、旋转和缩放
          if (component.position) {
            mesh.position.set(
              component.position[0] || 0,
              component.position[1] || 0,
              component.position[2] || 0
            );
          }
          
          if (component.rotation) {
            mesh.rotation.set(
              component.rotation[0] || 0,
              component.rotation[1] || 0,
              component.rotation[2] || 0
            );
          }
          
          if (component.scale) {
            mesh.scale.set(
              component.scale[0] || 1,
              component.scale[1] || 1,
              component.scale[2] || 1
            );
          }
          
          // 设置网格的用户数据
          mesh.userData = {
            id: component.id || `component_${index}`,
            name: component.name || `Component ${index}`,
            type: component.type || 'unknown',
            metadata: component.metadata || {}
          };
          
          // 设置阴影
          if (renderConfig.shadows) {
            mesh.castShadow = true;
            mesh.receiveShadow = true;
          }
          
          // 添加到模型组
          targetGroup.add(mesh);
        }
      } catch (error) {
        console.error('处理组件数据失败:', error, component);
      }
    });
  };
  
  // 从文件加载模型
  const loadModelFromFile = async (
    url: string,
    type: string,
    targetGroup: THREE.Group,
    materials: Record<string, THREE.Material>
  ): Promise<void> => {
    // 加载器实例
    const loaderForType = getLoaderForFileType(type.toLowerCase());
    
    if (!loaderForType) {
      throw new Error(`不支持的文件类型: ${type}`);
    }
    
    try {
      // 加载模型
      const result = await new Promise<THREE.Object3D | THREE.BufferGeometry>((resolve, reject) => {
        loaderForType.load(
          url,
          (obj: any) => resolve(obj as any),
          (progress) => {
            // console.log('加载进度:', Math.round((progress.loaded / progress.total) * 100) + '%');
          },
          reject
        );
      });
      
      // 处理不同加载器返回的结果
      if (result instanceof THREE.BufferGeometry) {
        // STL, PLY等加载器返回几何体
        const mesh = new THREE.Mesh(
          result,
          renderConfig.performance === 'high' ? materials.pbr : materials.standard
        );
        
        if (renderConfig.shadows) {
          mesh.castShadow = true;
          mesh.receiveShadow = true;
        }
        
        targetGroup.add(mesh);
      } else {
        // GLTF, OBJ等加载器返回对象/场景
        // 处理材质
        result.traverse((child) => {
          if (child instanceof THREE.Mesh) {
            // 为了保持性能，对较低性能模式使用标准材质
            if (renderConfig.performance !== 'high' && !(child.material instanceof THREE.MeshBasicMaterial)) {
              child.material = materials.standard.clone();
            }
            
            // 设置阴影
            if (renderConfig.shadows) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
            
            // 设置裁剪平面
            if (sectionConfig.enabled && sectionPlaneRef.current && sectionConfig.clipModel) {
              child.material.clippingPlanes = [sectionPlaneRef.current];
              child.material.clipShadows = true;
              child.material.needsUpdate = true;
            }
          }
        });
        
        targetGroup.add(result);
      }
    } catch (error) {
      console.error(`加载 ${type} 模型失败:`, error);
      throw error;
    }
  };
  
  // 为模型添加线框
  const addWireframe = (model: THREE.Object3D, wireframeMaterial: THREE.Material) => {
    model.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        const wireframe = new THREE.Mesh(child.geometry, wireframeMaterial);
        wireframe.position.copy(child.position);
        wireframe.rotation.copy(child.rotation);
        wireframe.scale.copy(child.scale);
        child.add(wireframe);
      }
    });
  };
  
  // 根据文件类型获取合适的加载器
  const getLoaderForFileType = (fileType: string): THREE.Loader => {
    const type = fileType.toLowerCase();
    
    // 创建DRACO加载器以用于压缩几何体
    const dracoLoader = new DRACOLoader();
    dracoLoader.setDecoderPath('/draco/');
    
    switch (type) {
      case 'stl':
        return new STLLoader();
      case 'obj':
        return new OBJLoader();
      case 'gltf':
      case 'glb': {
        const gltfLoader = new GLTFLoader();
        gltfLoader.setDRACOLoader(dracoLoader);
        return gltfLoader;
      }
      case 'fbx':
        return new FBXLoader();
      case 'dae':
        return new ColladaLoader();
      case 'ply':
        return new PLYLoader();
      case '3ds':
        return new TDSLoader();
      case 'ifc':
        // 如需 IFC 支持，应单独引入并配置 wasm 资源；当前先不启用
        return new STLLoader();
      default:
        return new STLLoader();  // 默认使用STL加载器
    }
  };
  
  return (
    <div className="relative w-full h-full" ref={containerRef}>
      {/* 错误显示 */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-50 dark:bg-red-900/30 z-10 p-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg max-w-md">
            <h3 className="text-red-600 dark:text-red-400 font-medium mb-2">加载模型出错</h3>
            <p className="text-gray-600 dark:text-gray-300 text-sm">{error}</p>
          </div>
        </div>
      )}
    </div>
  );
} 