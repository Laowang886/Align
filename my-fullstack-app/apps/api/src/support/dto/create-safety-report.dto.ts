import { IsIn, IsString, MinLength } from 'class-validator';
import type { CreateSafetyReportInput, SafetyCategory } from '@repo/shared';

export class CreateSafetyReportDto implements CreateSafetyReportInput {
  @IsIn(['harassment', 'exploit', 'privacy', 'other'])
  category: SafetyCategory;

  @IsString()
  @MinLength(1)
  description: string;
}