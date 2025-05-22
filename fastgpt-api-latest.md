# FastGPT 最新对话与历史记录 API 接口梳理（2024）

> 本文档由 AI 自动生成，供 AG-UI/NeuroGlass 项目全局对接 FastGPT 时查阅，确保接口一致性与数据流正确。

---

## 1. 对话接口（Chat API）

### 1.1 发起对话
- **接口**：`POST /api/v1/chat/completions`
- **Headers**：
  - `Authorization: Bearer fastgpt-xxxxxx`
  - `Content-Type: application/json`
- **Body 示例**：
```json
{
  "chatId": "my_chatId", // 可选，唯一标识对话窗口
  "stream": false,        // 是否流式返回
  "detail": false,        // 是否返回中间节点/详细信息
  "responseChatItemId": "my_responseChatItemId", // 可选，响应消息ID
  "variables": { "uid": "asdfadsfasfd2323", "name": "张三" }, // 可选
  "messages": [
    { "role": "user", "content": "导演是谁" }
  ]
}
```
- **说明**：
  - `chatId` 为空时不使用上下文，非空时自动关联历史。
  - `messages` 结构与 OpenAI GPT 接口一致。
  - `detail=true` 时返回节点状态、交互节点等详细信息。

### 1.2 交互节点响应
- **detail=true** 时，遇到交互节点会返回：
```json
{
  "interactive": {
    "type": "userSelect", // 或 userInput
    "params": { ... }
  }
}
```
- 前端需根据 type 渲染选择/表单，用户操作后再次调用本接口继续流程。

### 1.3 流式事件（SSE）
- **event: flowNodeStatus**：节点状态（如"AI对话"、"知识库搜索"等）
- **event: answer**：AI 回复内容
- **event: interactive**：交互节点
- **event: flowResponses**：节点完整响应

---

## 2. 历史记录接口（History API）

### 2.1 获取应用历史记录
- **接口**：`POST /api/core/chat/getHistories`
- **Body**：
```json
{
  "appId": "appId",
  "offset": 0,
  "pageSize": 20,
  "source": "api"
}
```
- **返回**：历史对话列表（含 chatId、title、updateTime 等）

### 2.2 修改/置顶/删除历史记录
- **修改标题/置顶**：`POST /api/core/chat/updateHistory`
- **删除单条**：`DELETE /api/core/chat/delHistory?chatId=xxx&appId=xxx`
- **清空全部**：`DELETE /api/core/chat/clearHistories?appId=xxx`

---

## 3. 对话记录接口（Record API）

### 3.1 获取对话初始化信息
- **接口**：`GET /api/core/chat/init?appId=xxx&chatId=xxx`

### 3.2 获取对话记录列表
- **接口**：`POST /api/core/chat/getPaginationRecords`
- **Body**：
```json
{
  "appId": "appId",
  "chatId": "chatId",
  "offset": 0,
  "pageSize": 10,
  "loadCustomFeedbacks": true
}
```
- **返回**：对话消息列表（含 dataId、obj: Human/AI、value、customFeedbacks 等）

### 3.3 获取单条对话运行详情
- **接口**：`GET /api/core/chat/getResData?appId=xxx&chatId=xxx&dataId=xxx`

### 3.4 删除对话记录
- **接口**：`DELETE /api/core/chat/item/delete?contentId=xxx&chatId=xxx&appId=xxx`

### 3.5 点赞/点踩
- **接口**：`POST /api/core/chat/feedback/updateUserFeedback`
- **Body**：
```json
{
  "appId": "appId",
  "chatId": "chatId",
  "dataId": "dataId",
  "userGoodFeedback": "yes" // 或 userBadFeedback
}
```

---

## 4. 交互节点继续运行
- 用户完成交互节点后，需再次调用 `/api/v1/chat/completions`，携带同一 chatId 和用户输入。

---

## 5. 参考文档
- [FastGPT OpenAPI 对话接口](https://doc.fastgpt.cn/docs/development/openapi/chat/)
- [FastGPT 历史记录接口](https://doc.fastgpt.cn/docs/development/openapi/chat/)

---

> 如需补充知识库、插件等接口，请参考 FastGPT 官方文档。 