// CAD解析器工作线程
// 用于在后台处理大型CAD文件，避免主线程阻塞

// 处理消息
self.addEventListener('message', async (event) => {
  try {
    const { command, fileType, options, file } = event.data;
    
    if (command === 'parse') {
      // 发送进度更新
      self.postMessage({ type: 'progress', progress: 0 });
      
      // 根据文件类型选择解析方法
      let result;
      switch (fileType.toLowerCase()) {
        case 'dxf':
          result = await parseDXF(file, options);
          break;
        case 'dwg':
          result = await parseDWG(file, options);
          break;
        case 'step':
        case 'stp':
          result = await parseSTEP(file, options);
          break;
        case 'iges':
        case 'igs':
          result = await parseIGES(file, options);
          break;
        case 'stl':
          result = await parseSTL(file, options);
          break;
        case 'obj':
          result = await parseOBJ(file, options);
          break;
        case 'gltf':
        case 'glb':
          result = await parseGLTF(file, options);
          break;
        default:
          throw new Error(`不支持的文件类型: ${fileType}`);
      }
      
      // 发送最终结果
      self.postMessage({ type: 'complete', data: result });
    } else {
      throw new Error(`未知命令: ${command}`);
    }
  } catch (error) {
    self.postMessage({ 
      type: 'error', 
      error: error instanceof Error ? error.message : String(error) 
    });
  }
});

// 根据文件类型实现不同的解析函数
async function parseDXF(file, options) {
  // 实际实现应读取并解析DXF数据
  // 这里返回模拟数据作为演示
  await simulateProgress(30);
  return createBaseResult(file, 'dxf', options);
}

async function parseDWG(file, options) {
  // DWG需要专业处理
  await simulateProgress(40);
  return createBaseResult(file, 'dwg', options);
}

async function parseSTEP(file, options) {
  // STEP处理
  await simulateProgress(50);
  return createBaseResult(file, 'step', options);
}

async function parseIGES(file, options) {
  // IGES处理
  await simulateProgress(45);
  return createBaseResult(file, 'iges', options);
}

async function parseSTL(file, options) {
  // STL处理
  await simulateProgress(35);
  return createBaseResult(file, 'stl', options);
}

async function parseOBJ(file, options) {
  // OBJ处理
  await simulateProgress(30);
  return createBaseResult(file, 'obj', options);
}

async function parseGLTF(file, options) {
  // GLTF处理
  await simulateProgress(40);
  return createBaseResult(file, 'gltf', options);
}

// 创建基本结果对象
function createBaseResult(file, fileType, options) {
  const fileName = file.name || `未命名.${fileType}`;
  const fileSize = file.size || 0;
  
  // 生成随机实体数量以模拟解析结果
  const generateRandomCount = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  
  return {
    id: generateUUID(),
    fileName,
    fileType,
    fileSize,
    url: URL.createObjectURL ? URL.createObjectURL(file) : '',
    
    entities: {
      lines: generateRandomCount(100, 1000),
      circles: generateRandomCount(20, 200),
      arcs: generateRandomCount(10, 100),
      polylines: generateRandomCount(30, 300),
      text: generateRandomCount(5, 50),
      dimensions: generateRandomCount(10, 100),
      blocks: generateRandomCount(5, 30),
      // 3D特有
      faces: fileType.match(/step|stp|iges|igs|stl|obj|gltf|glb/) ? generateRandomCount(100, 1000) : 0,
      edges: fileType.match(/step|stp|iges|igs/) ? generateRandomCount(300, 3000) : 0,
      vertices: fileType.match(/step|stp|iges|igs|stl|obj/) ? generateRandomCount(200, 2000) : 0,
    },
    
    layers: generateRandomLayers(),
    
    dimensions: {
      width: generateRandomCount(100, 1000),
      height: generateRandomCount(100, 1000),
      depth: fileType.match(/step|stp|iges|igs|stl|obj|gltf|glb/) ? generateRandomCount(100, 1000) : undefined,
      unit: 'mm',
    },
    
    metadata: {
      author: '未知作者',
      createdAt: new Date().toISOString(),
      modifiedAt: new Date().toISOString(),
      software: '未知软件',
      version: '1.0',
    },
    
    devices: [],
    
    wiring: {
      totalLength: 0,
      details: [],
    },
    
    risks: [],
    
    aiInsights: {
      summary: '',
      recommendations: [],
    },
  };
}

// 生成随机图层名
function generateRandomLayers() {
  const layerPrefixes = ['Layer', '图层', '电气', '结构', '管道', '标注', '文字', '零件'];
  const count = Math.floor(Math.random() * 10) + 3;
  const layers = [];
  
  for (let i = 0; i < count; i++) {
    const prefix = layerPrefixes[Math.floor(Math.random() * layerPrefixes.length)];
    layers.push(`${prefix}_${i + 1}`);
  }
  
  return layers;
}

// 生成UUID
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// 模拟解析进度
async function simulateProgress(steps = 20) {
  const delay = 50;
  const increment = 100 / steps;
  
  for (let i = 0; i < steps; i++) {
    const progress = Math.min(Math.round(i * increment), 99);
    self.postMessage({ type: 'progress', progress });
    await new Promise(resolve => setTimeout(resolve, delay));
  }
} 