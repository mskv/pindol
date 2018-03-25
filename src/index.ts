function returnType<T>(_fn: (...args: any[]) => T): T { return null!; }

type Primitive = string | number | boolean;
type Nullable<T> = T | null;
type Optional<T> = T | undefined;
type NOPrimitive = Nullable<Optional<Primitive>>;

type Result<T> = Ok<T> | Err;
interface Ok<T> { result: "ok"; value: T; }
interface Err { result: "error"; messages: ErrMessage[]; }
type ErrMessage = ScalarErrMessage | ObjErrMessage;
type ScalarErrMessage = string;
interface ObjErrMessage { [key: string]: ErrMessage[]; }

type Validator<I, O> = (input: I) => Result<O>;

const number: Validator<any, number> = (input) =>
  typeof input === "number"
    ? { result: "ok", value: input }
    : { result: "error", messages: ["not_number"] };

const nullable: Validator<any, null> = (input) =>
  input === null
    ? { result: "ok", value: input }
    : { result: "error", messages: ["not_null"] };

const optional: Validator<any, undefined> = (input) =>
  input === undefined
    ? { result: "ok", value: input }
    : { result: "error", messages: ["not_undefined"] };

const string: Validator<any, string> = (input) =>
  typeof input === "string"
    ? { result: "ok", value: input }
    : { result: "error", messages: ["not_string"] };

const gt1: Validator<number, number> = (input) =>
  input > 1
    ? { result: "ok", value: input }
    : { result: "error", messages: ["not_gt1"] };

const array: <I, O>(inner: Validator<I, O>) => Validator<I[], O[]> = (inner) => (input) => {
  if (!Array.isArray(input)) { return { result: "error", messages: ["not_array"] }; }

  const validations = input.map(inner);

  const [hasFailure, objErrMessage]: [boolean, ObjErrMessage] =
    validations.reduce<[boolean, ObjErrMessage]>((acc, validation, index) => {
      if (validation.result === "error") {
        const objErrMessage = acc[1];
        objErrMessage[index] = validation.messages;
        return [true, objErrMessage];
      } else {
        return acc;
      }
    }, [false, {}]);

  if (hasFailure) {
    return { result: "error", messages: [objErrMessage] };
  } else {
    return { result: "ok", value: input as any };
  }
};

type Or = <I, O1, O2>(v1: Validator<I, O1>, v2: Validator<I, O2>) => Validator<I, O1 | O2>;
const or: Or = (v1, v2) => (input) => {
  const val1 = v1(input);
  if (val1.result === "ok") { return val1; }

  const val2 = v2(input);
  if (val2.result === "ok") { return val2; }

  return { result: "error", messages: val1.messages.concat(val2.messages) };
};

type And = <I, O1, O2 extends O1>(v1: Validator<I, O1>, v2: Validator<I, O2>) => Validator<I, O1 & O2>;
const and: And = (v1, v2) => (input) => {
  const val1 = v1(input);
  if (val1.result === "error") { return val1; }

  const val2 = v2(input);
  if (val2.result === "error") { return val2; }

  return { result: "ok", value: input as any };
};

const orValidator = or(array(number), nullable);
const orValidation = orValidator([1, "1", 1, "1", 1]);
if (orValidation.result === "ok") {
  console.log("OR ok", orValidation.value);
}
if (orValidation.result === "error") {
  console.log("OR error", orValidation.messages);
}

const andValidator = array(and(number, gt1));
const andValidation = andValidator([2, 3, 2]);
if (andValidation.result === "ok") {
  console.log("AND ok", andValidation.value);
}
if (andValidation.result === "error") {
  console.log("AND error", andValidation.messages);
}