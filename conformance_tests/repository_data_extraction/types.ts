/**
 * Type definitions for callback data
 */
export interface CallbackData {
  type: string;
  data: any;
  path: string;
  timestamp: Date;
}

/**
 * Type definitions for extraction event
 */
export interface ExtractionEvent {
  context: any;
  payload: any;
  execution_metadata: any;
  input_data: any;
}