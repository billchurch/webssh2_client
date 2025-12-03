# Security Policy

## Supply Chain Security

### NPM Package Verification Process

WebSSH2 Client implements comprehensive security measures to protect against supply chain attacks, including the NPM package hijacking incident reported in September 2025.

#### Verification Status

✅ **VERIFIED SAFE** - This repository does not contain compromised packages from the September 2025 NPM supply chain attack.

#### Enhanced Security Measures

##### 1. Package Cool-Down Period

- **Policy**: 2-week quarantine for all newly released package versions
- **Process**: New versions only adopted after community vetting period
- **Build Tools**: Special attention to Vite plugins and build dependencies
- **Exception**: Critical security patches with CVE advisories

##### 2. Automated Security Scanning

```bash
# Run security checks
npm run security:check     # Check for compromised packages
npm run security:audit     # Run npm audit + recommend Trivy
npm run security:socket    # Instructions for Socket.dev scan
```

##### 3. Client-Specific Security

- **CSP Headers**: Content Security Policy validation for built assets
- **SRI Hash Generation**: Subresource Integrity for distributed files
- **No Dynamic Loading**: Static dependency analysis only
- **Minimal Runtime**: Reduced client-side dependencies

##### 4. Build Pipeline Security

- Pre-build dependency verification
- Post-build artifact scanning with Trivy
- Bundle analysis for security review
- Release-please integration with security checks

#### Locked Package Versions

The following packages are locked to safe versions via `overrides`:

```json
{
  "debug": "4.4.1"
}
```

### Build Security Process

#### Development Environment

1. **Dependency Verification**: All build tools verified before use
2. **Vite Configuration**: Security-focused build settings
3. **Hot Module Replacement**: Secure local development only

#### Production Builds

1. **Artifact Scanning**: Trivy scan of final bundle
2. **Integrity Verification**: SRI hashes for all assets
3. **CSP Validation**: Content Security Policy compliance
4. **Bundle Analysis**: Security review of dependencies in final bundle

### Reporting Security Vulnerabilities

Please report security vulnerabilities to:

- **Email**: security@webssh2.com (if available)
- **GitHub**: Create a private security advisory
- **Emergency**: Create a public issue with `security` label

### Security Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Fix Development**: Within 1 week for critical issues
- **Public Disclosure**: After fix is deployed and users have time to update

### Security Best Practices for Contributors

1. **Never commit secrets** - Use environment variables
2. **Pin dependency versions** - Avoid automatic updates
3. **Review build tool updates** - Wait 2 weeks for new releases
4. **Run security checks** - Before every commit
5. **Verify bundle integrity** - Check final build outputs

### Dependency Management Policy

#### New Dependencies

1. Community vetting period (2 weeks minimum)
2. Security audit with Socket.dev and Trivy
3. Build tool compatibility verification
4. Client-side security impact assessment
5. Approval by security team

#### Updates

1. Review change logs for security implications
2. Wait 2 weeks after release (except security patches)
3. Test in isolated build environment
4. Verify final bundle security before merging

### Security Tools Integration

#### Socket.dev

```bash
# Install Socket.dev CLI
npm install -g @socketsecurity/cli
# Scan project with strict settings
socket.dev cli scan --strict
```

#### Trivy

```bash
# Install Trivy (macOS)
brew install trivy
# Scan all files including build output
trivy fs --security-checks vuln .
```

#### Vite Security

```bash
# Build with security analysis
npm run build
# Analyze bundle for security issues
npm run analyze
```

### References

- [NPM Supply Chain Attack - September 2025](https://www.bleepingcomputer.com/news/security/hackers-hijack-npm-packages-with-2-billion-weekly-downloads-in-supply-chain-attack/)
- [Socket.dev Security Platform](https://socket.dev)
- [Trivy Security Scanner](https://trivy.dev)
- [Vite Security Guidelines](https://vitejs.dev/guide/security.html)
- [Web Security Best Practices](https://developer.mozilla.org/en-US/docs/Web/Security)

## Shai-hulud 2.0 supply chain risk

As of 2025-12-03, automated checks for Shai-hulud 2.0 indicators of compromise (IoCs) found **no evidence of compromise** in this repository.

The scanner performed the following checks:

- Searched for risky npm lifecycle scripts (preinstall, postinstall)
- Checked for known Shai-hulud 2.0 payload files (setup_bun.js, bun_environment.js)
- Inspected GitHub Actions workflows for discussion-triggered backdoor patterns and secret-dumping jobs
- Searched for known self-hosted runner and Docker breakout markers
- Checked for leaked cloud credentials and unsafe npm token usage
- Compared dependencies against a supplied list of known compromised npm packages (if provided)

No matches were found. This is not a guarantee of safety, but it indicates that this project does not currently exhibit known Shai-hulud 2.0 patterns.

### Hardening against Shai-hulud-style attacks

Regardless of current status, this project aims to reduce supply chain risk through the following practices:

- Dependencies are pinned, with automated checks to avoid adopting very recent releases until they age out an organization-defined delay window.
- CI/CD tokens and cloud credentials follow least-privilege and short-lived patterns.
- GitHub Actions workflows are restricted to known, reviewed actions from trusted sources.
- Secret scanning is enabled for this repository.
- npm lifecycle scripts are avoided where possible and are never used to download and execute remote code.
- Cloud IAM policies are configured so that developer or CI credentials cannot directly access production infrastructure.

For more information about detection logic or mitigations, contact the security team via [GitHub Security Advisories](https://github.com/billchurch/WebSSH2/security/advisories).

---

**Last Updated**: December 3, 2025
**Next Review**: January 3, 2026
