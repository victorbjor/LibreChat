import { ErrorTypes, EModelEndpoint, mapModelToAzureConfig } from 'librechat-data-provider';
import type {
  InitializeOpenAIOptionsParams,
  OpenAIOptionsResult,
  OpenAIConfigOptions,
  UserKeyValues,
} from '~/types';
import { createHandleLLMNewToken } from '~/utils/generators';
import { getAzureCredentials, shouldUseEntraId } from '~/utils/azure';
import {
  createEntraIdCredential,
  createEntraIdAzureOptions,
  validateEntraIdConfiguration,
} from '~/utils/entraId';
import { isUserProvided } from '~/utils/common';
import { resolveHeaders } from '~/utils/env';
import { getOpenAIConfig } from './llm';

/**
 * Initializes OpenAI options for agent usage. This function always returns configuration
 * options and never creates a client instance (equivalent to optionsOnly=true behavior).
 *
 * @param params - Configuration parameters
 * @returns Promise resolving to OpenAI configuration options
 * @throws Error if API key is missing or user key has expired
 */
export const initializeOpenAI = async ({
  req,
  appConfig,
  overrideModel,
  endpointOption,
  overrideEndpoint,
  getUserKeyValues,
  checkUserKeyExpiry,
}: InitializeOpenAIOptionsParams): Promise<OpenAIOptionsResult> => {
  const { PROXY, OPENAI_API_KEY, AZURE_API_KEY, OPENAI_REVERSE_PROXY, AZURE_OPENAI_BASEURL } =
    process.env;

  const { key: expiresAt } = req.body;
  const modelName = overrideModel ?? req.body.model;
  const endpoint = overrideEndpoint ?? req.body.endpoint;

  if (!endpoint) {
    throw new Error('Endpoint is required');
  }

  const credentials = {
    [EModelEndpoint.openAI]: OPENAI_API_KEY,
    [EModelEndpoint.azureOpenAI]: AZURE_API_KEY,
  };

  const baseURLOptions = {
    [EModelEndpoint.openAI]: OPENAI_REVERSE_PROXY,
    [EModelEndpoint.azureOpenAI]: AZURE_OPENAI_BASEURL,
  };

  const userProvidesKey = isUserProvided(credentials[endpoint as keyof typeof credentials]);
  const userProvidesURL = isUserProvided(baseURLOptions[endpoint as keyof typeof baseURLOptions]);

  let userValues: UserKeyValues | null = null;
  if (expiresAt && (userProvidesKey || userProvidesURL)) {
    checkUserKeyExpiry(expiresAt, endpoint);
    userValues = await getUserKeyValues({ userId: req.user.id, name: endpoint });
  }

  let apiKey = userProvidesKey
    ? userValues?.apiKey
    : credentials[endpoint as keyof typeof credentials];
  const baseURL = userProvidesURL
    ? userValues?.baseURL
    : baseURLOptions[endpoint as keyof typeof baseURLOptions];

  const clientOptions: OpenAIConfigOptions = {
    proxy: PROXY ?? undefined,
    reverseProxyUrl: baseURL || undefined,
    streaming: true,
  };

  const isAzureOpenAI = endpoint === EModelEndpoint.azureOpenAI;
  const azureConfig = isAzureOpenAI && appConfig.endpoints?.[EModelEndpoint.azureOpenAI];

  if (isAzureOpenAI && azureConfig) {
    const { modelGroupMap, groupMap } = azureConfig;
    const {
      azureOptions,
      baseURL: configBaseURL,
      headers = {},
      serverless,
    } = mapModelToAzureConfig({
      modelName: modelName || '',
      modelGroupMap,
      groupMap,
    });

    clientOptions.reverseProxyUrl = configBaseURL ?? clientOptions.reverseProxyUrl;
    clientOptions.headers = resolveHeaders({
      headers: { ...headers, ...(clientOptions.headers ?? {}) },
      user: req.user,
    });

    const groupName = modelGroupMap[modelName || '']?.group;
    if (groupName && groupMap[groupName]) {
      clientOptions.addParams = groupMap[groupName]?.addParams;
      clientOptions.dropParams = groupMap[groupName]?.dropParams;
    }

    // Check if Entra ID authentication should be used
    if (shouldUseEntraId()) {
      const validation = validateEntraIdConfiguration();
      if (!validation.isValid) {
        throw new Error(`Entra ID authentication configuration error: ${validation.error}`);
      }

      // For Entra ID authentication, we don't need an API key
      // The credential will be used for authentication instead
      apiKey = ''; // Empty string as placeholder for Entra ID
      clientOptions.azure = !serverless ? createEntraIdAzureOptions(azureOptions) : undefined;

      // Add Entra ID credential to client options
      clientOptions.azureCredential = createEntraIdCredential();
    } else {
      // Traditional API key authentication
      apiKey = azureOptions.azureOpenAIApiKey;
      clientOptions.azure = !serverless ? azureOptions : undefined;
    }

    if (serverless === true) {
      clientOptions.defaultQuery = azureOptions.azureOpenAIApiVersion
        ? { 'api-version': azureOptions.azureOpenAIApiVersion }
        : undefined;

      if (!clientOptions.headers) {
        clientOptions.headers = {};
      }

      // For serverless, we still need the API key in headers even with Entra ID
      if (shouldUseEntraId()) {
        // For Entra ID with serverless, we need to get a token and use it in the Authorization header
        const credential = createEntraIdCredential();
        const tokenResponse = await credential.getToken(
          'https://cognitiveservices.azure.com/.default',
        );
        clientOptions.headers['Authorization'] = `Bearer ${tokenResponse?.token || ''}`;
      } else {
        clientOptions.headers['api-key'] = apiKey;
      }
    }
  } else if (isAzureOpenAI) {
    // Handle legacy Azure configuration without group config
    if (shouldUseEntraId()) {
      const validation = validateEntraIdConfiguration();
      if (!validation.isValid) {
        throw new Error(`Entra ID authentication configuration error: ${validation.error}`);
      }

      const baseCredentials =
        userProvidesKey && userValues?.apiKey
          ? JSON.parse(userValues.apiKey)
          : getAzureCredentials();

      apiKey = ''; // Empty string as placeholder for Entra ID
      clientOptions.azure = createEntraIdAzureOptions(baseCredentials);
      clientOptions.azureCredential = createEntraIdCredential();
    } else {
      clientOptions.azure =
        userProvidesKey && userValues?.apiKey
          ? JSON.parse(userValues.apiKey)
          : getAzureCredentials();
      apiKey = clientOptions.azure?.azureOpenAIApiKey;
    }
  }

  // Skip API key validation for Entra ID authentication
  if (!shouldUseEntraId()) {
    if (userProvidesKey && !apiKey) {
      throw new Error(
        JSON.stringify({
          type: ErrorTypes.NO_USER_KEY,
        }),
      );
    }

    if (!apiKey) {
      throw new Error(`${endpoint} API Key not provided.`);
    }
  }

  const modelOptions = {
    ...endpointOption.model_parameters,
    model: modelName,
    user: req.user.id,
  };

  const finalClientOptions: OpenAIConfigOptions = {
    ...clientOptions,
    modelOptions,
  };

  const options = getOpenAIConfig(apiKey || '', finalClientOptions, endpoint);

  const openAIConfig = appConfig.endpoints?.[EModelEndpoint.openAI];
  const allConfig = appConfig.endpoints?.all;
  const azureRate = modelName?.includes('gpt-4') ? 30 : 17;

  let streamRate: number | undefined;

  if (isAzureOpenAI && azureConfig) {
    streamRate = azureConfig.streamRate ?? azureRate;
  } else if (!isAzureOpenAI && openAIConfig) {
    streamRate = openAIConfig.streamRate;
  }

  if (allConfig?.streamRate) {
    streamRate = allConfig.streamRate;
  }

  if (streamRate) {
    options.llmConfig.callbacks = [
      {
        handleLLMNewToken: createHandleLLMNewToken(streamRate),
      },
    ];
  }

  const result: OpenAIOptionsResult = {
    ...options,
    streamRate,
  };

  return result;
};
