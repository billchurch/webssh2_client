// /client/src/js/utils.js

/**
 * Validates a numeric value within a specified range
 * @param {number|string} value - The value to validate
 * @param {number} min - The minimum allowed value
 * @param {number} max - The maximum allowed value
 * @param {number} defaultValue - The default value if validation fails
 * @returns {number} The validated number or the default value
 */
export function validateNumber(value, min, max, defaultValue) {
    const num = Number(value);
    if (isNaN(num) || num < min || num > max) {
      return defaultValue;
    }
    return num;
  }

/**
 * Recursively merges two objects.
 * @param {Object} target - The target object.
 * @param {Object} source - The source object.
 * @returns {Object} The merged object.
 */
export function mergeDeep(target, source) {
  const output = Object.assign({}, target);
  if (isObject(target) && isObject(source)) {
    Object.keys(source).forEach(key => {
      if (isObject(source[key])) {
        if (!(key in target)) {
          Object.assign(output, { [key]: source[key] });
        } else {
          output[key] = mergeDeep(target[key], source[key]);
        }
      } else {
        Object.assign(output, { [key]: source[key] });
      }
    });
  }
  return output;
}

/**
 * Checks if the value is an object.
 * @param {*} item - The value to check.
 * @returns {boolean} True if the value is an object, false otherwise.
 */
export function isObject(item) {
  return (item && typeof item === 'object' && !Array.isArray(item));
}

/**
 * Formats a date object into a string.
 * @param {Date} date - The date to format.
 * @returns {string} The formatted date string.
 */
export function formatDate(date) {
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} @ ${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}`;
}


/**
 * Validates the bell style option
 * @param {string} value - The bell style to validate
 * @returns {string} The validated bell style or the default 'sound'
 */
export function validateBellStyle(value) {
    return ['sound', 'none'].includes(value) ? value : 'sound';
  }

/**
 * Initializes the global configuration.
 * This should be called once at application startup.
 */
export function initializeConfig() {
    const defaultConfig = {
      socket: {
        url: null,
        path: '/ssh/socket.io',
      },
      ssh: {
        host: null,
        port: 22,
        username: null,
        password: null,
        sshTerm: 'xterm-color',
        readyTimeout: 20000,
      },
      terminal: {
        cursorBlink: true,
        scrollback: 10000,
        tabStopWidth: 8,
        bellStyle: 'sound',
        fontSize: 14,
        fontFamily: 'courier-new, courier, monospace',
        letterSpacing: 0,
        lineHeight: 1,
      },
      header: {
        text: null,
        background: 'green',
      },
      autoConnect: false,
      logLevel: 'info',
    };
    const userConfig = window.webssh2Config || {};
    let config = mergeDeep(defaultConfig, userConfig);
    console.log('Config:', config);
    return config
  }

/**
 * Populates form fields from URL parameters.
 * @returns {Object} The URL parameters for host and port.
 */
export function populateFormFromUrl(config) {
    const searchParams = getUrlParams();
    const params = {};
    
    ['host', 'port', 'header', 'headerBackground', 'sshTerm', 'readyTimeout', 'cursorBlink', 
     'scrollback', 'tabStopWidth', 'bellStyle', 'fontSize', 'fontFamily', 'letterSpacing', 'lineHeight',
     'username', 'password', 'logLevel'].forEach(param => {
      let value = searchParams.get(param);
      if (value === null && config.ssh && config.ssh[param] !== undefined) {
        value = config.ssh[param];
      }
      if (value !== null) {
        params[param] = value;
        const input = document.getElementById(param + 'Input');
        if (input) {
          input.value = value;
        }
      }
    });
    console.log('populateFormFromUrl params:', params);
    return params;
  }

/**
 * Retrieves the URL parameters from the current window location.
 * @returns {URLSearchParams} The URL parameters.
 */
function getUrlParams() {
    return new URLSearchParams(window.location.search);
}