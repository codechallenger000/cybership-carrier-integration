import { z } from "zod";

export const AddressSchema = z.object({
  name: z.string().optional(),
  addressLine1: z.string().min(1),
  addressLine2: z.string().optional(),
  city: z.string().min(1),
  stateProvinceCode: z.string().min(1).optional(),
  postalCode: z.string().min(1),
  countryCode: z.string().min(2).max(2)
});

export const PackageSchema = z.object({
  lengthIn: z.number().positive(),
  widthIn: z.number().positive(),
  heightIn: z.number().positive(),
  weightLb: z.number().positive()
});

export const RateRequestSchema = z.object({
  carrier: z.literal("UPS"),
  origin: AddressSchema,
  destination: AddressSchema,
  packages: z.array(PackageSchema).min(1),
  serviceLevel: z.string().min(1).optional(),
  shipDateISO: z.string().min(10).optional()
});
