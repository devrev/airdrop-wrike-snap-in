import axios from 'axios';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { AddressInfo } from 'net';
import { EventType, ExtractorEventType } from '@devrev/ts-adaas';

// Constants
const SNAP_IN_SERVER_URL = 'http://localhost:8000/handle/sync';
const CALLBACK_SERVER_PORT = 8002;
const TEST_DATA_FILE = 'data_extraction_check.json';
const TEST_DATA_PATH = path.resolve(__dirname, '../resources/data_extraction_check.json');

// Interface for callback server requests
interface CallbackRequest {
  method: string;
  url: string;
  headers: http.IncomingHttpHeaders;
  body: any;
}

describe('Data Extraction Acceptance Test', () => {
  let callbackServer: http.Server;
  let callbackServerUrl: string;
  let callbackRequests: CallbackRequest[] = [];
  let testEventData: any;

  // Setup callback server before tests
  beforeAll((done) => {
    console.log('Setting up callback server...');
    
    // Create a simple HTTP server to act as the callback server
    callbackServer = http.createServer((req, res) => {
      console.log(`Callback server received request: ${req.method} ${req.url}`);
      
      let body = '';      
      req.on('data', (chunk) => {
        body += chunk.toString();
      });
      
      req.on('end', () => {
        console.log(`Callback request body: ${body}`);
        
        // Store the request for later verification
        const parsedBody = body ? (() => {
          try {
            return JSON.parse(body);
          } catch (e) {
            console.error(`Error parsing callback request body: ${e}`);
            return body;
          }
        })() : {};
        
        callbackRequests.push({
          method: req.method || '',
          url: req.url || '',
          headers: req.headers,
          body: parsedBody
        });
        
        // Send a success response
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'success' }));
      });
    });

    // Start the server and get the assigned port
    callbackServer.listen(CALLBACK_SERVER_PORT, 'localhost', () => {
      const address = callbackServer.address() as AddressInfo;
      callbackServerUrl = `http://localhost:${CALLBACK_SERVER_PORT}`;
      console.log(`Callback server started at ${callbackServerUrl}`);
      
      // Load the test event data
      try {
        // First try to load from the current directory
        const currentDirPath = path.resolve(__dirname, TEST_DATA_FILE);
        if (fs.existsSync(currentDirPath)) {
          const fileContent = fs.readFileSync(currentDirPath, 'utf8');
          testEventData = JSON.parse(fileContent);
        } else {
          console.error(`Test data file not found at: ${currentDirPath}`);
          testEventData = require('./data_extraction_check.json');
        }
        
        console.log('Test event data loaded successfully');
        done();
      } catch (error) {
        console.error(`Error loading test data: ${error}`);
        done(error as Error);
      }
    });
  });

  // Clean up after tests
  afterAll((done) => {
    console.log('Cleaning up resources...');
    if (callbackServer && callbackServer.listening) {
      callbackServer.close(() => {
        console.log('Callback server closed');
        done();
      });
    } else {
      done();
    }
  });

  // Reset callback requests before each test
  beforeEach(() => {
    callbackRequests = [];
  });

  test('should receive EXTRACTION_DATA_DONE event from DevRev', async () => {
    // Skip if test data couldn't be loaded
    if (!testEventData) {
      console.error('Test data not available, skipping test');
      return;
    }
    
    console.log('Starting acceptance test for data extraction...');
    
    // Update the callback URL in the test event
    if (testEventData.payload && testEventData.payload.event_context) {
      testEventData.payload.event_context.callback_url = callbackServerUrl + '/callback';
      console.log(`Updated callback URL to: ${testEventData.payload.event_context.callback_url}`);
    } else {
      fail('Test event data is missing required fields: payload.event_context');
    }
    
    // Send the event to the snap-in server
    console.log('Sending event to snap-in server...');
    try {
      const response = await axios.post(SNAP_IN_SERVER_URL, testEventData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      console.log(`Snap-in server response status: ${response.status}`);
      console.log(`Snap-in server response data: ${JSON.stringify(response.data)}`);
      
      // Verify the response
      expect(response.status).toBe(200);
      
      // Log the full response for debugging
      console.log(`Full response data: ${JSON.stringify(response.data, null, 2)}`);
      
      // Check if we have a function_result or an error
      if (response.data.function_result) {
        expect(response.data.function_result).toBeDefined();
        expect(response.data.function_result.status).toBe('success');
      }
      expect(response.data.error).toBeUndefined();
      
      // Wait for the worker to complete and send events to the callback server
      console.log('Waiting for callback events...');
      
      // Wait up to 30 seconds for the EXTRACTION_DATA_DONE event
      const maxWaitTime = 30000; // 30 seconds
      const checkInterval = 1000; // 1 second
      let elapsedTime = 0;
      let doneEvent: CallbackRequest | undefined = undefined;
      let receivedDoneEvent = false;
      
      while (elapsedTime < maxWaitTime) {
        // Check if we've received the EXTRACTION_DATA_DONE event
        const doneEvent = callbackRequests.find(req => 
          req.body && 
          req.body.event_type === ExtractorEventType.ExtractionDataDone
        );        
        
        if (doneEvent) {
          console.log('Received EXTRACTION_DATA_DONE event!');
          // Store the found event in the outer scope variable
          receivedDoneEvent = true;
          break;
        }
        
        // Wait for the next check interval
        await new Promise(resolve => setTimeout(resolve, checkInterval));
        elapsedTime += checkInterval;
        
        console.log(`Waiting for EXTRACTION_DATA_DONE event... (${elapsedTime / 1000}s elapsed)`);
      }
      
      // Log all received callback requests for debugging
      console.log(`Received ${callbackRequests.length} callback requests:`);
      callbackRequests.forEach((req, index) => {
        console.log(`Request ${index + 1}:`);
        console.log(`  Method: ${req.method}`);
        console.log(`  URL: ${req.url}`);
        console.log(`  Body: ${JSON.stringify(req.body)}`);
      });
      
      // Find the EXTRACTION_DATA_DONE event in the callback requests
      // This is the critical fix - we need to assign to the outer doneEvent variable
      doneEvent = callbackRequests.find(req => 
        req.body && 
        req.body.event_type === ExtractorEventType.ExtractionDataDone
      );
      
      // Log whether we found the event
      console.log('Final check for EXTRACTION_DATA_DONE event:', doneEvent ? 'Found' : 'Not found');
      
      // If we found the event, log its details for debugging
      if (doneEvent)
        console.log(`Found EXTRACTION_DATA_DONE event: ${JSON.stringify(doneEvent.body)}`);
      
      expect(doneEvent).toBeDefined();
      expect(doneEvent?.body.event_type).toBe(ExtractorEventType.ExtractionDataDone);
      
    } catch (error: any) {
      console.error('Error during test execution:');
      if (error.response) {
        console.error(`Response status: ${error.response.status}`);
        console.error(`Response data: ${JSON.stringify(error.response.data)}`);
      } else {
        console.error(error);
      }
      throw error;
    }
  }, 60000); // 60 second timeout for this specific test
});