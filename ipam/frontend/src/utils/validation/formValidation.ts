import { z, ZodError, ZodSchema } from 'zod';

/**
 * Common validation schemas for reuse
 */
export const commonSchemas = {
  // String fields
  name: z.string().min(1, 'Name is required').max(150, 'Name must be less than 150 characters'),
  slug: z.string().min(1, 'Slug is required').max(100, 'Slug must be less than 100 characters').regex(/^[a-z0-9_-]+$/, 'Slug must contain only lowercase letters, numbers, underscores, and hyphens'),
  description: z.string().optional(),
  
  // Number fields
  id: z.number().int().positive('ID must be a positive integer'),
  
  // Boolean fields
  boolean: z.boolean().optional(),
  
  // Special fields
  ipAddress: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}(\/\d{1,2})?$/, 'Invalid IP address format'),
  cidr: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/, 'Invalid CIDR notation'),
  vlanId: z.number().int().min(1, 'VLAN ID must be at least 1').max(4094, 'VLAN ID must be at most 4094'),
  asn: z.number().int().min(1, 'ASN must be at least 1').max(4294967295, 'ASN must be at most 4294967295'),
  routeDistinguisher: z.string().regex(/^[0-9]+:[0-9]+$/, 'Invalid route distinguisher format (e.g. 65000:1)').optional(),
  
  // Status fields
  genericStatus: z.enum(['active', 'reserved', 'deprecated', 'available']),
  deviceStatus: z.enum(['active', 'offline', 'planned', 'staged', 'failed']),
  siteStatus: z.enum(['active', 'planned', 'retired']),
  
  // Reference fields
  reference: z.number().int().positive().nullable().optional(),
};

/**
 * Validate form data against a schema
 */
export function validateFormData<T>(
  formData: Record<string, any>,
  schema: ZodSchema<T>
): { isValid: boolean; errors: Record<string, string>; validatedData?: T } {
  try {
    const validatedData = schema.parse(formData);
    return { isValid: true, errors: {}, validatedData };
  } catch (error) {
    if (error instanceof ZodError) {
      const formattedErrors: Record<string, string> = {};
      
      error.errors.forEach((err) => {
        const field = err.path.join('.');
        formattedErrors[field] = err.message;
      });
      
      return { isValid: false, errors: formattedErrors };
    }
    
    return { 
      isValid: false, 
      errors: { '_general': 'An unexpected validation error occurred' } 
    };
  }
}

/**
 * Entity specific validation schemas
 */

// Region validation schema
export const regionSchema = z.object({
  name: commonSchemas.name,
  slug: commonSchemas.slug,
  description: commonSchemas.description,
  parent_id: commonSchemas.reference,
});

// Site validation schema
export const siteSchema = z.object({
  name: commonSchemas.name,
  slug: commonSchemas.slug,
  status: commonSchemas.siteStatus,
  region_id: commonSchemas.reference,
  site_group_id: commonSchemas.reference,
  description: commonSchemas.description,
  latitude: z.number().min(-90).max(90).nullable().optional(),
  longitude: z.number().min(-180).max(180).nullable().optional(),
});

// VRF validation schema
export const vrfSchema = z.object({
  name: commonSchemas.name,
  rd: commonSchemas.routeDistinguisher,
  tenant_id: commonSchemas.reference,
  enforce_unique: z.boolean().optional(),
  description: commonSchemas.description,
});

// Prefix validation schema
export const prefixSchema = z.object({
  prefix: commonSchemas.cidr,
  status: commonSchemas.genericStatus,
  vrf_id: commonSchemas.reference,
  tenant_id: commonSchemas.reference,
  site_id: commonSchemas.reference,
  vlan_id: commonSchemas.reference,
  role_id: commonSchemas.reference,
  is_pool: z.boolean().optional(),
  description: commonSchemas.description,
});

// IP Address validation schema
export const ipAddressSchema = z.object({
  address: commonSchemas.ipAddress,
  status: commonSchemas.genericStatus,
  vrf_id: commonSchemas.reference,
  tenant_id: commonSchemas.reference,
  role: z.string().nullable().optional(),
  assigned_object_type: z.string().nullable().optional(),
  assigned_object_id: commonSchemas.reference,
  description: commonSchemas.description,
});

// VLAN validation schema
export const vlanSchema = z.object({
  vid: commonSchemas.vlanId,
  name: commonSchemas.name,
  status: commonSchemas.genericStatus,
  vlan_group_id: commonSchemas.reference,
  tenant_id: commonSchemas.reference,
  site_id: commonSchemas.reference,
  role_id: commonSchemas.reference,
  description: commonSchemas.description,
});

// VLAN Group validation schema
export const vlanGroupSchema = z.object({
  name: commonSchemas.name,
  slug: commonSchemas.slug,
  description: commonSchemas.description,
  site_id: commonSchemas.reference,
});

// Device validation schema
export const deviceSchema = z.object({
  name: commonSchemas.name,
  status: commonSchemas.deviceStatus,
  site_id: commonSchemas.reference,
  tenant_id: commonSchemas.reference,
  platform: z.string().nullable().optional(),
  primary_ip4_id: commonSchemas.reference,
  primary_ip6_id: commonSchemas.reference,
  description: commonSchemas.description,
});

// ASN validation schema
export const asnSchema = z.object({
  asn: commonSchemas.asn,
  tenant_id: commonSchemas.reference,
  description: commonSchemas.description,
});

// Credential validation schema
export const credentialSchema = z.object({
  name: commonSchemas.name,
  username: z.string().min(1, 'Username is required'),
  password: z.string().optional(),
  description: commonSchemas.description,
});

/**
 * Schema map by table name
 */
export const validationSchemas: Record<string, ZodSchema<any>> = {
  regions: regionSchema,
  sites: siteSchema,
  vrfs: vrfSchema,
  prefixes: prefixSchema,
  ip_addresses: ipAddressSchema,
  vlans: vlanSchema,
  vlan_groups: vlanGroupSchema,
  devices: deviceSchema,
  asns: asnSchema,
  credentials: credentialSchema,
};

/**
 * Get a validation schema for a table
 */
export function getValidationSchema(tableName: string): ZodSchema<any> {
  return validationSchemas[tableName] || z.object({}).passthrough();
}

/**
 * Validate form data for a specific table
 */
export function validateTableData(
  tableName: string,
  formData: Record<string, any>
): { isValid: boolean; errors: Record<string, string>; validatedData?: any } {
  const schema = getValidationSchema(tableName);
  return validateFormData(formData, schema);
} 