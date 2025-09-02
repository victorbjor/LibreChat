import { DefaultAzureCredential } from '@azure/identity';
import type { AzureOptions } from '~/types';

/**
 * Creates an Azure credential for Entra ID authentication.
 * Uses DefaultAzureCredential which supports multiple authentication methods:
 * - Managed Identity (when running in Azure)
 * - Service Principal (when environment variables are set)
 * - Azure CLI (for local development)
 * - Visual Studio Code (for local development)
 * 
 * @returns DefaultAzureCredential instance
 */
export const createEntraIdCredential = (): DefaultAzureCredential => {
  return new DefaultAzureCredential();
};

/**
 * Creates Azure options for Entra ID authentication.
 * This replaces the API key with credential-based authentication.
 * 
 * @param baseOptions - Base Azure options (without API key)
 * @returns Azure options configured for Entra ID authentication
 */
export const createEntraIdAzureOptions = (baseOptions: Omit<AzureOptions, 'azureOpenAIApiKey'>): AzureOptions => {
  return {
    ...baseOptions,
    // For Entra ID authentication, we don't need an API key
    // The credential will be used for authentication instead
    azureOpenAIApiKey: '', // Empty string as placeholder
  };
};

/**
 * Validates that Entra ID authentication is properly configured.
 * Checks for required environment variables and Azure context.
 * 
 * @returns Object with validation result and error message if invalid
 */
export const validateEntraIdConfiguration = (): { isValid: boolean; error?: string } => {
  // Check if we're running in Azure (managed identity available)
  const isAzureEnvironment = process.env.AZURE_CLIENT_ID || 
                            process.env.AZURE_CLIENT_SECRET || 
                            process.env.AZURE_TENANT_ID ||
                            process.env.MSI_ENDPOINT ||
                            process.env.IDENTITY_ENDPOINT;

  if (!isAzureEnvironment) {
    // For local development, check if Azure CLI is available
    const hasAzureCli = process.env.AZURE_CONFIG_DIR || process.env.AZURE_CONFIG_PATH;
    if (!hasAzureCli) {
      return {
        isValid: false,
        error: 'Entra ID authentication requires either Azure environment variables (AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, AZURE_TENANT_ID) or Azure CLI to be configured for local development.'
      };
    }
  }

  return { isValid: true };
};
