import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
  @ApiProperty({ example: 'uuid-of-service-request' })
  jobId: string;

  @ApiProperty({ example: 'Hello, when can you come fix the sink?' })
  content: string;
}
