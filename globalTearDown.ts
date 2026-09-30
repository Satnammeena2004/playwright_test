import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Your setup code here (e.g., seeding data, logging in)
  console.log("Global teardown running...");
}

// Ensure this exact line is present at the bottom
export default globalTeardown;