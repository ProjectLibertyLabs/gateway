export interface ICapacityLimit {
  type: 'percentage' | 'amount';
  value: bigint;
}

export interface ICapacityLimits {
  serviceLimit: ICapacityLimit;
  totalLimit?: ICapacityLimit;
}
