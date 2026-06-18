import { IsNotEmpty, IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateChildDto {
  @ApiProperty({ example: 'Ahmed' })
  @IsNotEmpty()
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Al-Saud' })
  @IsNotEmpty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: 'أحمد' })
  @IsOptional()
  @IsString()
  firstNameAr?: string;

  @ApiPropertyOptional({ example: 'آل سعود' })
  @IsOptional()
  @IsString()
  lastNameAr?: string;

  @ApiProperty({ example: '2020-05-15' })
  @IsNotEmpty()
  @IsDateString()
  dateOfBirth: string;

  @ApiProperty({ enum: ['MALE', 'FEMALE'] })
  @IsNotEmpty()
  @IsEnum(['MALE', 'FEMALE'])
  gender: string;

  @ApiPropertyOptional({ example: '2024-09-01' })
  @IsOptional()
  @IsDateString()
  enrollmentDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  medicalNotes?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  allergies?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodType?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationalId?: string;

  @ApiPropertyOptional({ description: 'Parent user ID to link' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'Relationship to parent' })
  @IsOptional()
  @IsString()
  parentRelationship?: string;

  @ApiPropertyOptional({ description: 'Class ID to assign' })
  @IsOptional()
  @IsString()
  classId?: string;

  @ApiPropertyOptional({ description: 'Academic year' })
  @IsOptional()
  @IsString()
  academicYear?: string;
}
