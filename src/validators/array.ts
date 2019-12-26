import { Err, err, FilterErr, FilterOk, Ok, ok, ResultKind, UnwrapErr, UnwrapOk } from "../result";

import { AnyValidator, ExtractValidatorO, Validator } from "./validator";

type ArrayOutput<V extends AnyValidator> = ArrayOutputOk<V> | ArrayOutputErr<V>;
type ArrayOutputOk<V extends AnyValidator> =
  Ok<Array<UnwrapOk<FilterOk<ExtractValidatorO<V>>>>>;
type ArrayOutputErr<V extends AnyValidator> =
  Err<
    "not_array"
    | {
      kind: "invalid_members",
      value: Array<{
        index: number,
        error: UnwrapErr<FilterErr<ExtractValidatorO<V>>>,
      }>,
    }
  >;

export const array = <V extends AnyValidator>(inner: V): Validator<any, ArrayOutput<V>> =>
  (input) => {
    if (!Array.isArray(input)) { return err("not_array"); }

    const validations = input.map(inner);

    const [errors, sanitizedValue] = validations.reduce(
      (acc, validation, index) => {
        if (validation.kind === ResultKind.Err) {
          const error = { index, error: validation.value };
          const errors = acc[0];
          errors.push(error);
          return [errors, acc[1]];
        } else {
          const sanitizedValue = acc[1];
          sanitizedValue[index] = validation.value;
          return [acc[0], sanitizedValue];
        }
      },
      [[] as any[], [] as any[]],
    );

    return errors.length
      ? err({ kind: "invalid_members", value: errors })
      : ok(sanitizedValue) as any;
  };
