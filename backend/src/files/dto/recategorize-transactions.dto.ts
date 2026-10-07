import { ArrayMaxSize, ArrayNotEmpty, IsArray, IsString } from 'class-validator';

export class RecategorizeTransactionsDto {
  /**
   * 재분류할 거래 ID 목록 (본인 거래만 처리됨)
   * @example ['uuid-1', 'uuid-2']
   */
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(500)
  @IsString({ each: true })
  ids: string[];
}
