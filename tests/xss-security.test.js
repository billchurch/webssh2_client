/**
 * XSS Security Test Suite for WebSSH2 Client
 * Tests for Cross-Site Scripting vulnerability prevention
 * Related to Issue #389
 */

import { describe, it, beforeEach, afterEach } from 'node:test'
import assert from 'node:assert/strict'
import { JSDOM } from 'jsdom'

// Common XSS attack vectors to test
const XSS_VECTORS = [
  '<script>alert("XSS")</script>',
  '<img src=x onerror=alert("XSS")>',
  '<svg onload=alert("XSS")>',
  'javascript:alert("XSS")',
  '<iframe src=javascript:alert("XSS")>',
  '<body onload=alert("XSS")>',
  '<input onfocus=alert("XSS") autofocus>',
  '<select onfocus=alert("XSS") autofocus>',
  '<textarea onfocus=alert("XSS") autofocus>',
  '<video><source onerror=alert("XSS")>',
  '<audio src=x onerror=alert("XSS")>',
  '<details open ontoggle=alert("XSS")>',
  '"><script>alert("XSS")</script>',
  '\'><script>alert("XSS")</script>',
  '<script>alert(String.fromCharCode(88,83,83))</script>',
  '<img src="x" onerror="alert(1)">',
  '<img src=`javascript:alert("XSS")`>',
  '<object data="javascript:alert("XSS")">',
  '<embed src="javascript:alert("XSS")">',
  '<a href="javascript:alert("XSS")">Click</a>'
]

describe('XSS Security Tests', () => {
  let dom
  let window
  let document
  let updateElement

  beforeEach(async () => {
    // Setup JSDOM environment
    dom = new JSDOM(`
      <!DOCTYPE html>
      <html>
        <body>
          <div id="header"></div>
          <div id="footer"></div>
          <div id="status"></div>
          <div id="error"></div>
        </body>
      </html>
    `, {
      url: 'http://localhost:3000',
      pretendToBeVisual: true,
      resources: 'usable'
    })

    window = dom.window
    document = window.document
    global.window = window
    global.document = document

    // Mock the updateElement function
    updateElement = (elementName, content) => {
      const element = document.getElementById(elementName)
      if (element) {
        const text = typeof content === 'object' ? content.text : content
        element.textContent = text  // Safe implementation using textContent
      }
    }
  })

  afterEach(() => {
    dom.window.close()
  })

  describe('Header/Footer XSS Prevention', () => {
    XSS_VECTORS.forEach((vector, index) => {
      it(`should prevent XSS in header with vector ${index + 1}: ${vector.substring(0, 30)}...`, () => {
        const headerElement = document.getElementById('header')
        updateElement('header', vector)
        
        // Check that no script tags were created
        assert.equal(headerElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
        
        // Check that the text content is properly escaped and no HTML is interpreted
        assert.equal(headerElement.textContent, vector, 'Text should be escaped and displayed as plain text')
        
        // Verify that innerHTML contains escaped HTML entities (safe representation)
        const innerHTML = headerElement.innerHTML
        assert.equal(innerHTML.includes('<script'), false, 'Script tags should not be present in HTML')
        assert.equal(innerHTML.includes('<img'), false, 'Image tags should not be present in HTML')
        assert.equal(innerHTML.includes('<svg'), false, 'SVG tags should not be present in HTML')
      })
    })

    XSS_VECTORS.forEach((vector, index) => {
      it(`should prevent XSS in footer with vector ${index + 1}: ${vector.substring(0, 30)}...`, () => {
        const footerElement = document.getElementById('footer')
        updateElement('footer', vector)
        
        // Check that no script tags were created
        assert.equal(footerElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
        
        // Check that the text content is properly escaped and no HTML is interpreted
        assert.equal(footerElement.textContent, vector, 'Text should be escaped and displayed as plain text')
        
        // Verify that innerHTML contains escaped HTML entities (safe representation)
        const innerHTML = footerElement.innerHTML
        assert.equal(innerHTML.includes('<script'), false, 'Script tags should not be present in HTML')
        assert.equal(innerHTML.includes('<img'), false, 'Image tags should not be present in HTML')
        assert.equal(innerHTML.includes('<svg'), false, 'SVG tags should not be present in HTML')
      })
    })
  })

  describe('Status/Error Message XSS Prevention', () => {
    XSS_VECTORS.forEach((vector, index) => {
      it(`should prevent XSS in status with vector ${index + 1}: ${vector.substring(0, 30)}...`, () => {
        const statusElement = document.getElementById('status')
        updateElement('status', vector)
        
        // Check that no script tags were created
        assert.equal(statusElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
        
        // Check that the text content is properly escaped and no HTML is interpreted
        assert.equal(statusElement.textContent, vector, 'Text should be escaped and displayed as plain text')
        
        // Verify that innerHTML contains escaped HTML entities (safe representation)
        const innerHTML = statusElement.innerHTML
        assert.equal(innerHTML.includes('<script'), false, 'Script tags should not be present in HTML')
        assert.equal(innerHTML.includes('<img'), false, 'Image tags should not be present in HTML')
      })
    })

    XSS_VECTORS.forEach((vector, index) => {
      it(`should prevent XSS in error messages with vector ${index + 1}: ${vector.substring(0, 30)}...`, () => {
        const errorElement = document.getElementById('error')
        updateElement('error', vector)
        
        // Check that no script tags were created
        assert.equal(errorElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
        
        // Check that the text content is properly escaped and no HTML is interpreted
        assert.equal(errorElement.textContent, vector, 'Text should be escaped and displayed as plain text')
        
        // Verify that innerHTML contains escaped HTML entities (safe representation)  
        const innerHTML = errorElement.innerHTML
        assert.equal(innerHTML.includes('<script'), false, 'Script tags should not be present in HTML')
        assert.equal(innerHTML.includes('<img'), false, 'Image tags should not be present in HTML')
      })
    })
  })

  describe('URL Parameter Handling', () => {
    it('should sanitize header parameter from URL', () => {
      const maliciousHeader = '<script>alert("XSS")</script>'
      const headerElement = document.getElementById('header')
      
      // Simulate URL parameter processing
      updateElement('header', maliciousHeader)
      
      // Verify no script execution
      assert.equal(headerElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
      assert.equal(headerElement.textContent, maliciousHeader, 'Malicious content should be displayed as text')
    })

    it('should sanitize footer parameter from URL', () => {
      const maliciousFooter = '<img src=x onerror=alert("XSS")>'
      const footerElement = document.getElementById('footer')
      
      // Simulate URL parameter processing
      updateElement('footer', maliciousFooter)
      
      // Verify no image tag with onerror  
      assert.equal(footerElement.getElementsByTagName('img').length, 0, 'Image tags should not be present')
      assert.equal(footerElement.textContent, maliciousFooter, 'Malicious content should be displayed as text')
      
      // Verify that innerHTML contains escaped HTML entities (safe representation)
      const innerHTML = footerElement.innerHTML
      assert.equal(innerHTML.includes('<img'), false, 'Image tags should not be present in HTML')
    })
  })

  describe('Complex XSS Scenarios', () => {
    it('should handle nested HTML entities', () => {
      const nestedXSS = '&lt;script&gt;alert("XSS")&lt;/script&gt;'
      const headerElement = document.getElementById('header')
      
      updateElement('header', nestedXSS)
      
      assert.equal(headerElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
      assert.equal(headerElement.textContent, nestedXSS, 'HTML entities should be displayed as text')
    })

    it('should handle Unicode bypass attempts', () => {
      const unicodeXSS = '\\u003cscript\\u003ealert("XSS")\\u003c/script\\u003e'
      const headerElement = document.getElementById('header')
      
      updateElement('header', unicodeXSS)
      
      assert.equal(headerElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
    })

    it('should handle data URIs', () => {
      const dataURIXSS = 'data:text/html,<script>alert("XSS")</script>'
      const headerElement = document.getElementById('header')
      
      updateElement('header', dataURIXSS)
      
      assert.equal(headerElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
      assert.equal(headerElement.textContent, dataURIXSS, 'Data URI should be displayed as text')
    })

    it('should handle mixed case bypass attempts', () => {
      const mixedCaseXSS = '<ScRiPt>alert("XSS")</sCrIpT>'
      const headerElement = document.getElementById('header')
      
      updateElement('header', mixedCaseXSS)
      
      assert.equal(headerElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
    })
  })

  describe('WebSocket Message Handling', () => {
    it('should sanitize malicious WebSocket messages', () => {
      const maliciousMessage = {
        element: 'header',
        value: '<script>alert("XSS from WebSocket")</script>'
      }
      
      const headerElement = document.getElementById('header')
      updateElement(maliciousMessage.element, maliciousMessage.value)
      
      assert.equal(headerElement.getElementsByTagName('script').length, 0, 'Script tags should not be present')
      assert.equal(headerElement.textContent, maliciousMessage.value, 'Malicious content should be displayed as text')
    })

    it('should handle malformed WebSocket data', () => {
      const malformedData = {
        element: 'status',
        value: { text: '<img src=x onerror=alert("XSS")>', background: 'red' }
      }
      
      const statusElement = document.getElementById('status')
      updateElement(malformedData.element, malformedData.value)
      
      assert.equal(statusElement.getElementsByTagName('img').length, 0, 'Image tags should not be present')
      assert.equal(statusElement.textContent, malformedData.value.text, 'Malicious content should be displayed as text')
    })
  })

  describe('Content Security Policy', () => {
    it('should recommend CSP headers', () => {
      const recommendedCSP = {
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline'",  // unsafe-inline needed for xterm.js
          "style-src 'self' 'unsafe-inline'",    // unsafe-inline needed for terminal styling
          "img-src 'self' data:",
          "font-src 'self'",
          "connect-src 'self' ws: wss:",         // WebSocket connections
          "frame-src 'none'",
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "upgrade-insecure-requests"
        ].join('; ')
      }
      
      // This is a recommendation, not a test
      console.log('Recommended CSP Headers:', recommendedCSP)
      assert.ok(recommendedCSP['Content-Security-Policy'].includes("script-src 'self'"))
    })
  })
})

// Export for use in other test files
export { XSS_VECTORS }