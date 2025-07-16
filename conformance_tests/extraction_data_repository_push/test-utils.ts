import express from 'express';
import bodyParser from 'body-parser';
import { Server } from 'http';
import { setTimeout as setTimeoutPromise } from 'timers/promises';
import { AddressInfo } from 'net';

// Server configurations
export const CALLBACK_SERVER_PORT: number = 8002;
export const CALLBACK_SERVER_URL: string = `http://localhost:${CALLBACK_SERVER_PORT}`;

// Declare global variables for shared state
declare global {
  var callbackServer: Server | undefined;
  var receivedEvents: any[];
  var receivedEventTypes: string[];
  var eventPromiseResolvers: { [key: string]: (value: any) => void };
}

// Initialize global variables if they don't exist
global.receivedEvents = global.receivedEvents || [];
global.receivedEventTypes = global.receivedEventTypes || [];
global.eventPromiseResolvers = global.eventPromiseResolvers || {};

// Setup callback server to receive events from the snap-in
export function setupCallbackServer(): Promise<void> {
  // If server is already running, close it first to avoid port conflicts
  if (global.callbackServer) {
    console.log('Callback server already running, resetting events');
    global.receivedEvents = [];
    global.receivedEventTypes = [];
    global.eventPromiseResolvers = {};
    return Promise.resolve();
  }

  return new Promise((resolve, reject) => {
    // Create express app for callback server
    const app = express();
    app.use(bodyParser.json());

    // Endpoint to receive events from the snap-in
    app.post('/', (req, res) => {
      const event = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      
      console.log(`Callback server received event type: ${event.event_type}`);
      
      // Send a 200 OK response immediately
      res.status(200).send();
      
      // Process the event after sending the response
      
      // Add timestamp for ordering checks
      event.receivedAt = new Date().toISOString();
      global.receivedEvents.push(event);
      
      // Also track event types for easier checking
      if (event.event_type) {
        global.receivedEventTypes.push(event.event_type);
      }

      // Resolve any promises waiting for this event type
      if (event.event_type) {
        const resolver = global.eventPromiseResolvers[event.event_type];
        if (resolver) {
          resolver(event);
          delete global.eventPromiseResolvers[event.event_type];
        }
      }
    });

    // Create a catch-all route for any other requests
    app.use('*', (req, res) => {
      console.log(`Received request to ${req.originalUrl}`);
      res.status(200).send('Callback server is running');
    });

    // Handle server errors
    const server = app.listen(CALLBACK_SERVER_PORT);
    
    server.on('error', (err) => {
      console.error(`Failed to start callback server: ${err.message}`);
      reject(err);
    });
    
    server.on('listening', () => {
      console.log(`Callback server running at ${CALLBACK_SERVER_URL}`);
      global.callbackServer = server;
      resolve();
    });
  });
}

// Teardown callback server
export function teardownCallbackServer(): Promise<void> {
  return new Promise((resolve) => {
    const server = global.callbackServer;
    
    if (!server) {
      console.log('No callback server to close');
      resolve();
      return;
    }

    // Set a timeout in case the server doesn't close properly
    const timeoutId = setTimeout(() => {
      console.log('Forcing callback server closure after timeout');
      resolve();
    }, 5000);
    
    server.close(() => {
      clearTimeout(timeoutId);
      console.log('Callback server closed successfully');
      global.receivedEvents = [];
      global.callbackServer = undefined;
      resolve();
    });
  });
}

// Reset events before each test
export function resetEvents() {
  global.receivedEvents = [];
  global.receivedEventTypes = [];
  global.eventPromiseResolvers = {};
}

// Helper function to wait for a specific event or timeout
export function waitForEvent(eventType: string, timeoutMs: number = 60000): Promise<any> {
  console.log(`Setting up wait for event: ${eventType}`);
  
  return new Promise<any>((resolve, reject) => {
    // Check if we already received this event
    const existingEvent = global.receivedEvents.find(e => e && e.event_type === eventType);
    if (existingEvent) {
      console.log(`Found existing event of type ${eventType}`);
      return resolve(existingEvent);
    }

    console.log(`No existing event of type ${eventType}, setting up resolver`);
    
    // Set up polling to check for the event periodically
    // This is a backup in case the event handler doesn't trigger properly
    const pollInterval = setInterval(() => {
      const event = global.receivedEvents.find(e => e && e.event_type === eventType);
      if (event) {
        clearInterval(pollInterval);
        // Only resolve if the promise hasn't been resolved yet
        if (global.eventPromiseResolvers[eventType]) {
          resolve(event);
          delete global.eventPromiseResolvers[eventType];
        }
      }
    }, 1000);
    
    // Set up resolver for future event
    global.eventPromiseResolvers[eventType] = resolve;

    // Set timeout
    const timeoutId = setTimeout(() => {
      // Clean up the resolver to prevent memory leaks
      delete global.eventPromiseResolvers[eventType];
      clearInterval(pollInterval);
      
      // Log all received events for debugging
      const receivedEventTypes = global.receivedEvents.map(e => e.event_type).join(', ');
      console.error(`Timeout waiting for event ${eventType} after ${timeoutMs}ms.`);
      console.error(`Received events: ${receivedEventTypes}`);
      console.error(`Error details:`, global.receivedEvents.find(e => e.event_type === 'EXTRACTION_DATA_ERROR')?.event_data?.error);
      
      // Reject with detailed error
      reject(new Error(`Timeout waiting for event ${eventType} after ${timeoutMs}ms. Received events: ${receivedEventTypes}`));
    }, timeoutMs);

    // Add cleanup for the timeout when the promise resolves
    const cleanup = (result: any) => {
      clearTimeout(timeoutId);
      clearInterval(pollInterval);
      return result;
    };
    
    // The promise will be resolved by the event handler in the POST endpoint
    // and we'll clean up the timeout when it does
    resolve = ((originalResolve) => (value) => originalResolve(cleanup(value)))(resolve);
    global.eventPromiseResolvers[eventType] = resolve;
  });
}

// Helper function to check if an event has been received without waiting
export function hasReceivedEvent(eventType: string): boolean {
  return global.receivedEvents.some(e => e && e.event_type === eventType);
}

// Helper function to wait for any event with a timeout
export async function waitForAnyEventWithTimeout(timeoutMs: number = 30000): Promise<boolean> {
  const startCount = global.receivedEvents.length;
  const startTime = Date.now();
  
  while (Date.now() - startTime < timeoutMs) {
    if (global.receivedEvents.length > startCount) {
      return true;
    }
    await setTimeoutPromise(500); // Wait 500ms before checking again
  }
  
  // If we get here, we timed out
  console.log(`Timed out waiting for any event after ${timeoutMs}ms`);
  console.log(`Current events: ${global.receivedEventTypes.join(', ')}`);
  
  return false;
}

// Helper function to wait for any event matching a predicate
export function waitForAnyEvent(predicate: (event: any) => boolean, timeoutMs: number = 60000): Promise<any> {
  return new Promise((resolve, reject) => {
    const existingEvent = global.receivedEvents.find(predicate);
    if (existingEvent) return resolve(existingEvent);

    const intervalId = setInterval(() => {
      const event = global.receivedEvents.find(predicate);
      if (event) {
        clearInterval(intervalId);
        clearTimeout(timeoutId);
        resolve(event);
      }
    }, 100);

    const timeoutId = setTimeout(() => {
      clearInterval(intervalId);
      reject(new Error(`Timeout waiting for matching event after ${timeoutMs}ms`));
    }, timeoutMs);
  });
}