import { ExtractorEventType, NormalizedItem, processTask, RepoInterface } from '@devrev/ts-adaas';

processTask({
  task: async ({ adapter }) => {
    console.log('Starting extraction of attachments...');
    await adapter.emit(ExtractorEventType.ExtractionAttachmentsDone);
  },
  onTimeout: async ({ adapter }) => {
    await adapter.emit(ExtractorEventType.ExtractionAttachmentsError);
  }
});