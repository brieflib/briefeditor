import type {Config} from "jest";

const config: Config = {
    clearMocks: true,
    testEnvironment: 'jsdom',
    coverageProvider: "jsdom",
    preset: "ts-jest",
    moduleNameMapper:
        {
            "^@/(.*)$": "<rootDir>/src/app/$1"
        }
};

export default config;
