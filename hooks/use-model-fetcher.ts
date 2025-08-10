import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import type { FastGPTModel, VoiceModel } from '@/types/fastgpt';
import FastGPTApi from '@/lib/api/fastgpt';
import { isApiConfigured } from '@/lib/utils';

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
            { id: "default-model", name: "Default Model", provider: "openai", maxTokens: 8192, price: 0, available: true, features: ["chat"] },
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

        const modelList = await FastGPTApi.getModels();
        setModels(Array.isArray(modelList) ? modelList : []);

        const voiceModelList = await FastGPTApi.getVoiceModels();
        setVoiceModels(Array.isArray(voiceModelList) ? voiceModelList : []);

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to get model list:", error);
        toast({
          title: "Failed to get model list",
          description: "Unable to get available AI model list, using default models",
          variant: "destructive",
        });
        setModels([
          { id: "default-model", name: "Default Model", provider: "openai", maxTokens: 8192, price: 0, available: true, features: ["chat"] },
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
