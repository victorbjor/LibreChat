# LibreChat Fork - Neo Agent Platform

This is a customized fork of LibreChat for the Neo Agent AI Platform.

## Customizations

### Platform Integration
- Azure AD SSO integration
- n8n workflow integration
- Custom branding and theming
- Enhanced security features
- Azure OpenAI integration

### Environment Configuration
- Container deployment optimized
- Environment-specific configurations
- Health check endpoints
- Monitoring integration

## Development

### Local Development
```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build
```

### Customization Development
1. Make changes in the source code
2. Test locally with `npm run dev`
3. Build Docker image: `docker build -t librechat-custom .`
4. Test in development environment
5. Deploy to production

## Integration Points

### n8n Integration
- Webhook endpoints for workflow triggers
- API endpoints for agent communication
- Message queue integration
- Context passing between applications

### Azure Integration
- Azure AD authentication
- Azure OpenAI API integration
- Azure Key Vault for secrets
- Azure Monitor for logging

## Deployment

### Docker Deployment
```bash
# Build image
docker build -t librechat-custom .

# Run container
docker run -p 3080:3080 librechat-custom
```

### Azure Container Apps
The application is deployed to Azure Container Apps with:
- Auto-scaling configuration
- Health check endpoints
- Environment variable injection
- Private network endpoints

## Upstream Synchronization

### Sync with Upstream
```bash
# Fetch upstream changes
git fetch upstream

# Merge upstream changes
git merge upstream/main

# Push to fork
git push origin main
```

### Customization Management
- Keep customizations in separate branches
- Document all changes
- Test thoroughly before merging
- Maintain compatibility with upstream

## Security

### Security Enhancements
- Enhanced input validation
- Rate limiting
- Audit logging
- Secure session management
- CSRF protection

### Compliance
- GDPR compliance
- Data retention policies
- Privacy controls
- Audit trails

## Monitoring

### Health Checks
- `/health` - Application health
- `/api/status` - Detailed status
- `/api/metrics` - Performance metrics

### Logging
- Structured logging
- Error tracking
- Performance monitoring
- Security event logging

## Support

For issues related to this fork:
- Create issues in the fork repository
- Contact the Neo Agent development team
- Check the main documentation in the parent repository

## License

This fork maintains the same license as the original LibreChat project. 