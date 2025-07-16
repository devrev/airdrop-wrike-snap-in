import { run as healthcheck } from './functions/healthcheck';
import { run as extraction_workflow_check } from './functions/extraction_workflow_check';
import { run as data_push_check } from './functions/data_push_check';
import { run as extraction_external_sync_unit_check } from './functions/extraction_external_sync_unit_check';
import { run as data_extraction_check } from './functions/data_extraction_check';
import { run as auth_check } from './functions/auth_check';
import { run as fetch_projects } from './functions/fetch_projects';
import { run as fetch_contacts } from './functions/fetch_contacts';
import { run as fetch_tasks } from './functions/fetch_tasks';
import { run as generate_metadata } from './functions/generate_metadata';
import { run as generate_initial_mapping } from './functions/generate_initial_mapping';
import { run as extraction } from './functions/extraction';

export const functionFactory = {
  // Add your functions here
  healthcheck,
  extraction_workflow_check,
  data_push_check,
  extraction_external_sync_unit_check,
  data_extraction_check,
  auth_check,
  fetch_projects,
  fetch_contacts,
  fetch_tasks,
  generate_metadata,
  generate_initial_mapping,
  extraction
} as const;

export type FunctionFactoryType = keyof typeof functionFactory;
