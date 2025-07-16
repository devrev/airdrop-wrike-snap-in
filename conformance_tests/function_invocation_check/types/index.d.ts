import { AirdropEvent } from '@devrev/ts-adaas';

// Extend the AirdropEvent interface to include function_name in execution_metadata
declare module '@devrev/ts-adaas' {
  interface AirdropEvent {
    execution_metadata: {
      devrev_endpoint: string;
      function_name?: string;
    };
  }
}