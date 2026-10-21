import {z} from 'zod';
import {areas} from './validation.ts';
import {personalizationFields} from './personalization.ts';
export const onboardingSchema=z.object({skip:z.boolean().default(false),name:z.string().trim().min(2).max(40).optional(),area:z.enum(areas).optional(),interests:personalizationFields.interests,goals:personalizationFields.goals.optional(),placeTypes:personalizationFields.placeTypes.optional(),helpStyles:personalizationFields.helpStyles.optional()});
