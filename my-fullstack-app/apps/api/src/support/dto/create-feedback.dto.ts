import { IsIn, IsString, MinLength } from 'class-validator';
import type { CreateFeedbackInput, FeedbackType } from '@repo/shared';

export class CreateFeedbackDto implements CreateFeedbackInput {
  @IsIn(['general', 'bug', 'feature', 'usability'])
  type: FeedbackType;

  @IsString()
  @MinLength(1)
  content: string;
}