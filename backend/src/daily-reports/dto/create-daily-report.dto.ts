import { IsNotEmpty, IsOptional, IsString, IsDateString, IsBoolean, IsArray } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDailyReportDto {
  @ApiProperty({ description: 'Child ID' })
  @IsNotEmpty()
  @IsString()
  childId: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsNotEmpty()
  @IsDateString()
  date: string;

  @ApiPropertyOptional({
    description: 'Meals information',
    example: [{ type: 'breakfast', amount: 'all', notes: 'Ate well' }],
  })
  @IsOptional()
  meals?: any;

  @ApiPropertyOptional({
    description: 'Sleep information',
    example: { startTime: '12:00', endTime: '14:00', quality: 'good' },
  })
  @IsOptional()
  sleep?: any;

  @ApiPropertyOptional({
    description: 'Toileting information',
    example: { diaperChanges: 2, toiletVisits: 1, notes: '' },
  })
  @IsOptional()
  toileting?: any;

  @ApiPropertyOptional({ description: 'Activities description' })
  @IsOptional()
  @IsString()
  activities?: string;

  @ApiPropertyOptional({ description: 'Child mood', example: 'happy' })
  @IsOptional()
  @IsString()
  mood?: string;

  @ApiPropertyOptional({ description: 'Teacher notes' })
  @IsOptional()
  @IsString()
  teacherNotes?: string;

  @ApiPropertyOptional({ description: 'Photo URLs' })
  @IsOptional()
  photos?: any;

  @ApiPropertyOptional({ description: 'Whether to publish immediately' })
  @IsOptional()
  @IsBoolean()
  isPublished?: boolean;
}
