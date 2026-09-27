# Project Architecture Rules

- Access native Capacitor plugins through local typed wrappers in `src/plugins`, because the publisher's cached plugin packages may omit compiled web entries.