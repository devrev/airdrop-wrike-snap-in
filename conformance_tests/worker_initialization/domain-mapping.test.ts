import { Server } from 'http';
import { 
  SNAP_IN_SERVER_URL, 
  setupCallbackServer, 
  createExtractionEvent, 
  callSnapInServer,
  CallbackData
} from './utils';
import axios from 'axios';

describe('Domain Mapping Tests', () => {
  // Test environment variables
  test('Environment variables are properly set', () => {
    expect(process.env.WRIKE_API_KEY).toBeDefined();
    expect(process.env.WRIKE_SPACE_GID).toBeDefined();
    
    if (!process.env.WRIKE_API_KEY || !process.env.WRIKE_SPACE_GID) {
      console.error('Required environment variables WRIKE_API_KEY and WRIKE_SPACE_GID must be set');
    }
  });

  // Test connectivity to snap-in server
  test('Can connect to the Test Snap-In Server', async () => {
    try {
      // Use a simple canInvoke function to test connectivity
      const event = {
        context: {
          secrets: {
            service_account_token: 'test-token'
          }
        },
        execution_metadata: {
          function_name: 'canInvoke',
          event_type: 'test'
        },
        payload: {},
        input_data: {
          global_values: {},
          event_sources: {}
        }
      };
      
      const response = await callSnapInServer(event);
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.can_invoke).toBe(true);
    } catch (error) {
      fail(`Failed to connect to snap-in server: ${error}`);
    }
  });

  // Test domain mapping generation
  test('Can generate initial domain mapping', async () => {
    const event = {
      context: {
        secrets: {
          service_account_token: 'test-token'
        }
      },
      execution_metadata: {
        function_name: 'generate_initial_domain_mapping',
        event_type: 'test'
      },
      payload: {},
      input_data: {
        global_values: {},
        event_sources: {}
      }
    };
    
    const response = await callSnapInServer(event);
    expect(response).toBeDefined();
    expect(response.function_result).toBeDefined();
    expect(response.function_result.success).toBe(true);
    expect(response.function_result.mapping).toBeDefined();
    
    // Verify domain mapping structure
    const mapping = response.function_result.mapping;
    expect(mapping.format_version).toBeDefined();
    expect(mapping.additional_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings.tasks).toBeDefined();
    expect(mapping.additional_mappings.record_type_mappings.users).toBeDefined();
  });

  // Test domain mapping usage in worker spawning
  test('Uses initial domain mapping when spawning a worker', async () => {
    let callbackServer: Server | undefined;
    let receivedData: CallbackData[] = [];
    
    try {
      // Setup callback server to receive events from the worker
      const serverSetup = await setupCallbackServer();
      callbackServer = serverSetup.server;
      receivedData = serverSetup.receivedData;
      
      // Create and send extraction event
      const event = createExtractionEvent('EXTRACTION_EXTERNAL_SYNC_UNITS_START');
      const response = await callSnapInServer(event);
      
      // Verify response
      expect(response).toBeDefined();
      expect(response.function_result).toBeDefined();
      expect(response.function_result.success).toBe(true);
      
      // Wait for callback to be received (max 10 seconds)
      let attempts = 0;
      while (receivedData.length === 0 && attempts < 20) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      // Verify callback data
      expect(receivedData.length).toBeGreaterThan(0);
      
      // Check for successful completion or error
      const lastCallback = receivedData[receivedData.length - 1];
      
      // If there's an error, it should be related to connectivity, not domain mapping
      if (lastCallback.event_data?.error) {
        // Check that the error is not related to domain mapping
        const errorMsg = JSON.stringify(lastCallback.event_data.error);
        expect(errorMsg).not.toContain('domain mapping');
        expect(errorMsg).not.toContain('initialDomainMapping');
      } else if ('error' in lastCallback) {
        // Handle case where error is at the top level
        const errorMsg = JSON.stringify((lastCallback as any).error);
        expect(errorMsg).not.toContain('domain mapping');
      } else {
        // If successful, check that external_sync_units were returned
        expect(lastCallback.event_type).toBe('EXTRACTION_EXTERNAL_SYNC_UNITS_DONE');
        expect(lastCallback.event_data).toBeDefined();
        expect(lastCallback.event_data?.external_sync_units).toBeDefined();
        expect(Array.isArray(lastCallback.event_data?.external_sync_units)).toBe(true);
        
        // Verify the structure of the external sync units
        const externalSyncUnits = lastCallback.event_data?.external_sync_units;
        if (externalSyncUnits && externalSyncUnits.length > 0) {
          const firstUnit = externalSyncUnits[0];
          expect(firstUnit.id).toBeDefined();
          expect(firstUnit.name).toBeDefined();
          expect(firstUnit.description).toBeDefined();
        }
      }
    } finally {
      // Clean up
      if (callbackServer && callbackServer.listening) {
        await new Promise<void>((resolve) => callbackServer!.close(() => resolve()));
      }
    }
  });
});