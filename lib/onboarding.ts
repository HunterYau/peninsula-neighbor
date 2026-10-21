import {z} from 'zod';
import {areas} from './validation.ts';
import {interests} from './community-model.ts';
export const onboardingSchema=z.object({skip:z.boolean().default(false),name:z.string().trim().min(2).max(40).optional(),area:z.enum(areas).optional(),interests:z.array(z.enum(interests)).max(9).default([])});
