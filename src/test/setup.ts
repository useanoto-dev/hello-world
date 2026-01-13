import { vi } from 'vitest';

// Mock navigator.serial for Web Serial API tests
Object.defineProperty(navigator, 'serial', {
  value: {
    requestPort: vi.fn(),
    getPorts: vi.fn().mockResolvedValue([]),
  },
  writable: true,
});

// Mock window.open for print tests
Object.defineProperty(window, 'open', {
  value: vi.fn().mockReturnValue({
    document: {
      write: vi.fn(),
      close: vi.fn(),
    },
    focus: vi.fn(),
    print: vi.fn(),
    close: vi.fn(),
  }),
  writable: true,
});
