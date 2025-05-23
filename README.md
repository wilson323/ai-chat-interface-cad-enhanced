# AI Chat Interface with Enhanced CAD Analysis

This project is a comprehensive AI chat interface with specialized CAD file analysis capabilities. It allows users to upload, analyze, and discuss CAD files (both 2D and 3D) with an AI assistant.

## Key Features

### Chat Interface
- Real-time chat with AI assistants
- Multi-modal conversations with file sharing
- Context-aware responses with memory
- Customizable UI with themes

### CAD Analysis
- Support for multiple CAD file formats:
  - **2D**: DWG, DXF, PDF, SVG
  - **3D**: STEP/STP, IGES/IGS, STL, OBJ, GLTF/GLB
- Interactive 3D model viewer with rotation, zoom, and pan controls
- Detailed analysis of geometry, entities, and layers
- AI-assisted design insights and suggestions
- Shareable analysis results with public links
- Report generation in HTML and PDF formats

### System Features
- Robust file handling with validation and security checks
- Scheduled cleanup of temporary files
- Progress tracking for long-running operations
- Comprehensive error handling
- Metrics collection for performance monitoring

## Getting Started

### Prerequisites
- Node.js 18.x or later
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/yourusername/ai-chat-interface.git
cd ai-chat-interface
```

2. Install dependencies
```bash
npm install
# or
yarn
```

3. Set up environment variables
```bash
cp .env.example .env
# Edit .env with your configuration
```

4. Run the development server
```bash
npm run dev
# or
yarn dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser

## CAD Analyzer Usage

1. **Upload a CAD File**: In the chat interface, click the upload button and select a CAD file.
2. **View Analysis**: Once the file is processed, you'll see a summary of the analysis results.
3. **Interact with 3D Models**: For 3D files, you can rotate, zoom, and pan to examine the model.
4. **Generate Reports**: Create HTML or PDF reports with detailed analysis.
5. **Share Results**: Share analysis results with others via public links.
6. **Discuss with AI**: Ask the AI assistant about specific aspects of the design.

## Configuration

The CAD analyzer can be configured in `config/cad-analyzer.config.ts`, where you can adjust:

- Supported file types and formats
- File size limits
- Temporary file cleanup settings
- Parser configurations
- Analysis options

## Maintenance

Run the cleanup script periodically to remove old temporary files:

```bash
node scripts/cleanup.js
```

Options:
- `--dry-run`: Test without deleting files
- `--age=<hours>`: Clean files older than specified hours (default: 24)
- `--dir=<path>`: Clean only a specific directory
- `--verbose`: Show detailed logs

## License

[MIT](LICENSE) 