/**
 * ASST Terminal Theme
 * Terracotta: #B54C38
 * Coral: #E67E6B
 * Deep Charcoal: #1E1E1C
 */
export declare const theme: {
    brand: import("chalk").ChalkInstance;
    accent: import("chalk").ChalkInstance;
    dim: import("chalk").ChalkInstance;
    text: import("chalk").ChalkInstance;
    error: import("chalk").ChalkInstance;
    success: import("chalk").ChalkInstance;
    warning: import("chalk").ChalkInstance;
    info: import("chalk").ChalkInstance;
    header: (text: string) => string;
    repo: (text: string) => string;
};
