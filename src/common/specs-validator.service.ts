import { Injectable } from '@nestjs/common';
import Ajv, { ValidateFunction } from 'ajv';
import addFormats from 'ajv-formats';

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

@Injectable()
export class SpecsValidatorService {
  private ajv: Ajv;
  private cache: Map<string, ValidateFunction> = new Map();

  constructor() {
    this.ajv = new Ajv({
      allErrors: true,
      verbose: true,
      useDefaults: true,
      coerceTypes: true,
    });
    addFormats(this.ajv);
  }

  private getValidator(schema: Record<string, any>): ValidateFunction {
    const key = JSON.stringify(schema);
    if (this.cache.has(key)) return this.cache.get(key)!;

    const validate = this.ajv.compile(schema);
    this.cache.set(key, validate);
    return validate;
  }

  validate(schema: Record<string, any>, data: Record<string, any>): ValidationResult {
    if (!schema || Object.keys(schema).length === 0) {
      return { valid: true, errors: [] };
    }

    const validate = this.getValidator(schema);
    const valid = validate(data) as boolean;

    if (!valid) {
      const errors = (validate.errors || []).map(
        (err) => `${err.instancePath || '/'} ${err.message}`,
      );
      return { valid: false, errors };
    }

    return { valid: true, errors: [] };
  }
}
