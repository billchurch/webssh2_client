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

**Local scanning:**

```bash
# Run security audit (npm audit + Trivy filesystem scan)
npm run security:audit
```

**GitHub Actions CI pipeline** (runs on every pull request):

| Check              | Tool        | Description                                       |
| ------------------ | ----------- | ------------------------------------------------- |
| Dependency audit   | `npm audit` | Checks for known vulnerabilities in dependencies  |
| Vulnerability scan | Trivy       | Filesystem scan for CRITICAL/HIGH severity CVEs   |
| Dependency review  | GitHub      | Flags new dependencies with known vulnerabilities |
| SARIF upload       | CodeQL      | Results visible in GitHub Security tab            |

##### 3. Client-Specific Security

- **CSP Headers**: Content Security Policy validation for built assets
- **SRI Hash Generation**: Subresource Integrity for distributed files
- **No Dynamic Loading**: Static dependency analysis only
- **Minimal Runtime**: Reduced client-side dependencies

##### 4. Build Pipeline Security

- **Pre-build**: `npm ci --ignore-scripts` prevents lifecycle script attacks
- **Post-build**: Trivy scans final artifacts for vulnerabilities
- **Bundle analysis**: `npm run analyze` for security review of bundled code
- **CI enforcement**: All GitHub Actions pinned to commit SHAs

#### Dependency Version Policy

- Dependencies use caret (`^`) ranges with 2-week adoption delay for new releases
- `package-lock.json` ensures reproducible builds with exact versions
- Critical packages are reviewed before any version updates

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

- **GitHub**: Use the [Security Advisories](https://github.com/billchurch/WebSSH2/security/advisories) feature to privately report vulnerabilities

### Security Response Timeline

- **Acknowledgment**: Within 24 hours
- **Initial Assessment**: Within 72 hours
- **Fix Development**: Within 1 week for critical issues
- **Public Disclosure**: After fix is deployed and users have time to update

### Security Best Practices for Contributors

1. **Never commit secrets** - Use environment variables
2. **Pin dependency versions** - Avoid automatic updates
3. **Review build tool updates** - Wait 2 weeks for new releases
4. **Run security audit** - `npm run security:audit` before commits
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

#### GitHub Actions CI (`ci.yml`)

Every pull request runs the following security checks:

```yaml
# 1. npm audit - checks for known vulnerabilities
npm audit --audit-level=high

# 2. Trivy filesystem scan - CRITICAL/HIGH severity
aquasecurity/trivy-action@v0.33.1
  scan-type: 'fs'
  severity: 'CRITICAL,HIGH'
  ignore-unfixed: true

# 3. GitHub Dependency Review - flags risky new dependencies
actions/dependency-review-action@v4
  fail-on-severity: high
```

Results are uploaded to GitHub Security tab via SARIF format.

#### Local Security Tools

**Trivy:**

```bash
# Install Trivy (macOS)
brew install trivy

# Run combined audit (npm + Trivy)
npm run security:audit
```

**Bundle Analysis:**

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

## SolidJS / Seroval Vulnerability Assessment

As of 2026-01-27, we evaluated reported vulnerabilities in solid-js and its seroval dependency. **WebSSH2 Client is NOT affected** by these issues.

### CVE-2026-23737 - Seroval RCE via JSON Deserialization

| Field             | Value              |
| ----------------- | ------------------ |
| Severity          | High               |
| Affected versions | < 1.4.1            |
| Our version       | 1.5.0 ✅           |
| Status            | **Not vulnerable** |

The seroval package is used by SolidJS for server-side rendering serialization. WebSSH2 Client:

- Uses seroval 1.5.0, which is above the patched version (1.4.1)
- Does not use SSR - this is a client-side SPA only
- Uses Socket.IO native JSON serialization for all client-server communication

### CVE-2025-27109 - SolidJS XSS in JSX Fragments (SSR)

| Field             | Value              |
| ----------------- | ------------------ |
| Severity          | Medium (5.1)       |
| Affected versions | < 1.9.4            |
| Our version       | 1.9.11 ✅          |
| Status            | **Not vulnerable** |

This vulnerability affects the `ssr` function in SolidJS, which fails to sanitize JSX expressions in JSX fragments during server-side rendering. WebSSH2 Client:

- Uses solid-js 1.9.11, which is above the patched version (1.9.4)
- Is a plain SolidJS SPA - no Solid Start, no server functions, no SSR
- Does not use `innerHTML` or unsafe HTML patterns anywhere in the codebase
- All user input is rendered via SolidJS reactive primitives which auto-escape

### Verification Commands

```bash
# Check seroval version
npm ls seroval

# Verify no innerHTML usage
grep -r "innerHTML" client/src/

# Verify no Solid Start dependency
grep -E "solid-start|@solidjs/start" package.json
```

### CVE References

- [GHSA-3rxj-6cgf-8cfw - Seroval RCE](https://github.com/advisories/GHSA-3rxj-6cgf-8cfw)
- [CVE-2025-27109 - SolidJS XSS](https://nvd.nist.gov/vuln/detail/CVE-2025-27109)
- [SolidJS XSS Research](https://ensy.zip/posts/3-xss-solidjs/)

## Shai-hulud 2.0 supply chain risk

As of 2026-01-27, automated checks for Shai-hulud 2.0 indicators of compromise (IoCs) found **no evidence of compromise** in this repository.

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

**Last Updated**: January 27, 2026
**Next Review**: February 27, 2026
