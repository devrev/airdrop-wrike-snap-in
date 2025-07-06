import {
  axios,
  axiosClient,
  ExternalSystemAttachmentStreamingParams,
  ExternalSystemAttachmentStreamingResponse,
  ExtractorEventType,
  processTask,
  serializeAxiosError,
} from '@devrev/ts-adaas';
import { WrikeClient } from '../../core/wrike-client';

// Define the state type for the attachments extraction process
type ExtractorState = {
  attachments: {
    completed: boolean;
    spaceId: string;
    apiKey: string;
    projectId: string;
  };
};

// Process the attachments extraction task
processTask<ExtractorState>({
  task: async ({ adapter }) => {
    console.log('Starting attachments extraction');

    try {
      const { apiKey } = adapter.state.attachments;
      
      if (!apiKey) {
        throw new Error('Missing required state parameter: apiKey');
      }

      // Create a Wrike client
      const wrikeClient = new WrikeClient(apiKey);

      // Define the attachment stream handler
      const getAttachmentStream = async ({
        item,
      }: ExternalSystemAttachmentStreamingParams): Promise<ExternalSystemAttachmentStreamingResponse> => {
        const { id, url } = item;

        try {
          console.log(`Fetching attachment ${id} from URL: ${url}`);
          const fileStreamResponse = await axiosClient.get(url, {
            responseType: 'stream',
            headers: {
              'Accept-Encoding': 'identity',
            },
          });

          return { httpStream: fileStreamResponse };
        } catch (error) {
          // Error handling logic
          if (axios.isAxiosError(error)) {
            console.warn(`Error while fetching attachment ${id} from URL.`, serializeAxiosError(error));
            console.warn('Failed attachment metadata', item);
          } else {
            console.warn(`Error while fetching attachment ${id} from URL.`, error);
            console.warn('Failed attachment metadata', item);
          }

          return {
            error: {
              message: 'Error while fetching attachment ' + id + ' from URL.',
            },
          };
        }
      };

      // Stream attachments using the Airdrop SDK
      const response = await adapter.streamAttachments({
        stream: getAttachmentStream,
      });

      // Handle different response scenarios
      if (response?.delay) {
        console.log(`Delaying attachments extraction by ${response.delay} seconds`);
        await adapter.emit(ExtractorEventType.ExtractionAttachmentsDelay, {
          delay: response.delay,
        });
      } else if (response?.error) {
        console.error('Error during attachments extraction:', response.error);
        await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
          error: response.error,
        });
      } else {
        console.log('Attachments extraction completed successfully');
        // Update the state to indicate completion
        adapter.state.attachments.completed = true;
        await adapter.emit(ExtractorEventType.ExtractionAttachmentsDone);
      }
    } catch (error) {
      console.error('Error during attachments extraction:', error instanceof Error ? error.message : error);
      
      // Emit an error event with detailed error message
      await adapter.emit(ExtractorEventType.ExtractionAttachmentsError, {
        error: {
          message: `Failed to extract attachments: ${error instanceof Error ? error.message : 'Unknown error'}`
        }
      });
    }
  },
  onTimeout: async ({ adapter }) => {
    console.error('Attachments extraction timed out');
    
    // Post the current state to preserve progress
    await adapter.postState();
    
    // Emit a progress event to indicate timeout
    await adapter.emit(ExtractorEventType.ExtractionAttachmentsProgress, {
      progress: 50,
    });
  }
});