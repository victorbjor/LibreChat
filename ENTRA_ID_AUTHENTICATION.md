# Entra ID Authentication for Azure OpenAI

This document describes the implementation of Entra ID (Azure AD) authentication for Azure OpenAI services in LibreChat, replacing traditional API key authentication with modern identity-based authentication.

## Overview

The Entra ID authentication feature allows LibreChat to authenticate with Azure OpenAI services using Azure managed identity or service principal credentials instead of API keys. This provides several benefits:

- **Enhanced Security**: No API keys to manage, rotate, or risk exposing
- **Corporate Integration**: Uses existing Entra ID infrastructure
- **Improved Compliance**: Clearer audit trails and access controls
- **Future-Proofing**: Aligns with Azure's recommended authentication practices

## Implementation Details

### Environment Configuration

The feature is controlled by the `AZURE_OPENAI_USE_ENTRA_ID` environment variable:

```bash
# Enable Entra ID authentication
AZURE_OPENAI_USE_ENTRA_ID=true

# Traditional API key authentication (default)
AZURE_OPENAI_USE_ENTRA_ID=false
```

### Authentication Methods

The implementation uses `DefaultAzureCredential` from the `@azure/identity` package, which supports multiple authentication methods in order of preference:

1. **Managed Identity** (when running in Azure)
2. **Service Principal** (when environment variables are set)
3. **Azure CLI** (for local development)
4. **Visual Studio Code** (for local development)

### Code Changes

#### New Files

- `packages/api/src/utils/entraId.ts` - Entra ID authentication utilities
- `ENTRA_ID_AUTHENTICATION.md` - This documentation file

#### Modified Files

- `packages/api/src/utils/azure.ts` - Added `shouldUseEntraId()` function
- `packages/api/src/utils/index.ts` - Export Entra ID utilities
- `packages/api/src/types/openai.ts` - Added `azureCredential` field to `OpenAIConfigOptions`
- `packages/api/src/endpoints/openai/initialize.ts` - Updated initialization logic
- `api/server/services/Endpoints/openAI/initialize.js` - Updated legacy initialization logic

### Terraform Configuration

The Terraform configuration has been updated to:

1. **Disable local authentication** on Azure OpenAI accounts
2. **Enable managed identity** for LibreChat app service and RAG API container app
3. **Add role assignments** to grant access to Azure OpenAI services
4. **Set environment variables** to enable Entra ID authentication

#### Key Changes

```hcl
# Azure OpenAI account configuration
resource "azurerm_cognitive_account" "openai" {
  # ... other configuration ...
  local_auth_enabled = false  # Disable API key authentication
  
  identity {
    type = "SystemAssigned"
  }
}

# LibreChat app service with managed identity
resource "azurerm_linux_web_app" "librechat" {
  # ... other configuration ...
  
  identity {
    type = "SystemAssigned"
  }
  
  app_settings = {
    # ... other settings ...
    AZURE_OPENAI_USE_ENTRA_ID = "true"
  }
}

# Role assignment for LibreChat
resource "azurerm_role_assignment" "librechat_openai_access" {
  scope                = var.openai_account_id
  role_definition_name = "Cognitive Services OpenAI User"
  principal_id         = azurerm_linux_web_app.librechat.identity[0].principal_id
}
```

## Backward Compatibility

The implementation maintains full backward compatibility:

- **Default Behavior**: API key authentication remains the default
- **Environment Variable**: Entra ID authentication is opt-in via `AZURE_OPENAI_USE_ENTRA_ID=true`
- **Fallback Support**: If Entra ID authentication fails, the system can fall back to API key authentication
- **Legacy Support**: Both new TypeScript and legacy JavaScript initialization paths are supported

## Deployment Instructions

### Prerequisites

1. **Azure Resources**: Azure OpenAI account with managed identity enabled
2. **Role Assignments**: Appropriate permissions for the application identity
3. **Environment Variables**: `AZURE_OPENAI_USE_ENTRA_ID=true` set in the deployment

### Local Development

For local development, you can use Azure CLI authentication:

```bash
# Login to Azure CLI
az login

# Set environment variable
export AZURE_OPENAI_USE_ENTRA_ID=true

# Run LibreChat
npm run dev
```

### Production Deployment

1. **Deploy Infrastructure**: Use the updated Terraform configuration
2. **Verify Role Assignments**: Ensure the application has "Cognitive Services OpenAI User" role
3. **Set Environment Variables**: Configure `AZURE_OPENAI_USE_ENTRA_ID=true`
4. **Test Authentication**: Verify that the application can access Azure OpenAI services

## Security Considerations

### Benefits

- **No API Key Management**: Eliminates the need to store, rotate, or manage API keys
- **Identity-Based Access**: Uses Azure's built-in identity and access management
- **Audit Trail**: All access is logged through Azure's audit system
- **Principle of Least Privilege**: Role-based access control with specific permissions

### Considerations

- **Network Access**: Ensure the application can reach Azure's identity endpoints
- **Token Expiration**: Tokens are automatically refreshed by the Azure SDK
- **Error Handling**: Implement proper error handling for authentication failures

## Troubleshooting

### Common Issues

1. **Authentication Failures**
   - Verify the application has the correct role assignments
   - Check that managed identity is enabled
   - Ensure the Azure OpenAI account allows managed identity access

2. **Network Connectivity**
   - Verify the application can reach `https://login.microsoftonline.com`
   - Check firewall rules and network security groups

3. **Environment Variables**
   - Ensure `AZURE_OPENAI_USE_ENTRA_ID=true` is set
   - Verify other Azure configuration variables are correct

### Debug Information

Enable debug logging to troubleshoot authentication issues:

```bash
DEBUG_OPENAI=true
DEBUG_LOGGING=true
```

## Migration Guide

### From API Key to Entra ID

1. **Update Terraform**: Deploy the updated configuration
2. **Set Environment Variable**: Add `AZURE_OPENAI_USE_ENTRA_ID=true`
3. **Verify Access**: Test that the application can authenticate
4. **Remove API Keys**: Once verified, remove API key environment variables

### Rollback Plan

If issues occur, you can quickly rollback by:

1. **Set Environment Variable**: `AZURE_OPENAI_USE_ENTRA_ID=false`
2. **Restore API Keys**: Add back the `AZURE_API_KEY` environment variable
3. **Redeploy**: Update the application configuration

## Future Enhancements

Potential future improvements include:

- **Multi-tenant Support**: Support for multiple Azure tenants
- **Custom Scopes**: Support for custom authentication scopes
- **Token Caching**: Implement token caching for improved performance
- **Health Checks**: Add authentication health check endpoints

## Support

For issues or questions regarding the Entra ID authentication feature:

1. Check the troubleshooting section above
2. Review Azure documentation for managed identity
3. Enable debug logging for detailed error information
4. Contact the development team for assistance

## References

- [Azure Identity SDK Documentation](https://docs.microsoft.com/en-us/javascript/api/@azure/identity/)
- [Azure OpenAI Authentication](https://docs.microsoft.com/en-us/azure/cognitive-services/openai/how-to/authentication)
- [Managed Identity for Azure Resources](https://docs.microsoft.com/en-us/azure/active-directory/managed-identities-azure-resources/)
