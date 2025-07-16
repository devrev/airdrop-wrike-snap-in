// This file is used to set up the test environment
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config();

// Check for required environment variables
const requiredEnvVars = ['WRIKE_API_KEY', 'WRIKE_SPACE_GID'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
  console.error(`Missing required environment variables: ${missingEnvVars.join(', ')}`);
  console.error('Please set these variables in your environment or .env file');
  process.exit(1);
}