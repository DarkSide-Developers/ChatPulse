# Security Policy

## Supported Versions

We actively support the following versions of ChatPulse with security updates:

| Version | Supported          |
| ------- | ------------------ |
| 1.x.x   | :white_check_mark: |
| < 1.0   | :x:                |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security vulnerability in ChatPulse, please report it responsibly.

### How to Report

**Please do NOT report security vulnerabilities through public GitHub issues.**

Instead, please report security vulnerabilities to:
- **Email**: isurulakshan9998@gmail.com
- **Subject**: [SECURITY] ChatPulse Vulnerability Report

### What to Include

Please include the following information in your report:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** of the vulnerability
4. **Suggested fix** (if you have one)
5. **Your contact information** for follow-up

### Response Timeline

We will acknowledge receipt of your vulnerability report within 48 hours and will send you regular updates about our progress. If you haven't received a response within 48 hours, please follow up via email.

We aim to:
- **Acknowledge** the report within 48 hours
- **Provide an initial assessment** within 7 days
- **Release a fix** within 30 days for critical vulnerabilities
- **Publicly disclose** the vulnerability after a fix is available

### Responsible Disclosure

We follow responsible disclosure practices:

1. **Investigation**: We will investigate and validate the reported vulnerability
2. **Fix Development**: We will develop and test a fix
3. **Release**: We will release the fix in a new version
4. **Disclosure**: We will publicly disclose the vulnerability details after the fix is available
5. **Credit**: We will credit the reporter (unless they prefer to remain anonymous)

## Security Best Practices

When using ChatPulse, please follow these security best practices:

### Session Security

- **Protect session files**: Store session files in a secure location with appropriate file permissions
- **Use encryption**: Enable session encryption by setting `SESSION_ENCRYPTION_KEY` environment variable
- **Regular cleanup**: Regularly clean up old session files
- **Backup securely**: If backing up sessions, ensure backups are encrypted

### Environment Variables

- **Secure storage**: Store sensitive configuration in environment variables, not in code
- **Access control**: Limit access to environment files and configuration
- **Rotation**: Regularly rotate API keys and secrets

### Network Security

- **HTTPS only**: Always use HTTPS when possible
- **Firewall**: Configure firewalls to restrict unnecessary network access
- **VPN**: Consider using VPN for additional security in production environments

### Input Validation

- **Validate all inputs**: Always validate user inputs before processing
- **Sanitize data**: Sanitize data before storing or displaying
- **Rate limiting**: Implement rate limiting to prevent abuse

### Logging and Monitoring

- **Secure logs**: Ensure log files don't contain sensitive information
- **Monitor access**: Monitor access to your ChatPulse instances
- **Alert on anomalies**: Set up alerts for unusual activity

### Dependencies

- **Keep updated**: Regularly update ChatPulse and its dependencies
- **Security scanning**: Use tools to scan for known vulnerabilities
- **Minimal dependencies**: Only include necessary dependencies

## Known Security Considerations

### WhatsApp Web Limitations

- **Official API**: ChatPulse uses WhatsApp Web, which is not an official API
- **Terms of Service**: Ensure compliance with WhatsApp's Terms of Service
- **Rate limits**: Respect WhatsApp's rate limits to avoid account restrictions

### Browser Security

- **Puppeteer**: ChatPulse uses Puppeteer, which runs a full browser instance
- **Sandboxing**: Consider running in a sandboxed environment
- **Resource limits**: Set appropriate resource limits for the browser process

### Data Privacy

- **Message content**: Be aware that ChatPulse processes message content
- **User data**: Handle user data according to applicable privacy laws
- **Data retention**: Implement appropriate data retention policies

## Security Updates

Security updates will be released as patch versions and will be clearly marked in the release notes. We recommend:

- **Subscribe** to release notifications
- **Update promptly** when security updates are available
- **Test updates** in a staging environment before production deployment

## Vulnerability Disclosure History

We will maintain a record of disclosed vulnerabilities here:

*No vulnerabilities have been disclosed yet.*

## Contact

For security-related questions or concerns:

- **Security Email**: isurulakshan9998@gmail.com
- **General Contact**: https://github.com/DarkSide-Developers/ChatPulse/issues
- **Organization**: DarkSide Developer Team

## Acknowledgments

We would like to thank the following individuals for responsibly disclosing security vulnerabilities:

*No security researchers have been credited yet.*

---

**Note**: This security policy is subject to change. Please check back regularly for updates.