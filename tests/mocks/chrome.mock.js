// Chrome Extension API Mocks for Testing
// Provides mock implementations of chrome.* APIs

/**
 * Mock storage implementation
 */
const mockStorage = {
  local: {
    _data: {},
    get: jest.fn((keys) => {
      return Promise.resolve(
        typeof keys === 'string' 
          ? { [keys]: mockStorage.local._data[keys] }
          : keys.reduce((acc, key) => {
              if (mockStorage.local._data[key] !== undefined) {
                acc[key] = mockStorage.local._data[key];
              }
              return acc;
            }, {})
      );
    }),
    set: jest.fn((items) => {
      Object.assign(mockStorage.local._data, items);
      return Promise.resolve();
    }),
    remove: jest.fn((keys) => {
      const keysArray = typeof keys === 'string' ? [keys] : keys;
      keysArray.forEach(key => delete mockStorage.local._data[key]);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStorage.local._data = {};
      return Promise.resolve();
    })
  },
  sync: {
    _data: {},
    get: jest.fn((keys) => {
      return Promise.resolve(
        typeof keys === 'string' 
          ? { [keys]: mockStorage.sync._data[keys] }
          : keys.reduce((acc, key) => {
              if (mockStorage.sync._data[key] !== undefined) {
                acc[key] = mockStorage.sync._data[key];
              }
              return acc;
            }, {})
      );
    }),
    set: jest.fn((items) => {
      Object.assign(mockStorage.sync._data, items);
      return Promise.resolve();
    }),
    remove: jest.fn((keys) => {
      const keysArray = typeof keys === 'string' ? [keys] : keys;
      keysArray.forEach(key => delete mockStorage.sync._data[key]);
      return Promise.resolve();
    }),
    clear: jest.fn(() => {
      mockStorage.sync._data = {};
      return Promise.resolve();
    })
  }
};

/**
 * Mock runtime implementation
 */
const mockRuntime = {
  lastError: null,
  id: 'mock-extension-id',
  getURL: jest.fn((path) => `chrome-extension://mock-extension-id/${path}`),
  sendMessage: jest.fn(() => Promise.resolve({})),
  onMessage: {
    _listeners: [],
    addListener: jest.fn((callback) => {
      mockRuntime.onMessage._listeners.push(callback);
    }),
    removeListener: jest.fn((callback) => {
      const index = mockRuntime.onMessage._listeners.indexOf(callback);
      if (index > -1) {
        mockRuntime.onMessage._listeners.splice(index, 1);
      }
    }),
    hasListener: jest.fn((callback) => {
      return mockRuntime.onMessage._listeners.includes(callback);
    })
  },
  onInstalled: {
    addListener: jest.fn()
  },
  onStartup: {
    addListener: jest.fn()
  },
  openOptionsPage: jest.fn(() => Promise.resolve())
};

/**
 * Mock tabs implementation
 */
const mockTabs = {
  _tabs: [],
  query: jest.fn((queryInfo) => {
    let results = [...mockTabs._tabs];
    
    if (queryInfo.active !== undefined) {
      results = results.filter(tab => tab.active === queryInfo.active);
    }
    if (queryInfo.currentWindow !== undefined) {
      results = results.filter(tab => tab.windowId === 1); // Assume window 1 is current
    }
    if (queryInfo.url) {
      const urlPattern = queryInfo.url;
      results = results.filter(tab => {
        if (typeof urlPattern === 'string') {
          return tab.url.includes(urlPattern.replace(/\*/g, ''));
        }
        return urlPattern.some(pattern => tab.url.includes(pattern.replace(/\*/g, '')));
      });
    }
    
    return Promise.resolve(results);
  }),
  create: jest.fn((createProperties) => {
    const newTab = {
      id: mockTabs._tabs.length + 1,
      url: createProperties.url,
      active: createProperties.active !== false,
      windowId: 1
    };
    mockTabs._tabs.push(newTab);
    return Promise.resolve(newTab);
  }),
  sendMessage: jest.fn(() => Promise.resolve({})),
  get: jest.fn((tabId) => {
    const tab = mockTabs._tabs.find(t => t.id === tabId);
    return Promise.resolve(tab);
  })
};

/**
 * Mock identity implementation
 */
const mockIdentity = {
  _token: null,
  getAuthToken: jest.fn((options, callback) => {
    if (callback) {
      callback(mockIdentity._token);
    }
    return Promise.resolve(mockIdentity._token);
  }),
  removeCachedAuthToken: jest.fn((details, callback) => {
    mockIdentity._token = null;
    if (callback) {
      callback();
    }
    return Promise.resolve();
  }),
  launchWebAuthFlow: jest.fn(() => Promise.resolve('http://localhost/callback?code=mock-code'))
};

/**
 * Mock scripting implementation
 */
const mockScripting = {
  executeScript: jest.fn(() => Promise.resolve([{ result: null }]))
};

/**
 * Complete Chrome mock object
 */
const chromeMock = {
  storage: mockStorage,
  runtime: mockRuntime,
  tabs: mockTabs,
  identity: mockIdentity,
  scripting: mockScripting
};

/**
 * Helper to set up a mock TikTok tab
 */
function setupMockTikTokTab(url = 'https://www.tiktok.com/@testuser/video/1234567890') {
  mockTabs._tabs = [{
    id: 1,
    url,
    active: true,
    windowId: 1
  }];
}

/**
 * Helper to set mock auth token
 */
function setMockAuthToken(token) {
  mockIdentity._token = token;
}

/**
 * Helper to set mock storage data
 * @param {string} type - 'sync' or 'local'
 * @param {object} data - data to set
 */
function setMockStorageData(type, data) {
  if (type === 'sync') {
    Object.assign(mockStorage.sync._data, data);
  } else {
    Object.assign(mockStorage.local._data, data);
  }
}

/**
 * Reset all mocks to initial state
 */
function resetAllMocks() {
  mockStorage.local._data = {};
  mockStorage.sync._data = {};
  mockTabs._tabs = [];
  mockIdentity._token = null;
  mockRuntime.lastError = null;
  
  // Reset all jest mocks
  Object.values(mockStorage.local).forEach(fn => {
    if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
  });
  Object.values(mockStorage.sync).forEach(fn => {
    if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
  });
  Object.values(mockRuntime).forEach(fn => {
    if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
  });
  Object.values(mockTabs).forEach(fn => {
    if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
  });
  Object.values(mockIdentity).forEach(fn => {
    if (typeof fn === 'function' && fn.mockClear) fn.mockClear();
  });
}

// Export for use in tests
module.exports = {
  chromeMock,
  mockStorage,
  mockRuntime,
  mockTabs,
  mockIdentity,
  mockScripting,
  setupMockTikTokTab,
  setMockAuthToken,
  setMockStorageData,
  resetAllMocks
};

// Set up global chrome object if running in test environment
if (typeof global !== 'undefined') {
  global.chrome = chromeMock;
}
