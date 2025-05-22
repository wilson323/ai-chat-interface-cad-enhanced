# AG-UI 集成指南

本指南介绍如何在现有组件中使用AG-UI，同时保持UI和功能不变。

## 基本用法

1. 在现有聊天组件中导入AG-UI Hook：

\`\`\`tsx
import { useAgUIChat } from '@/hooks/use-ag-ui-chat';

function ChatComponent() {
  const { handleFastGPTStreamResponse, eventStream } = useAgUIChat();
  
  // 使用handleFastGPTStreamResponse替代原有的处理函数
  // 其余代码保持不变
}
\`\`\`

2. 添加事件监听器（可选）：

\`\`\`tsx
import { AgUIEventListener } from '@/components/ag-ui/event-listener';

function ChatComponent() {
  const { handleFastGPTStreamResponse, eventStream } = useAgUIChat();
  
  return (
    <>
      {/* 现有UI组件保持不变 */}
      <ExistingChatUI />
      
      {/* 添加不可见的事件监听器 */}
      <AgUIEventListener 
        eventStream={eventStream}
        onTextContent={(messageId, content) => {
          console.log('Received content:', content);
        }}
      />
    </>
  );
}
\`\`\`

## 高级用法

### 工具调用

如果需要支持工具调用，可以使用以下方式：

\`\`\`tsx
const { handleFastGPTStreamResponse } = useAgUIChat({
  onEvent: (event) => {
    if (event.type === 'TOOL_CALL_START') {
      // 处理工具调用开始
    } else if (event.type === 'TOOL_CALL_END') {
      // 处理工具调用结束
    }
  }
});
\`\`\`

### 状态同步

AG-UI支持状态同步，可以通过以下方式使用：

\`\`\`tsx
const [state, setState] = useState({});

const { handleFastGPTStreamResponse } = useAgUIChat({
  onEvent: (event) => {
    if (event.type === 'STATE_SNAPSHOT') {
      setState(event.snapshot);
    } else if (event.type === 'STATE_DELTA') {
      // 应用JSON Patch增量更新
      setState(applyPatch(state, event.delta));
    }
  }
});
\`\`\`

## 注意事项

1. AG-UI集成不会改变现有UI和功能
2. 可以逐步引入AG-UI功能，不需要一次性替换所有代码
3. 所有AG-UI事件处理都是可选的，可以根据需要选择使用
