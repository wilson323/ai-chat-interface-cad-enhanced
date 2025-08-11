export interface FeatureFlags {
  ui: {
    allowMockData: boolean
  }
  cad: {
    simulatedParsersEnabled: boolean
    occtImportEnabled: boolean
  }
}

// Centralized feature flags with environment overrides
// - ENABLE_UI_MOCKS: 'true' to allow any UI mock data (default: false)
// - ENABLE_SIMULATED_CAD_PARSERS: 'true' to keep simulated CAD parsers active (default: false)
// - OCCT_IMPORT_ENABLED: 'true' to enable occt-import-js for STEP/IGES (default: false)
export const FEATURE_FLAGS: FeatureFlags = {
  ui: {
    allowMockData: process.env.ENABLE_UI_MOCKS === 'true'
  },
  cad: {
    simulatedParsersEnabled: process.env.ENABLE_SIMULATED_CAD_PARSERS === 'true',
    occtImportEnabled: process.env.OCCT_IMPORT_ENABLED === 'true'
  }
}

export const isUiMockAllowed = (): boolean => FEATURE_FLAGS.ui.allowMockData
export const isSimulatedCadParsersEnabled = (): boolean => FEATURE_FLAGS.cad.simulatedParsersEnabled
export const isOcctImportEnabled = (): boolean => FEATURE_FLAGS.cad.occtImportEnabled
