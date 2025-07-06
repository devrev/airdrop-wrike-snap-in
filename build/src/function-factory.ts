import { canInvoke } from './functions/can-invoke';
import { canInvokeExtraction } from './functions/can-invoke-extraction';
import { canPushData } from './functions/can-push-data';
import { check_wrike_auth } from './functions/check-wrike-auth';
import { data_extraction_check } from './functions/data-extraction-check';
import { fetch_wrike_contacts } from './functions/fetch-wrike-contacts';
import { fetch_wrike_projects } from './functions/fetch-wrike-projects';
import { fetch_wrike_tasks } from './functions/fetch-wrike-tasks';
import { extraction_external_sync_unit_check } from './functions/extraction-external-sync-unit-check';
import { generate_initial_domain_mapping } from './functions/generate-initial-domain-mapping';
import { generate_external_domain_metadata } from './functions/generate-external-domain-metadata';
import { extraction } from './functions/extraction';

export const functionFactory = {
  // Add your functions here
  canInvoke,
  canInvokeExtraction,
  canPushData,
  check_wrike_auth,
  fetch_wrike_contacts,
  data_extraction_check,
  fetch_wrike_tasks,
  fetch_wrike_projects,
  extraction_external_sync_unit_check,
  generate_external_domain_metadata,
  generate_initial_domain_mapping,
  extraction,
} as const;

export type FunctionFactoryType = keyof typeof functionFactory;
