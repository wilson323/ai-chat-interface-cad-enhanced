// 文件验证工具
import fs from 'fs/promises';

const DXF_HEADER = Buffer.from([0x41, 0x43, 0x31, 0x30]); // "AC10" 标记DXF文件
const STEP_HEADER = Buffer.from("ISO-10303-21", "utf-8");

export async function isCADFile(filePath: string, extension: string): Promise<boolean> {
  try {
    // 读取文件前512字节用于检查文件头
    const fileHandle = await fs.open(filePath, 'r');
    const { buffer } = await fileHandle.read(Buffer.alloc(512), 0, 512, 0);
    await fileHandle.close();
    
    switch(extension) {
      case 'dxf':
        // 检查DXF文件是否包含文本 "SECTION" 和 "ENTITIES"
        return buffer.includes("SECTION") && buffer.includes("ENTITIES");
      
      case 'dwg':
        // DWG文件需要专用库解析，这里简单检查是否为二进制文件
        return !buffer.toString('utf8', 0, 8).match(/^[\x00-\x7F]+$/);
      
      case 'step':
      case 'stp':
        // STEP文件包含 "ISO-10303-21" 标记
        return buffer.includes("ISO-10303-21");
      
      case 'iges':
      case 'igs':
        // IGES文件以特定格式开头
        return buffer.includes("S0000001") || buffer.toString('utf8', 0, 80).includes("IGES");
      
      default:
        return false;
    }
  } catch (error) {
    console.error("验证CAD文件失败:", error);
    return false;
  }
} 