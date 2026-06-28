import { z } from 'zod';

const envSchema = z.object({
  VITE_API_URL: z.string().default('/api/v1'),
  VITE_CESIUM_ION_TOKEN: z.string().optional().default(''),
  VITE_MAPBOX_TOKEN: z.string().optional().default(''),
});

// Since Vite injects import.meta.env at build/runtime:
const envData = {
  VITE_API_URL: (import.meta as any).env.VITE_API_URL,
  VITE_CESIUM_ION_TOKEN: (import.meta as any).env.VITE_CESIUM_ION_TOKEN,
  VITE_MAPBOX_TOKEN: (import.meta as any).env.VITE_MAPBOX_TOKEN,
};

const parsed = envSchema.safeParse(envData);

if (!parsed.success) {
  console.error('❌ Invalid frontend environment variables:', parsed.error.format());
  throw new Error('Invalid environment variables configuration');
}

export const env = parsed.data;
