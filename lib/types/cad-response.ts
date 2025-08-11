import { z } from 'zod'

export const FileInfoSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(['step', 'iges', 'dwg', 'dxf']).or(z.string()),
})

export const EntitiesSchema = z.object({
  lines: z.number().int().nonnegative().default(0),
  circles: z.number().int().nonnegative().default(0),
  arcs: z.number().int().nonnegative().default(0),
  polylines: z.number().int().nonnegative().default(0),
  text: z.number().int().nonnegative().default(0),
  dimensions: z.number().int().nonnegative().default(0),
  blocks: z.number().int().nonnegative().default(0),
  faces: z.number().int().nonnegative().optional(),
  edges: z.number().int().nonnegative().optional(),
  vertices: z.number().int().nonnegative().optional(),
  shells: z.number().int().nonnegative().optional(),
  solids: z.number().int().nonnegative().optional(),
})

export const DimensionsSchema = z.object({
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  depth: z.number().nonnegative().optional(),
  unit: z.string().default('mm'),
})

export const MetadataSchema = z.object({
  author: z.string().optional(),
  createdAt: z.string().optional(),
  modifiedAt: z.string().optional(),
  software: z.string().optional(),
  version: z.string().optional(),
}).partial()

export const WarningSchema = z.object({
  message: z.string(),
  level: z.enum(['low', 'medium', 'high']).optional(),
})

export const CadParseResponseSchema = z.object({
  fileInfo: FileInfoSchema,
  entities: EntitiesSchema,
  assemblies: z.array(z.string()).default(['默认']).optional(),
  layers: z.array(z.string()).optional(),
  dimensions: DimensionsSchema,
  metadata: MetadataSchema,
  analysis: z.any().optional(),
  warnings: z.array(WarningSchema).optional(),
  devices: z.any().optional(),
  wiring: z.any().optional(),
})

export type CadParseResponse = z.infer<typeof CadParseResponseSchema>
