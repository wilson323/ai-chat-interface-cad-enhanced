export const DEFAULT_AGENT = {
  id: "default",
  name: "ZKTeco 助手",
  avatar: "/images/clean-assistant-avatar.png",
  description: "通用AI助手，可以回答各种问题",
  modelId: "gpt-3.5-turbo",
  status: "active" as const,
  type: "fastgpt" as const,
  config: {
    systemPrompt: "你是一个友好、专业的AI助手，随时准备帮助用户解决问题。",
    temperature: 0.7,
    maxTokens: 2000,
    fileUpload: false,
    speechToText: false,
    textToSpeech: false,
    avatarColor: "#6cb33f", // 添加默认头像颜色
    apiKey: "",
    baseUrl: "",
  },
}
