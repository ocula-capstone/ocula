import { IsOptional, validate } from 'class-validator';
import {
  axisErrors,
  IsRefraction,
  isRefractionValue,
  refractionMessage,
} from './refraction.js';

describe('refraction validator', () => {
  it('accepts sphere values on 0.25 steps within ±30', () => {
    for (const v of [-30, -1.25, 0, 0.25, 2.75, 30]) {
      expect(isRefractionValue(v, 'sphere')).toBe(true);
    }
    for (const v of [0.1, 1.3, -30.25, 30.25, Number.NaN]) {
      expect(isRefractionValue(v, 'sphere')).toBe(false);
    }
  });

  it('only allows minus cylinder down to -10', () => {
    expect(isRefractionValue(-0.75, 'cylinder')).toBe(true);
    expect(isRefractionValue(0, 'cylinder')).toBe(true);
    expect(isRefractionValue(0.25, 'cylinder')).toBe(false);
    expect(isRefractionValue(-10.25, 'cylinder')).toBe(false);
  });

  it('checks add and pd ranges', () => {
    expect(isRefractionValue(0.75, 'add')).toBe(true);
    expect(isRefractionValue(4, 'add')).toBe(true);
    expect(isRefractionValue(0.5, 'add')).toBe(false);
    expect(isRefractionValue(62.5, 'pd')).toBe(true);
    expect(isRefractionValue(63.3, 'pd')).toBe(true);
    expect(isRefractionValue(80, 'pd')).toBe(false);
    expect(isRefractionValue(63.35, 'pd')).toBe(false);
  });

  it('rejects strings', () => {
    expect(isRefractionValue('1.25', 'sphere')).toBe(false);
  });

  it('formats a readable message', () => {
    expect(refractionMessage('sphere')).toBe(
      'Use -30.00 to +30.00 in 0.25 steps.',
    );
    expect(refractionMessage('pd')).toBe('Use +50.0 to +75.0 mm in 0.1 steps.');
  });

  it('works as a class-validator decorator', async () => {
    class Dto {
      @IsOptional()
      @IsRefraction('sphere')
      odSphere?: number | null;
    }
    const make = (v: unknown) => Object.assign(new Dto(), { odSphere: v });
    expect(await validate(make(-1.5))).toHaveLength(0);
    expect(await validate(make(null))).toHaveLength(0);
    const errors = await validate(make(0.1));
    expect(errors[0].constraints).toEqual({
      isRefraction: 'Use -30.00 to +30.00 in 0.25 steps.',
    });
  });

  it('requires an axis with a non-zero cylinder and none without a cylinder', () => {
    expect(axisErrors({ odCylinder: -0.5, odAxis: 90 })).toEqual({});
    expect(axisErrors({ odCylinder: 0 })).toEqual({});
    expect(axisErrors({ odCylinder: -0.5 })).toHaveProperty('odAxis');
    expect(axisErrors({ osAxis: 180 })).toHaveProperty('osAxis');
    expect(axisErrors({ osCylinder: null, osAxis: null })).toEqual({});
  });
});
