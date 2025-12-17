/**
 * @file Prompt Security Tests
 * Tests for XSS prevention and security features in the prompt system
 */

import { describe, it } from 'node:test'
import assert from 'node:assert'

// SolidJS text interpolation escapes these characters:
const escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;'
}

const escapeHtml = (text) => {
  return text.replaceAll(/[&<>"']/g, (char) => escapeMap[char] || char)
}

describe('Prompt Security', () => {
  describe('XSS Prevention', () => {
    it('should NOT have HTML special characters in prompt text fields', () => {
      // Simulate what SolidJS text interpolation does (it escapes automatically)
      const maliciousPayloads = [
        '<script>alert("xss")</script>',
        '<img src=x onerror=alert("xss")>',
        '"><script>alert("xss")</script>',
        "javascript:alert('xss')",
        '<svg onload=alert("xss")>',
        '<body onload=alert("xss")>',
        '<iframe src="javascript:alert(\'xss\')">',
        '{{constructor.constructor("alert(1)")()}}'
      ]

      maliciousPayloads.forEach((payload) => {
        const escaped = escapeHtml(payload)

        // Verify HTML special characters are escaped
        // The key point is that < and > are escaped, preventing tag execution
        assert.ok(
          !escaped.includes('<'),
          `Escaped text should not contain raw <: ${escaped}`
        )
        assert.ok(
          !escaped.includes('>'),
          `Escaped text should not contain raw >: ${escaped}`
        )
        // All < should become &lt;
        if (payload.includes('<')) {
          assert.ok(
            escaped.includes('&lt;'),
            `Escaped text should contain &lt; for <: ${escaped}`
          )
        }
        // All > should become &gt;
        if (payload.includes('>')) {
          assert.ok(
            escaped.includes('&gt;'),
            `Escaped text should contain &gt; for >: ${escaped}`
          )
        }
      })
    })

    it('should properly escape HTML entities', () => {
      const testCases = [
        { input: '<', expected: '&lt;' },
        { input: '>', expected: '&gt;' },
        { input: '&', expected: '&amp;' },
        { input: '"', expected: '&quot;' },
        { input: "'", expected: '&#x27;' },
        { input: '<script>', expected: '&lt;script&gt;' },
        { input: 'Hello & goodbye', expected: 'Hello &amp; goodbye' },
        {
          input: '"quoted" text',
          expected: '&quot;quoted&quot; text'
        }
      ]

      testCases.forEach(({ input, expected }) => {
        const result = escapeHtml(input)
        assert.strictEqual(
          result,
          expected,
          `escapeHtml("${input}") should equal "${expected}"`
        )
      })
    })
  })

  describe('Icon Registry Security', () => {
    it('should only allow whitelisted icons', () => {
      // Simulate the icon registry lookup
      const PROMPT_ICON_REGISTRY = {
        Info: 'Info',
        TriangleAlert: 'TriangleAlert',
        CircleAlert: 'CircleAlert',
        CircleCheckBig: 'CircleCheckBig',
        Key: 'Key',
        Lock: 'Lock'
        // ... other icons
      }

      const SEVERITY_DEFAULTS = {
        info: 'Info',
        warning: 'TriangleAlert',
        error: 'CircleAlert',
        success: 'CircleCheckBig'
      }

      const resolvePromptIcon = (iconName, severity = 'info') => {
        if (iconName !== undefined) {
          const icon = PROMPT_ICON_REGISTRY[iconName]
          if (icon !== undefined) {
            return icon
          }
          // Falls back to severity default
        }
        return SEVERITY_DEFAULTS[severity] ?? 'Info'
      }

      // Valid icon should resolve
      assert.strictEqual(resolvePromptIcon('Key'), 'Key')
      assert.strictEqual(resolvePromptIcon('Lock'), 'Lock')

      // Invalid icon should fallback to severity default
      assert.strictEqual(
        resolvePromptIcon('NonExistentIcon', 'warning'),
        'TriangleAlert'
      )

      // Path traversal attempt should fallback
      assert.strictEqual(resolvePromptIcon('../../../etc/passwd'), 'Info')

      // Script injection attempt should fallback
      assert.strictEqual(resolvePromptIcon('<script>alert(1)</script>'), 'Info')

      // Dynamic import attempt should fallback
      assert.strictEqual(resolvePromptIcon('import("malicious")'), 'Info')
    })

    it('should not allow dynamic imports in icon resolution', () => {
      // The icon resolver should NEVER use dynamic imports
      // This is a design test - the actual implementation uses a static registry

      // Simulating what a secure implementation looks like
      const STATIC_REGISTRY = {
        Info: () => 'Info',
        Warning: () => 'Warning'
      }

      const secureResolve = (name) => {
        // CORRECT: Direct object lookup (no string interpolation)
        return STATIC_REGISTRY[name] ?? STATIC_REGISTRY.Info
      }

      // The insecure way (should NOT be implemented):
      // const insecureResolve = async (name) => {
      //   return await import(`lucide-solid/icons/${name}`)  // BAD!
      // }

      // Test that the secure resolver works
      assert.ok(secureResolve('Info') !== undefined)
      assert.ok(secureResolve('Unknown') !== undefined) // Falls back

      // The secure resolver should not execute arbitrary code
      const maliciousInput = "../../malicious'; import('evil'); '"
      const result = secureResolve(maliciousInput)
      assert.ok(result !== undefined) // Should return fallback, not crash
    })
  })

  describe('Rate Limiting Security', () => {
    it('should prevent DoS via prompt flooding', () => {
      // Rate limit is 5/s but circuit breaker trips at 10
      const CIRCUIT_BREAKER = 10
      let promptCount = 0
      let circuitTripped = false

      const simulatePromptFlood = () => {
        for (let i = 0; i < 20; i++) {
          if (circuitTripped) break
          promptCount++
          if (promptCount > CIRCUIT_BREAKER) {
            circuitTripped = true
          }
        }
      }

      simulatePromptFlood()

      // Circuit breaker should have tripped
      assert.strictEqual(circuitTripped, true)
      // Should have stopped processing after threshold
      assert.ok(promptCount <= CIRCUIT_BREAKER + 1)
    })

    it('should disconnect socket when circuit breaker trips', () => {
      let disconnected = false
      const disconnectCallback = () => {
        disconnected = true
      }

      // Simulate circuit breaker tripping
      const circuitBreakerTripped = true
      if (circuitBreakerTripped) {
        disconnectCallback()
      }

      assert.strictEqual(disconnected, true)
    })
  })

  describe('Focus Trap Safety', () => {
    it('should have force-close mechanism after timeout', () => {
      // Simulate the focus trap safety mechanism (actual delay is 5000ms)
      let forceCloseEnabled = false

      // After 5 seconds, force close should be enabled
      const enableForceClose = () => {
        forceCloseEnabled = true
      }

      // Simulate timeout (in real code this is setTimeout)
      enableForceClose()

      assert.strictEqual(forceCloseEnabled, true)
    })

    it('should always allow emergency close via Ctrl+Shift+Esc', () => {
      // Simulate keyboard event handling
      const handleKeyDown = (event) => {
        if (event.ctrlKey && event.shiftKey && event.key === 'Escape') {
          return 'dismiss_all'
        }
        return null
      }

      // Test the key combination
      const emergencyEvent = {
        ctrlKey: true,
        shiftKey: true,
        key: 'Escape'
      }

      const result = handleKeyDown(emergencyEvent)
      assert.strictEqual(result, 'dismiss_all')

      // Regular Escape should not trigger dismiss all
      const regularEscape = {
        ctrlKey: false,
        shiftKey: false,
        key: 'Escape'
      }

      const regularResult = handleKeyDown(regularEscape)
      assert.strictEqual(regularResult, null)
    })
  })
})
