# Project Architecture Rules

- Access the native Capacitor App lifecycle through `src/plugins/CapacitorApp.ts`, because the publisher's cached `@capacitor/app` package may omit its compiled web entry.