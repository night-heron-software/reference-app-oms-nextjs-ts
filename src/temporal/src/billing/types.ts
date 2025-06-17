export class ApplicationFailure extends Error {
  public readonly nonRetryable: boolean;

  constructor(
    message: string,
    nonRetryable: boolean = false,
    public readonly type?: string
  ) {
    super(message);
    this.name = 'ApplicationFailure';
    this.nonRetryable = nonRetryable;
    // This is to ensure the type is captured correctly by Temporal
    Object.setPrototypeOf(this, ApplicationFailure.prototype);
  }
}

export const Compensate = 'COMPENSATE_ORDER';
