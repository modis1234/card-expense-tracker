import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class DeleteTransactionsDto {
  /**
   * 삭제할 거래 ID 목록 (본인 거래만 삭제됨)
   * @example ['uuid-1', 'uuid-2']
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(1000)
  @IsString({ each: true })
  ids: string[];
}
