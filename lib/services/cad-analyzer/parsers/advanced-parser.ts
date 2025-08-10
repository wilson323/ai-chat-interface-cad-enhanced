// 高级CAD解析引擎 - 支持全格式处理
import * as THREE from 'three';
import { STLLoader } from 'three/examples/jsm/loaders/STLLoader';
import { ColladaLoader } from 'three/examples/jsm/loaders/ColladaLoader';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader';
import { DXFParser } from './dxf-parser';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { IFCLoader } from 'web-ifc-three/IFCLoader';
import { CADAnalysisResult, CADComponent, CADEntityMap, CADMaterial } from '@/lib/types/cad';
import { ParserOptions } from './index';
import { cadMetrics } from '../metrics';

// 支持的格式映射到处理器
const FORMAT_PROCESSORS = {
  // 2D格式
  'dxf': processDXF,
  'dwg': processDWG,
  
  // 3D格式
  'step': processSTEP,
  'stp': processSTEP,
  'iges': processIGES,
  'igs': processIGES,
  'stl': processSTL,
  'obj': processOBJ,
  'fbx': processFBX,
  'gltf': processGLTF,
  'glb': processGLTF,
  'dae': processCOLLADA,
  'ifc': processIFC
};

/**
 * 高级CAD文件解析器
 * 支持复杂CAD文件的深度解析和特征提取
 */

interface AdvancedParserOptions {
  extractTopology?: boolean;         // 提取拓扑关系
  extractFeatures?: boolean;         // 提取特征
  calculateMassProperties?: boolean; // 计算质量特性
  extractAssemblyStructure?: boolean;// 提取装配结构
  extractConstraints?: boolean;      // 提取约束
  extractAnnotations?: boolean;      // 提取注释
  detailLevel: 'low' | 'standard' | 'high'; // 解析详细程度
  optimizeMesh?: boolean;            // 优化网格
}

// 默认解析选项
const DEFAULT_ADVANCED_OPTIONS: AdvancedParserOptions = {
  extractTopology: true,
  extractFeatures: true,
  calculateMassProperties: true,
  extractAssemblyStructure: true,
  extractConstraints: true,
  extractAnnotations: true,
  detailLevel: 'standard',
  optimizeMesh: true
};

/**
 * 高级CAD解析器类
 * 使用更复杂的算法和方法进行CAD文件解析
 */
export class AdvancedCADParser {
  private options: AdvancedParserOptions;
  
  constructor(options: Partial<AdvancedParserOptions> = {}) {
    this.options = {
      ...DEFAULT_ADVANCED_OPTIONS,
      ...options
    };
  }
  
  /**
   * 解析CAD文件
   * @param fileData 文件数据（File或ArrayBuffer）
   * @param fileType 文件类型
   * @returns 解析结果
   */
  async parse(
    fileData: File | ArrayBuffer,
    fileType: string
  ): Promise<CADAnalysisResult> {
    const startTime = Date.now();
    
    try {
      console.log(`开始高级解析 ${fileType} 文件`);
      
      // 获取文件字节数据
      const buffer = fileData instanceof File 
        ? await fileData.arrayBuffer()
        : fileData;
      
      // 使用适当的格式解析器
      let result: CADAnalysisResult;
      
      switch (fileType.toLowerCase()) {
        case 'step':
        case 'stp':
          result = await this.parseSTEP(buffer);
          break;
        case 'iges':
        case 'igs':
          result = await this.parseIGES(buffer);
          break;
        case 'dwg':
          result = await this.parseDWG(buffer);
          break;
        case 'dxf':
          result = await this.parseDXF(buffer);
          break;
        case 'stl':
          result = await this.parseSTL(buffer);
          break;
        case 'obj':
          result = await this.parseOBJ(buffer);
          break;
        default:
          throw new Error(`不支持的文件类型: ${fileType}`);
      }
      
      // 如果需要，提取拓扑关系
      if (this.options.extractTopology) {
        result.topology = this.extractTopology(result);
      }
      
      // 如果需要，提取特征
      if (this.options.extractFeatures) {
        result.features = this.extractFeatures(result);
      }
      
      // 如果需要，计算质量属性
      if (this.options.calculateMassProperties) {
        result.massProperties = this.calculateMassProperties(result);
      }
      
      // 如果需要，生成装配结构
      if (this.options.extractAssemblyStructure && !result.assemblyStructure) {
        const components = result.components ?? [];
        result.assemblyStructure = this.buildAssemblyStructure(components);
      }
      
      // 记录解析持续时间
      const duration = Date.now() - startTime;
      cadMetrics.record('parse_duration', duration, 'ms', {
        parser: 'advanced',
        fileType,
        detailLevel: this.options.detailLevel
      });
      
      // 计算和记录复杂度得分
      const complexityScore = this.calculateComplexityScore(result);
      cadMetrics.record('complexity_score', complexityScore, 'count', {
        fileType,
        componentCount: String((result.components ?? []).length)
      });
      
      // 设置复杂度分数
      result.metadata = {
        ...result.metadata,
        complexityScore
      };
      
      return result;
    } catch (error) {
      console.error(`高级CAD解析失败:`, error);
      
      // 记录错误
      cadMetrics.record('error_count', 1, 'count', {
        error: error instanceof Error ? error.message : String(error),
        parser: 'advanced',
        fileType
      });
      
      throw error;
    }
  }
  
  /**
   * 解析STEP文件
   */
  private async parseSTEP(buffer: ArrayBuffer): Promise<CADAnalysisResult> {
    // 在实际项目中，这里应该调用专业的STEP解析库
    // 例如OCCTs (OpenCASCADE)、HOOPS Exchange等
    
    // 此处为模拟实现
    console.log('解析STEP文件，大小:', buffer.byteLength, '字节');
    
    // 提取文件头信息
    const textDecoder = new TextDecoder('utf-8');
    const headerText = textDecoder.decode(buffer.slice(0, 1000));
    
    // 解析STEP头部信息
    const fileDescriptionMatch = headerText.match(/FILE_DESCRIPTION\s*\(\s*\(\s*'([^']+)'/);
    const fileNameMatch = headerText.match(/FILE_NAME\s*\(\s*'([^']+)'/);
    
    const fileName = fileNameMatch ? fileNameMatch[1] : 'unknown.step';
    const description = fileDescriptionMatch ? fileDescriptionMatch[1] : '';
    
    // 创建组件列表
    const components = this.generateSampleComponents(15);
    
    // 生成图层列表
    const layers = ['默认层', '几何图形', '注释', '尺寸'];
    
    // 计算实体数量
    const entities: CADEntityMap = {
      'MANIFOLD_SOLID_BREP': 8,
      'ADVANCED_FACE': 45,
      'CLOSED_SHELL': 8,
      'EDGE_CURVE': 120,
      'VERTEX_POINT': 65,
      'FACE_SURFACE': 45,
      'ORIENTED_EDGE': 240
    };
    
    // 生成材质列表
    const materials = this.generateSampleMaterials();
    
    // 组装结果
    const fileId = new Date().getTime().toString();
    return {
      fileId,
      id: fileId,
      fileName,
      fileType: 'step',
      fileSize: buffer.byteLength,
      components,
      layers,
      entities,
      materials,
      dimensions: {
        width: 250,
        height: 150,
        depth: 100,
        unit: 'mm'
      },
      metadata: {
        format: 'STEP AP214',
        version: 'AP214',
        creationDate: new Date().toISOString(),
        description,
        boundingBox: {
          min: [-125, -75, -50],
          max: [125, 75, 50]
        },
        units: 'mm'
      }
    };
  }
  
  /**
   * 解析IGES文件
   */
  private async parseIGES(buffer: ArrayBuffer): Promise<CADAnalysisResult> {
    // 在实际项目中，这里应该调用专业的IGES解析库
    
    // 此处为模拟实现
    console.log('解析IGES文件，大小:', buffer.byteLength, '字节');
    
    // 提取文件头信息
    const textDecoder = new TextDecoder('utf-8');
    const headerText = textDecoder.decode(buffer.slice(0, 1000));
    
    // 解析IGES头部信息
    const startSectionMatch = headerText.match(/S\s*([0-9]+)/);
    const globalSectionMatch = headerText.match(/G\s*([0-9]+)/);
    
    const fileName = 'model.igs';
    
    // 创建组件列表
    const components = this.generateSampleComponents(10);
    
    // 生成图层列表
    const layers = ['默认层', '主要几何', '辅助几何', '标注'];
    
    // 计算实体数量
    const entities: CADEntityMap = { 'EDGE': 120, 'FACE': 45, 'VERTEX': 65 } as any;
    
    // 生成材质列表
    const materials = this.generateSampleMaterials();
    
    // 组装结果
    const fileId = new Date().getTime().toString();
    return {
      fileId,
      id: fileId,
      fileName,
      fileType: 'iges',
      fileSize: buffer.byteLength,
      components,
      layers,
      entities,
      materials,
      dimensions: {
        width: 200,
        height: 150,
        depth: 80,
        unit: 'mm'
      },
      metadata: {
        format: 'IGES',
        version: '5.3',
        creationDate: new Date().toISOString(),
        description: '使用高级解析器的IGES文件解析结果',
        boundingBox: {
          min: [-100, -75, -40],
          max: [100, 75, 40]
        },
        units: 'mm'
      }
    };
  }
  
  /**
   * 解析DWG文件
   */
  private async parseDWG(buffer: ArrayBuffer): Promise<CADAnalysisResult> {
    // 在实际项目中，这里应该调用专业的DWG解析库
    // 例如ODA (Open Design Alliance) 库
    
    // 此处为模拟实现
    console.log('解析DWG文件，大小:', buffer.byteLength, '字节');
    
    // 提取文件头信息
    const headerBytes = new Uint8Array(buffer.slice(0, 128));
    
    // DWG格式判断
    let version = 'Unknown';
    if (headerBytes[0] === 65 && headerBytes[1] === 67) {
      // AC开头表示AutoCAD DWG
      const versionBytes = headerBytes.slice(2, 6);
      const versionStr = new TextDecoder().decode(versionBytes);
      version = `AutoCAD ${versionStr}`;
    }
    
    const fileName = 'drawing.dwg';
    
    // 创建组件列表 - DWG中通常是图形实体而非3D组件
    const components = this.generateSampleComponents(5, 'drawing');
    
    // 生成图层列表 - DWG通常有较多图层
    const layers = [
      '0', '图框', '尺寸标注', '中心线', '轮廓', 
      '隐藏线', '剖面线', '文字说明', '标题栏'
    ];
    
    // 计算实体数量
    const entities: CADEntityMap = {
      'LINE': 350,
      'CIRCLE': 48,
      'ARC': 65,
      'TEXT': 120,
      'DIMENSION': 85,
      'POLYLINE': 42,
      'BLOCK': 15,
      'HATCH': 18
    };
    
    // DWG通常没有材质
    const materials = [];
    
    // 组装结果
    return {
      fileId: new Date().getTime().toString(),
      fileName,
      fileType: 'dwg',
      components,
      layers,
      entities,
      materials,
      dimensions: {
        width: 841,
        height: 594,
        unit: 'mm'
      },
      metadata: {
        format: 'DWG',
        version,
        creationDate: new Date().toISOString(),
        description: '使用高级解析器的DWG文件解析结果',
        boundingBox: {
          min: [0, 0, 0],
          max: [841, 594, 0]
        },
        units: 'mm'
      }
    };
  }
  
  /**
   * 解析DXF文件
   */
  private async parseDXF(buffer: ArrayBuffer): Promise<CADAnalysisResult> {
    // 在实际项目中，这里应该调用专业的DXF解析库
    
    // 此处为模拟实现
    console.log('解析DXF文件，大小:', buffer.byteLength, '字节');
    
    // 提取文件头信息
    const textDecoder = new TextDecoder('utf-8');
    const headerText = textDecoder.decode(buffer.slice(0, 5000));
    
    // 解析DXF版本和其他元数据
    const versionMatch = headerText.match(/\$ACADVER\s*\n\s*1\s*\n\s*(AC\d+)/);
    const version = versionMatch ? versionMatch[1] : 'Unknown';
    
    const fileName = 'drawing.dxf';
    
    // 创建组件列表 - DXF中通常是图形实体而非3D组件
    const components = this.generateSampleComponents(8, 'drawing');
    
    // 从DXF内容中解析图层
    const layerMatches = headerText.matchAll(/\$LAYER\s*\n\s*2\s*\n\s*([^\n]+)/g);
    const layers: string[] = [];
    for (const match of layerMatches) {
      if (match[1]) layers.push(match[1]);
    }
    
    // 如果没有找到图层，添加一些默认图层
    if (layers.length === 0) {
      layers.push('0', '图框', '尺寸标注', '文字注释', '轮廓线');
    }
    
    // 计算实体数量
    const entities: CADEntityMap = {
      'LINE': 280,
      'CIRCLE': 35,
      'ARC': 42,
      'TEXT': 95,
      'DIMENSION': 65,
      'POLYLINE': 30,
      'BLOCK': 12,
      'HATCH': 15
    };
    
    // DXF通常没有材质
    const materials = [];
    
    // 组装结果
    return {
      fileId: new Date().getTime().toString(),
      fileName,
      fileType: 'dxf',
      components,
      layers,
      entities,
      materials,
      dimensions: {
        width: 841,
        height: 594,
        unit: 'mm'
      },
      metadata: {
        format: 'DXF',
        version,
        creationDate: new Date().toISOString(),
        description: '使用高级解析器的DXF文件解析结果',
        boundingBox: {
          min: [0, 0, 0],
          max: [841, 594, 0]
        },
        units: 'mm'
      }
    };
  }
  
  /**
   * 解析STL文件
   */
  private async parseSTL(buffer: ArrayBuffer): Promise<CADAnalysisResult> {
    // 在实际项目中，这里应该使用专业的STL解析库
    
    // 此处为模拟实现
    console.log('解析STL文件，大小:', buffer.byteLength, '字节');
    
    // 检查STL类型(二进制或ASCII)
    const view = new Uint8Array(buffer);
    let isBinary = true;
    
    // 检查开头是否有ASCII关键字"solid"
    if (view[0] === 115 && view[1] === 111 && view[2] === 108 && view[3] === 105 && view[4] === 100) {
      isBinary = false;
    }
    
    // 提取三角形数量
    let triangleCount = 0;
    if (isBinary) {
      // 二进制STL中，三角形数量存储在header后面的4个字节中
      const dataView = new DataView(buffer);
      triangleCount = dataView.getUint32(80, true);
    } else {
      // ASCII STL需要计算"facet"关键字出现的次数
      const text = new TextDecoder().decode(buffer);
      triangleCount = (text.match(/facet/g) || []).length;
    }
    
    const fileName = 'model.stl';
    
    // 创建组件列表
    const components = this.generateSampleComponents(1, 'mesh');
    
    // STL没有图层概念
    const layers = ['默认层'];
    
    // 计算实体数量
    const entities: CADEntityMap = {
      'TRIANGLE': triangleCount,
      'VERTEX': triangleCount * 3
    };
    
    // STL通常没有材质信息
    const materials = [{ name: '默认材质', color: '#CCCCCC' }];
    
    // 组装结果
    return {
      fileId: new Date().getTime().toString(),
      fileName,
      fileType: 'stl',
      components,
      layers,
      entities,
      materials,
      dimensions: {
        width: 150,
        height: 100,
        depth: 50,
        unit: 'mm'
      },
      metadata: {
        format: 'STL',
        version: isBinary ? 'Binary' : 'ASCII',
        creationDate: new Date().toISOString(),
        description: `STL网格模型，包含${triangleCount}个三角形`,
        boundingBox: {
          min: [-75, -50, -25],
          max: [75, 50, 25]
        },
        units: 'mm',
        triangleCount
      }
    };
  }
  
  /**
   * 解析OBJ文件
   */
  private async parseOBJ(buffer: ArrayBuffer): Promise<CADAnalysisResult> {
    // 在实际项目中，这里应该使用专业的OBJ解析库
    
    // 此处为模拟实现
    console.log('解析OBJ文件，大小:', buffer.byteLength, '字节');
    
    // 提取OBJ文件内容
    const textDecoder = new TextDecoder('utf-8');
    const content = textDecoder.decode(buffer);
    
    // 提取基本统计信息
    const vertexCount = (content.match(/^v\s/gm) || []).length;
    const faceCount = (content.match(/^f\s/gm) || []).length;
    const normalCount = (content.match(/^vn\s/gm) || []).length;
    const textureCount = (content.match(/^vt\s/gm) || []).length;
    
    // 检查材质库引用
    const mtlLibMatches = content.match(/^mtllib\s+(.+)$/m);
    const hasMaterialLib = !!mtlLibMatches;
    
    const fileName = 'model.obj';
    
    // 创建组件列表
    const components = this.generateSampleComponents(3, 'mesh');
    
    // 提取对象名称作为"图层"
    const objectNames = content.match(/^o\s+(.+)$/gm) || ['默认对象'];
    const layers = objectNames.map(name => name.replace(/^o\s+/, ''));
    
    // 如果没有找到对象名，添加默认图层
    if (layers.length === 0) {
      layers.push('默认层');
    }
    
    // 计算实体数量
    const entities: CADEntityMap = {
      'VERTEX': vertexCount,
      'FACE': faceCount,
      'NORMAL': normalCount,
      'TEXTURE_COORD': textureCount
    };
    
    // 生成材质列表
    const materials = hasMaterialLib ? 
      this.generateSampleMaterials() : 
      [{ name: '默认材质', color: '#DDDDDD' }];
    
    // 组装结果
    return {
      fileId: new Date().getTime().toString(),
      fileName,
      fileType: 'obj',
      components,
      layers,
      entities,
      materials,
      dimensions: {
        width: 200,
        height: 150,
        depth: 100,
        unit: 'mm'
      },
      metadata: {
        format: 'OBJ',
        version: 'Standard',
        creationDate: new Date().toISOString(),
        description: `OBJ网格模型，包含${vertexCount}个顶点和${faceCount}个面`,
        boundingBox: {
          min: [-100, -75, -50],
          max: [100, 75, 50]
        },
        units: 'mm',
        vertexCount,
        faceCount,
        hasMaterialLib
      }
    };
  }
  
  /**
   * 提取拓扑关系
   */
  private extractTopology(result: CADAnalysisResult): any {
    // 在实际项目中，这里应该基于解析的几何数据提取拓扑关系
    
    // 此处返回模拟数据
    return {
      faceCount: result.entities['FACE'] || result.entities['ADVANCED_FACE'] || 0,
      edgeCount: result.entities['EDGE'] || result.entities['EDGE_CURVE'] || 0,
      vertexCount: result.entities['VERTEX'] || result.entities['VERTEX_POINT'] || 0,
      shellCount: result.entities['SHELL'] || result.entities['CLOSED_SHELL'] || 0,
      relationshipMap: {
        // 拓扑关系映射
      }
    };
  }
  
  /**
   * 提取特征
   */
  private extractFeatures(result: CADAnalysisResult): any {
    // 在实际项目中，这里应该识别和提取CAD模型中的特征
    
    // 此处返回模拟数据
    return {
      holeCount: Math.floor(Math.random() * 10),
      filletCount: Math.floor(Math.random() * 15),
      chamferCount: Math.floor(Math.random() * 8),
      threadCount: Math.floor(Math.random() * 5),
      features: [
        { type: '孔', count: 6, parameters: { diameter: '10mm', depth: '25mm' } },
        { type: '倒角', count: 4, parameters: { distance: '2mm', angle: '45°' } },
        { type: '圆角', count: 8, parameters: { radius: '5mm' } }
      ]
    };
  }
  
  /**
   * 计算质量属性
   */
  private calculateMassProperties(result: CADAnalysisResult): any {
    // 在实际项目中，这里应该计算质量、体积、重心等属性
    
    // 此处返回模拟数据
    const volume = Math.random() * 1000000; // 立方毫米
    const density = 7.85; // 克/立方厘米 (钢)
    const mass = volume / 1000 * density; // 质量(克)
    
    return {
      volume: volume.toFixed(2), // 立方毫米
      mass: mass.toFixed(2), // 克
      centerOfMass: [
        (Math.random() * 20 - 10).toFixed(2),
        (Math.random() * 20 - 10).toFixed(2),
        (Math.random() * 20 - 10).toFixed(2)
      ],
      momentOfInertia: [
        (Math.random() * 1000).toFixed(2),
        (Math.random() * 1000).toFixed(2),
        (Math.random() * 1000).toFixed(2)
      ],
      density: density.toFixed(2) // 克/立方厘米
    };
  }
  
  /**
   * 构建装配结构
   */
  private buildAssemblyStructure(components: CADComponent[]): any {
    // 在实际项目中，这里应该分析组件之间的关系构建装配结构
    
    // 此处返回模拟数据
    if (components.length <= 1) {
      return null; // 单个组件没有装配结构
    }
    
    // 构建简单的树形装配结构
    const rootAssembly = {
      id: 'assembly-root',
      name: '主装配体',
      type: 'assembly',
      children: [] as any[]
    };
    
    // 第一级子装配
    const subAssemblies = [
      {
        id: 'assembly-1',
        name: '子装配体 1',
        type: 'assembly',
        children: [] as any[]
      },
      {
        id: 'assembly-2',
        name: '子装配体 2',
        type: 'assembly',
        children: [] as any[]
      }
    ];
    
    // 为子装配添加组件
    for (let i = 0; i < components.length; i++) {
      const component = components[i];
      const componentNode = {
        id: `component-${i}`,
        name: component.name,
        type: 'component',
        componentId: component.id
      };
      
      if (i % 3 === 0) {
        // 直接添加到根装配
        rootAssembly.children.push(componentNode);
      } else if (i % 3 === 1) {
        // 添加到第一个子装配
        subAssemblies[0].children.push(componentNode);
      } else {
        // 添加到第二个子装配
        subAssemblies[1].children.push(componentNode);
      }
    }
    
    // 将子装配添加到根装配
    rootAssembly.children.push(...subAssemblies);
    
    return rootAssembly;
  }
  
  /**
   * 生成示例组件 - 辅助方法
   */
  private generateSampleComponents(count: number, type: 'solid' | 'mesh' | 'drawing' = 'solid'): CADComponent[] {
    const components: CADComponent[] = [];
    
    const componentTypes = type === 'solid' 
      ? ['壳体', '轴', '齿轮', '支架', '盖板', '连接件', '托架', '套筒', '法兰', '轴承座']
      : type === 'mesh'
      ? ['网格对象', '壳体', '模型', '部件']
      : ['图框', '标题栏', '视图', '明细表', '符号', '图例'];
    
    for (let i = 0; i < count; i++) {
      const componentType = componentTypes[i % componentTypes.length];
      const component: CADComponent = {
        id: `component-${i + 1}`,
        name: `${componentType} ${i + 1}`,
        type: type === 'drawing' ? 'drawing' : (type === 'mesh' ? 'mesh' : 'solid'),
        visible: true,
        position: type === 'drawing' ? [0, 0, 0] : [
          Math.round((Math.random() * 200 - 100) * 10) / 10,
          Math.round((Math.random() * 200 - 100) * 10) / 10,
          Math.round((Math.random() * 200 - 100) * 10) / 10
        ],
        material: `材质${i % 5 + 1}`,
        metadata: {
          createdBy: 'CAD系统',
          creationDate: new Date().toISOString(),
          lastModified: new Date().toISOString(),
          version: '1.0'
        }
      };
      
      components.push(component);
    }
    
    return components;
  }
  
  /**
   * 生成示例材质 - 辅助方法
   */
  private generateSampleMaterials(): CADMaterial[] {
    return [
      { name: '钢', color: '#A0A0A0', density: 7.85, properties: { 'elastic_modulus': '210 GPa', 'yield_strength': '250 MPa' } },
      { name: '铝', color: '#D6D6D6', density: 2.7, properties: { 'elastic_modulus': '69 GPa', 'yield_strength': '95 MPa' } },
      { name: '铜', color: '#B87333', density: 8.96, properties: { 'elastic_modulus': '110 GPa', 'yield_strength': '70 MPa' } },
      { name: '塑料', color: '#1E90FF', density: 0.95, properties: { 'elastic_modulus': '2 GPa', 'yield_strength': '30 MPa' } },
      { name: '橡胶', color: '#333333', density: 1.52, properties: { 'elastic_modulus': '0.05 GPa', 'hardness': '60 Shore A' } }
    ];
  }
  
  /**
   * 计算复杂度分数
   */
  private calculateComplexityScore(result: CADAnalysisResult): number {
    // 计算总实体数
    const totalEntities = Object.values(result.entities).reduce((sum, count) => sum + count, 0);
    
    // 计算实体类型数
    const entityTypeCount = Object.keys(result.entities).length;
    
    // 计算分数 (0-100)
    let score = 0;
    
    // 基于实体总数 (最高40分)
    if (totalEntities <= 100) score += 10;
    else if (totalEntities <= 1000) score += 20;
    else if (totalEntities <= 10000) score += 30;
    else score += 40;
    
    // 基于实体类型多样性 (最高20分)
    score += Math.min(20, entityTypeCount * 2);
    
    // 基于组件数量 (最高20分)
    const componentCount = result.components.length;
    if (componentCount <= 1) score += 5;
    else if (componentCount <= 5) score += 10;
    else if (componentCount <= 15) score += 15;
    else score += 20;
    
    // 基于图层数量 (最高20分)
    const layerCount = result.layers.length;
    if (layerCount <= 1) score += 5;
    else if (layerCount <= 5) score += 10;
    else if (layerCount <= 15) score += 15;
    else score += 20;
    
    return score;
  }
}

// 各种格式的处理函数实现
async function processDXF(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  const dxfParser = new DXFParser();
  return dxfParser.parse(fileData, options);
}

async function processDWG(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  // DWG需要特殊处理，这里可以使用转换服务或第三方库
  // 例如使用AutoCAD Web API或其他服务
  throw new Error('DWG格式需要专业处理，当前使用转换API');
}

async function processSTEP(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  // STEP处理需要专门的库如OCCJs或转换服务
  // 返回基本分析结果
  return createBaseResult(fileData, 'step', options);
}

async function processIGES(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  // IGES处理
  return createBaseResult(fileData, 'iges', options);
}

async function processSTL(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  if (typeof window === 'undefined') {
    return createBaseResult(fileData, 'stl', options);
  }
  
  // 使用Three.js解析STL
  const loader = new STLLoader();
  const geometry = await loadGeometry(loader, fileData);
  
  return createResultFromGeometry(fileData, 'stl', geometry, options);
}

async function processOBJ(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  if (typeof window === 'undefined') {
    return createBaseResult(fileData, 'obj', options);
  }
  
  const loader = new OBJLoader();
  const object = await loadObject(loader, fileData);
  
  return createResultFromObject(fileData, 'obj', object, options);
}

async function processFBX(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  if (typeof window === 'undefined') {
    return createBaseResult(fileData, 'fbx', options);
  }
  
  const loader = new FBXLoader();
  const object = await loadObject(loader, fileData);
  
  return createResultFromObject(fileData, 'fbx', object, options);
}

async function processGLTF(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  if (typeof window === 'undefined') {
    return createBaseResult(fileData, 'gltf', options);
  }
  
  const loader = new GLTFLoader();
  const gltf = await loadGLTF(loader, fileData);
  
  return createResultFromGLTF(fileData, 'gltf', gltf, options);
}

async function processCOLLADA(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  if (typeof window === 'undefined') {
    return createBaseResult(fileData, 'dae', options);
  }
  
  const loader = new ColladaLoader();
  const collada = await loadCollada(loader, fileData);
  
  return createResultFromCollada(fileData, 'dae', collada, options);
}

async function processIFC(fileData: File | ArrayBuffer, options: ParserOptions): Promise<CADAnalysisResult> {
  if (typeof window === 'undefined') {
    return createBaseResult(fileData, 'ifc', options);
  }
  
  // IFC需要特殊处理，使用web-ifc库
  const loader = new IFCLoader();
  await loader.ifcManager.setWasmPath('/wasm/');
  const scene = new THREE.Scene();
  
  const url = fileData instanceof File 
    ? URL.createObjectURL(fileData) 
    : URL.createObjectURL(new Blob([fileData]));
    
  await loader.load(url, (ifcModel) => {
    scene.add(ifcModel);
  });
  
  // 分析IFC模型
  const result = analyzeIFCScene(scene);
  URL.revokeObjectURL(url);
  
  return createResultFromIFCAnalysis(fileData, result, options);
}

// 辅助：统一构造完整的 CADAnalysisResult 结构
function createResultFromGeometry(
  fileData: File | ArrayBuffer,
  fileType: string,
  geometry: THREE.BufferGeometry,
  options: ParserOptions
): CADAnalysisResult {
  const fileName = fileData instanceof File ? fileData.name : `unknown.${fileType}`;
  const fileSize = fileData instanceof File ? fileData.size : (fileData as ArrayBuffer).byteLength;
  const fileId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    fileId,
    id: fileId,
    fileName,
    fileType,
    fileSize,
    url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
    entities: { meshes: 1 },
    layers: ['默认'],
    dimensions: { width: 0, height: 0, unit: 'mm' },
    metadata: {
      vertices: geometry.attributes?.position?.count ?? 0,
      boundingBox: geometry.boundingBox ? {
        min: [geometry.boundingBox.min.x, geometry.boundingBox.min.y, geometry.boundingBox.min.z],
        max: [geometry.boundingBox.max.x, geometry.boundingBox.max.y, geometry.boundingBox.max.z]
      } : undefined
    },
    components: [],
    materials: []
  };
}

async function loadObject(loader: any, fileData: File | ArrayBuffer): Promise<THREE.Object3D> {
  return new Promise((resolve, reject) => {
    try {
      if (fileData instanceof File) {
        const url = URL.createObjectURL(fileData);
        loader.load(
          url,
          (object: THREE.Object3D) => {
            URL.revokeObjectURL(url);
            resolve(object);
          },
          undefined,
          (error: any) => {
            URL.revokeObjectURL(url);
            reject(error);
          }
        );
      } else {
        // 某些加载器不支持直接 parse 二进制对象，退回基础结果
        reject(new Error('Loader does not support ArrayBuffer parse for this format'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

function createResultFromObject(
  fileData: File | ArrayBuffer,
  fileType: string,
  object: THREE.Object3D,
  options: ParserOptions
): CADAnalysisResult {
  const box = new THREE.Box3().setFromObject(object);
  const geometryInfo = { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] };
  const fileName = fileData instanceof File ? fileData.name : `unknown.${fileType}`;
  const fileSize = fileData instanceof File ? fileData.size : (fileData as ArrayBuffer).byteLength;
  const fileId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    fileId,
    id: fileId,
    fileName,
    fileType,
    fileSize,
    url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
    entities: { meshes: 1 },
    layers: ['默认'],
    dimensions: { width: 0, height: 0, unit: 'mm' },
    metadata: { boundingBox: geometryInfo },
    components: [],
    materials: []
  };
}

async function loadGLTF(loader: GLTFLoader, fileData: File | ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      if (fileData instanceof File) {
        const url = URL.createObjectURL(fileData);
        loader.load(
          url,
          (gltf: any) => {
            URL.revokeObjectURL(url);
            resolve(gltf);
          },
          undefined,
          (error: any) => {
            URL.revokeObjectURL(url);
            reject(error);
          }
        );
      } else {
        reject(new Error('GLTFLoader does not support ArrayBuffer parse directly in this context'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

function createResultFromGLTF(
  fileData: File | ArrayBuffer,
  fileType: string,
  gltf: any,
  options: ParserOptions
): CADAnalysisResult {
  const scene: THREE.Scene = gltf.scene;
  const box = new THREE.Box3().setFromObject(scene);
  const fileName = fileData instanceof File ? fileData.name : `unknown.${fileType}`;
  const fileSize = fileData instanceof File ? fileData.size : (fileData as ArrayBuffer).byteLength;
  const fileId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    fileId,
    id: fileId,
    fileName,
    fileType,
    fileSize,
    url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
    entities: { meshes: 1 },
    layers: ['默认'],
    dimensions: { width: 0, height: 0, unit: 'mm' },
    metadata: {
      boundingBox: { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] }
    },
    components: [],
    materials: []
  };
}

async function loadCollada(loader: ColladaLoader, fileData: File | ArrayBuffer): Promise<any> {
  return new Promise((resolve, reject) => {
    try {
      if (fileData instanceof File) {
        const url = URL.createObjectURL(fileData);
        loader.load(
          url,
          (collada: any) => {
            URL.revokeObjectURL(url);
            resolve(collada);
          },
          undefined,
          (error: any) => {
            URL.revokeObjectURL(url);
            reject(error);
          }
        );
      } else {
        reject(new Error('ColladaLoader does not support ArrayBuffer parse directly'));
      }
    } catch (err) {
      reject(err);
    }
  });
}

function createResultFromCollada(
  fileData: File | ArrayBuffer,
  fileType: string,
  collada: any,
  options: ParserOptions
): CADAnalysisResult {
  const scene: THREE.Scene = collada.scene;
  const box = new THREE.Box3().setFromObject(scene);
  const fileName = fileData instanceof File ? fileData.name : `unknown.${fileType}`;
  const fileSize = fileData instanceof File ? fileData.size : (fileData as ArrayBuffer).byteLength;
  const fileId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    fileId,
    id: fileId,
    fileName,
    fileType,
    fileSize,
    url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
    entities: { meshes: 1 },
    layers: ['默认'],
    dimensions: { width: 0, height: 0, unit: 'mm' },
    metadata: {
      boundingBox: { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] }
    },
    components: [],
    materials: []
  };
}

function analyzeIFCScene(scene: THREE.Scene): any {
  const box = new THREE.Box3().setFromObject(scene);
  return {
    boundingBox: { min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] },
    elementCount: scene.children.length
  };
}

function createResultFromIFCAnalysis(
  fileData: File | ArrayBuffer,
  analysis: any,
  options: ParserOptions
): CADAnalysisResult {
  const fileType = 'ifc';
  const fileName = fileData instanceof File ? fileData.name : `unknown.${fileType}`;
  const fileSize = fileData instanceof File ? fileData.size : (fileData as ArrayBuffer).byteLength;
  const fileId = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return {
    fileId,
    id: fileId,
    fileName,
    fileType,
    fileSize,
    url: fileData instanceof File ? URL.createObjectURL(fileData) : '',
    entities: { meshes: analysis.elementCount ?? 0 },
    layers: ['默认'],
    dimensions: { width: 0, height: 0, unit: 'mm' },
    metadata: { boundingBox: analysis.boundingBox },
    components: [],
    materials: []
  };
}

// 修正：基础结果必须含 fileId/fileSize
function createBaseResult(fileData: File | ArrayBuffer, fileType: string, options: ParserOptions): CADAnalysisResult {
  const id = Date.now().toString();
  const fileName = fileData instanceof File ? fileData.name : `unknown.${fileType}`;
  const fileSize = fileData instanceof File ? fileData.size : (fileData as ArrayBuffer).byteLength;
  const url = fileData instanceof File ? URL.createObjectURL(fileData) : '';
  return {
    fileId: id,
    id,
    fileName,
    fileType,
    fileSize,
    url,
    entities: {
      lines: 0,
      circles: 0,
      arcs: 0,
      polylines: 0,
      text: 0,
      dimensions: 0,
      blocks: 0,
      meshes: 1,
    },
    layers: ['默认'],
    dimensions: {
      width: 0,
      height: 0,
      unit: 'mm',
    },
    metadata: {
      author: '未知',
      createdAt: new Date().toISOString(),
      software: '未知',
      version: '未知',
    },
    components: [],
    materials: [],
    devices: [],
    wiring: { totalLength: 0, details: [] },
    risks: [],
    aiInsights: {
      summary: `这是一个${fileType.toUpperCase()}格式的3D文件，需要专业CAD软件查看完整内容。`,
      recommendations: ['使用适合的CAD软件打开查看详细内容'],
    },
  };
}

// 加载几何体
async function loadGeometry(loader: any, fileData: File | ArrayBuffer): Promise<THREE.BufferGeometry> {
  return new Promise((resolve, reject) => {
    try {
      if (fileData instanceof File) {
        const url = URL.createObjectURL(fileData);
        loader.load(
          url,
          (geometry: THREE.BufferGeometry) => {
            URL.revokeObjectURL(url);
            resolve(geometry);
          },
          undefined,
          (error: any) => {
            URL.revokeObjectURL(url);
            reject(error);
          }
        );
      } else {
        const geometry = loader.parse(fileData);
        resolve(geometry);
      }
    } catch (error) {
      reject(error);
    }
  });
}

// 其他辅助函数实现...
// 省略其余加载函数和处理函数的实现 