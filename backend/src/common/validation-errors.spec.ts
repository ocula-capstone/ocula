import { plainToInstance, Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  Min,
  ValidateNested,
  validateSync,
} from 'class-validator';
import { flattenValidationErrors } from './validation-errors.js';

class EyeDto {
  @IsNumber()
  sphere: number;
}

class ItemDto {
  @IsInt()
  @Min(1)
  quantity: number;
}

class ExamDto {
  @IsInt()
  patientId: number;

  @ValidateNested()
  @Type(() => EyeDto)
  od: EyeDto;

  @ValidateNested({ each: true })
  @Type(() => ItemDto)
  items: ItemDto[];
}

describe('flattenValidationErrors', () => {
  it('reports top-level, nested and array fields with dotted paths', () => {
    const dto = plainToInstance(ExamDto, {
      patientId: 'abc',
      od: { sphere: 'x' },
      items: [{ quantity: 2 }, { quantity: 0 }],
    });

    const fields = flattenValidationErrors(validateSync(dto));

    expect(Object.keys(fields).sort()).toEqual([
      'items.1.quantity',
      'od.sphere',
      'patientId',
    ]);
  });

  it('returns an empty object when there are no errors', () => {
    expect(flattenValidationErrors([])).toEqual({});
  });
});
