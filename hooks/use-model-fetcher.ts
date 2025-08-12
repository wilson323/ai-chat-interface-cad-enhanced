import { useEffect,useState } from 'react';

import { useToast } from '@/hooks/use-toast';
import { isApiConfigured } from '@/lib/utils';
import type { FastGPTModel, VoiceModel } from '@/types/fastgpt';

export function useModelFetcher() {
  const { toast } = useToast();
  const [models, setModels] = useState<FastGPTModel[]>([]);
  const [voiceModels, setVoiceModels] = useState<VoiceModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    if (isInitialized) return;

    const getModels = async () => {
      try {
        setIsLoadingModels(true);
        const apiConfigured = isApiConfigured();
        if (!apiConfigured) {
          console.log("API not configured, using default models");
          setModels([
            { id: "qwen-turbo", name: "Qwen Turbo", provider: "qwen", maxTokens: 8192, price: 0, available: true, features: ["chat"] },
            { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", maxTokens: 16385, price: 0, available: true, features: ["chat"] },
            { id: "gpt-4", name: "GPT-4", provider: "openai", maxTokens: 8192, price: 0, available: true, features: ["chat"] },
          ]);
          setVoiceModels([
            { id: "default-voice", name: "Default Voice", gender: "female", language: ["zh-CN"], available: true },
            { id: "male-voice", name: "Male Voice", gender: "male", language: ["zh-CN"], available: true },
            { id: "female-voice", name: "Female Voice", gender: "female", language: ["zh-CN"], available: true },
          ]);
          return;
        }

        // Prefer calling our own API routes that proxy/back the FastGPT service
        const [modelsResp, voicesResp] = await Promise.all([
          fetch('/api/fastgpt/api/v1/models', { method: 'GET' }),
          fetch('/api/fastgpt/api/v1/voice/models', { method: 'GET' })
        ]);

        if (modelsResp.ok) {
          const modelList = await modelsResp.json().catch(() => ([]));
          setModels(Array.isArray(modelList) ? modelList : []);
        } else {
          throw new Error(`Get models failed: ${modelsResp.status}`);
        }

        if (voicesResp.ok) {
          const voiceModelList = await voicesResp.json().catch(() => ([]));
          setVoiceModels(Array.isArray(voiceModelList) ? voiceModelList : []);
        } else {
          // non-fatal: fall back to empty
          setVoiceModels([]);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to get model list:", error);
        toast({
          title: "Failed to get model list",
          description: "Unable to get available AI model list, using default models",
          variant: "destructive",
        });
        setModels([
          { id: "qwen-turbo", name: "Qwen Turbo", provider: "qwen", maxTokens: 8192, price: 0, available: true, features: ["chat"] },
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", provider: "openai", maxTokens: 16385, price: 0, available: true, features: ["chat"] },
          { id: "gpt-4", name: "GPT-4", provider: "openai", maxTokens: 8192, price: 0, available: true, features: ["chat"] },
        ]);
        setVoiceModels([
          { id: "default-voice", name: "Default Voice", gender: "female", language: ["zh-CN"], available: true },
          { id: "male-voice", name: "Male Voice", gender: "male", language: ["zh-CN"], available: true },
          { id: "female-voice", name: "Female Voice", gender: "female", language: ["zh-CN"], available: true },
        ]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    getModels();
  }, [toast, isInitialized]);

  return { models, voiceModels, isLoadingModels };
}
