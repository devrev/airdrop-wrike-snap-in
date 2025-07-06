import { EventType } from '@devrev/ts-adaas';

// Mock the domain-mapping-utils module
jest.mock('../../core/domain-mapping-utils', () => ({
  readInitialDomainMapping: jest.fn().mockReturnValue(
    { 
      format_version: 'v1', devrev_metadata_version: 1, additional_mappings: { record_type_mappings: {} } 
    }
  )
}));

// Mock the spawn function from the Airdrop SDK
jest.mock('@devrev/ts-adaas', () => ({
  ...jest.requireActual('@devrev/ts-adaas'),
  spawn: jest.fn().mockImplementation(() => Promise.resolve())
}));

// Import after mocking to ensure we get the mocked version
import { spawn } from '@devrev/ts-adaas';
import { readInitialDomainMapping } from '../../core/domain-mapping-utils';
import { testCases } from './extraction.test.cases';
 
describe('extraction function', () => {
  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return success when external sync units extraction completes successfully', 
    testCases.testExternalSyncUnitsSuccess);

  it('should return success when metadata extraction completes successfully', 
    testCases.testMetadataExtractionSuccess);

  it('should return success when data extraction completes successfully', 
    testCases.testDataExtractionSuccess);

  it('should return success when attachments extraction completes successfully', 
    testCases.testAttachmentsExtractionSuccess);

  it('should return false when external_sync_unit_id is missing for data extraction', 
    testCases.testMissingExternalSyncUnitId);

  it('should return false when no events are provided', 
    testCases.testNoEvents);

  it('should return false when event payload is missing', 
    testCases.testMissingPayload);

  it('should return false when event type is not supported', 
    testCases.testUnsupportedEventType);

  it('should return false when authentication context is missing', 
    testCases.testMissingAuthContext);

  it('should return false when connection data is missing for external sync units', 
    testCases.testMissingConnectionData);

  it('should return false when API key is missing for external sync units', 
    testCases.testMissingApiKey);

  it('should return false when space ID is missing for external sync units', 
    testCases.testMissingSpaceId);

  it('should return false when spawn throws an error for external sync units', 
    testCases.testSpawnErrorForExternalSyncUnits);

  it('should return false when spawn throws an error for metadata extraction', 
    testCases.testSpawnErrorForMetadataExtraction);

  it('should return false when spawn throws an error for attachments extraction', 
    testCases.testSpawnErrorForAttachmentsExtraction);

  it('should handle unexpected errors gracefully', 
    testCases.testUnexpectedErrors);
});