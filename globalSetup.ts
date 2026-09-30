import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Your setup code here (e.g., seeding data, logging in)
  console.log("Global setup running...");
}

// Ensure this exact line is present at the bottom
export default globalSetup;