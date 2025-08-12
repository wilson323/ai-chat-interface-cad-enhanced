import { Metadata } from 'next';

import { CADAnalyzerContainer } from '@/components/cad/CADAnalyzerContainer';

export const metadata: Metadata = {
  title: 'CAD解读智能体 - AI助手',
  description: '分析CAD文件，提取关键信息并生成3D可视化视图',
};

export default function CADAnalyzerPage() {
  return (
    <div className="max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 px-4 sm:px-6 lg:px-8 pt-6">
        CAD解读智能体
      </h1>
      
      <CADAnalyzerContainer />
    </div>
  );
}
