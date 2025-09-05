module.exports = {
  extends: [
    'stylelint-config-standard'
  ],
  rules: {
    // Tailwind at-rules and utilities
    'at-rule-no-unknown': [true, {
      ignoreAtRules: ['tailwind', 'apply', 'variants', 'responsive', 'screen', 'layer']
    }],
    // Prefer focus-visible patterns; disallow removing outlines entirely
    'declaration-property-value-disallowed-list': {
      outline: ['none', '0']
    }
  }
}
