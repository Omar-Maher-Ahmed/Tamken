import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DocumentType } from '@/shared';

export class SubmitDocumentDto {
  @ApiProperty({
    enum: DocumentType,
    example: DocumentType.ID_CARD,
  })
  documentType: string;

  @ApiProperty({ example: 'https://storage.example.com/docs/national-id.pdf' })
  documentUrl: string;
}

export class ReviewDocumentDto {
  @ApiProperty({ enum: ['approved', 'rejected'], example: 'approved' })
  status: 'approved' | 'rejected';

  @ApiPropertyOptional({ example: 'Document is blurry, please re-upload' })
  rejectionReason?: string;
}
