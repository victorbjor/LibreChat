import { shouldUseEntraId, createEntraIdCredential, createEntraIdAzureOptions, validateEntraIdConfiguration } from './entraId';
import type { AzureOptions } from '~/types';

// Mock environment variables
const originalEnv = process.env;

describe('Entra ID Authentication Utilities', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  describe('shouldUseEntraId', () => {
    it('should return true when AZURE_OPENAI_USE_ENTRA_ID is set to true', () => {
      process.env.AZURE_OPENAI_USE_ENTRA_ID = 'true';
      expect(shouldUseEntraId()).toBe(true);
    });

    it('should return false when AZURE_OPENAI_USE_ENTRA_ID is not set', () => {
      delete process.env.AZURE_OPENAI_USE_ENTRA_ID;
      expect(shouldUseEntraId()).toBe(false);
    });

    it('should return false when AZURE_OPENAI_USE_ENTRA_ID is set to false', () => {
      process.env.AZURE_OPENAI_USE_ENTRA_ID = 'false';
      expect(shouldUseEntraId()).toBe(false);
    });
  });

  describe('createEntraIdCredential', () => {
    it('should create a DefaultAzureCredential instance', () => {
      const credential = createEntraIdCredential();
      expect(credential).toBeDefined();
      expect(typeof credential.getToken).toBe('function');
    });
  });

  describe('createEntraIdAzureOptions', () => {
    it('should create Azure options with empty API key for Entra ID', () => {
      const baseOptions: Omit<AzureOptions, 'azureOpenAIApiKey'> = {
        azureOpenAIApiInstanceName: 'test-instance',
        azureOpenAIApiDeploymentName: 'test-deployment',
        azureOpenAIApiVersion: '2024-12-01-preview',
      };

      const result = createEntraIdAzureOptions(baseOptions);

      expect(result).toEqual({
        ...baseOptions,
        azureOpenAIApiKey: '',
      });
    });
  });

  describe('validateEntraIdConfiguration', () => {
    it('should return valid when Azure environment variables are present', () => {
      process.env.AZURE_CLIENT_ID = 'test-client-id';
      process.env.AZURE_CLIENT_SECRET = 'test-client-secret';
      process.env.AZURE_TENANT_ID = 'test-tenant-id';

      const result = validateEntraIdConfiguration();
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid when MSI endpoint is present', () => {
      process.env.MSI_ENDPOINT = 'http://169.254.169.254/metadata/identity/oauth2/token';

      const result = validateEntraIdConfiguration();
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return valid when Azure CLI is configured', () => {
      process.env.AZURE_CONFIG_DIR = '/home/user/.azure';

      const result = validateEntraIdConfiguration();
      expect(result.isValid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return invalid when no authentication method is available', () => {
      delete process.env.AZURE_CLIENT_ID;
      delete process.env.AZURE_CLIENT_SECRET;
      delete process.env.AZURE_TENANT_ID;
      delete process.env.MSI_ENDPOINT;
      delete process.env.IDENTITY_ENDPOINT;
      delete process.env.AZURE_CONFIG_DIR;
      delete process.env.AZURE_CONFIG_PATH;

      const result = validateEntraIdConfiguration();
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Entra ID authentication requires');
    });
  });
});
