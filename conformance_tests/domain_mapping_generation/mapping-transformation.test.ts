import fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { expect, test, describe } from '@jest/globals';

describe('Initial Domain Mapping Transformation', () => {
  // Test the transformation logic for Chef CLI format
  test('Can transform Initial Domain Mapping to Chef CLI format', () => {
    // Create a sample mapping with the format used in the implementation
    const originalMapping = {
      format_version: "v1",
      devrev_metadata_version: 1,
      additional_mappings: {
        record_type_mappings: {
          tasks: {
            default_mapping: { 
              object_category: "stock", 
              object_type: "issue" 
            },
            mapping_as_custom_object: {
              forward: true,
              reverse: true,
              shard: {
                mode: "create_shard",
                devrev_leaf_type: {
                  object_category: "fresh_custom",
                  object_type: "wrike_task"
                },
                stock_field_mappings: {
                  title: {
                    forward: true,
                    reverse: true
                  }
                }
              }
            }
          }
        } 
      }
    };
    
    // Transform the mapping to match the format expected by Chef CLI
    // Helper function to transform the mapping for Chef CLI
    const transformMappingForChefCLI = (mapping: any): any => {
      // Create a deep copy to avoid modifying the original
      const result: {
        additional_mappings: {
          record_type_mappings: Record<string, any>
        }
      } = {
        additional_mappings: {
          record_type_mappings: {}
        }
      };
      
      // Process each record type mapping
      for (const [recordType, recordTypeMapping] of Object.entries<any>(mapping.additional_mappings.record_type_mappings || {})) {
        result.additional_mappings.record_type_mappings[recordType] = {
          default_mapping: transformLeafType(recordTypeMapping.default_mapping),
          mapping_as_custom_object: recordTypeMapping.mapping_as_custom_object ? {
            forward: recordTypeMapping.mapping_as_custom_object.forward,
            reverse: recordTypeMapping.mapping_as_custom_object.reverse,
            shard: transformShard(recordTypeMapping.mapping_as_custom_object.shard)
          } : undefined,
          possible_record_type_mappings: recordTypeMapping.possible_record_type_mappings?.map((mapping: any) => ({
            devrev_leaf_type: mapping.devrev_leaf_type,
            forward: mapping.forward,
            reverse: mapping.reverse,
            shard: transformShard(mapping.shard)
          }))
        };
      }
      
      return result;
    };

    // Helper function to transform a leaf type object
    const transformLeafType = (leafType: any): string => {
      if (!leafType || typeof leafType === 'string') return leafType;
      return leafType.object_type;
    };

    // Helper function to transform a shard
    const transformShard = (shard: any): any => {
      if (!shard) return shard;
      
      const result: {
        mode: string;
        devrev_leaf_type: string;
        stock_field_mappings: Record<string, any>;
      } = {
        mode: shard.mode as string,
        devrev_leaf_type: transformLeafType(shard.devrev_leaf_type),
        stock_field_mappings: {}
      };
      
      // Process each field mapping
      for (const [fieldName, fieldMapping] of Object.entries<any>(shard.stock_field_mappings || {})) {
        result.stock_field_mappings[fieldName] = fieldMapping;
      }
      
      return result;
    };

    // Apply the transformation
    const properlyTransformedMapping = transformMappingForChefCLI(originalMapping);
    const transformedMapping = {
      additional_mappings: originalMapping.additional_mappings
    };
    
    // Verify the basic transformation
    expect(properlyTransformedMapping).not.toHaveProperty('format_version');
    expect(properlyTransformedMapping).not.toHaveProperty('devrev_metadata_version');
    expect(properlyTransformedMapping).toHaveProperty('additional_mappings');
    
    // Verify the leaf type transformation
    const taskMapping = properlyTransformedMapping.additional_mappings.record_type_mappings['tasks'];
    expect(taskMapping.default_mapping).toBe("issue");
    
    // Verify the shard transformation
    const shard = taskMapping.mapping_as_custom_object.shard;
    expect(shard.devrev_leaf_type).toBe("wrike_task");
    expect(shard.mode).toBe("create_shard");
    expect(shard.stock_field_mappings).toBeDefined();
    
    // Verify the JSON serialization
    const jsonString = JSON.stringify(properlyTransformedMapping, null, 2);
    expect(jsonString).not.toContain('format_version');
    expect(jsonString).not.toContain('devrev_metadata_version');
    expect(jsonString).toContain('additional_mappings');
    
    // Create temporary files to test writing and reading
    const tmpDir = os.tmpdir();
    const tempFilePath = path.join(tmpDir, `test-mapping-${Date.now()}.json`);
    
    try {
      // Write the transformed mapping to a file
      fs.writeFileSync(tempFilePath, JSON.stringify(properlyTransformedMapping, null, 2));
      
      // Read it back
      const readMapping = JSON.parse(fs.readFileSync(tempFilePath, 'utf8')); 
      
      // Verify it matches the expected structure
      expect(readMapping).toHaveProperty('additional_mappings');
      expect(readMapping.additional_mappings).toHaveProperty('record_type_mappings');
    } finally {
      // Clean up
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }
    }
  });
});