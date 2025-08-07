/**
 * @fileoverview useModelFetcher.ts
 * @description This file contains a custom hook for fetching the available AI and voice models.
 * @description 此文件包含用于获取可用的AI和语音模型的自定义钩子。
 */

import { useEffect, useState } from 'react';
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
            { id: "default-model", name: "Default Model", available: true },
            { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", available: true },
            { id: "gpt-4", name: "GPT-4", available: true },
          ]);
          setVoiceModels([
            { id: "default-voice", name: "Default Voice", gender: "female" },
            { id: "male-voice", name: "Male Voice", gender: "male" },
            { id: "female-voice", name: "Female Voice", gender: "female" },
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
          { id: "default-model", name: "Default Model", available: true },
          { id: "gpt-3.5-turbo", name: "GPT-3.5 Turbo", available: true },
          { id: "gpt-4", name: "GPT-4", available: true },
        ]);
        setVoiceModels([
          { id: "default-voice", name: "Default Voice", gender: "female" },
          { id: "male-voice", name: "Male Voice", gender: "male" },
          { id: "female-voice", name: "Female Voice", gender: "female" },
        ]);
      } finally {
        setIsLoadingModels(false);
      }
    };

    getModels();
  }, [toast, isInitialized]);

  return { models, voiceModels, isLoadingModels };
}
