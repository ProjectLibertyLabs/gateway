/* eslint-disable func-names */
/* eslint-disable no-extend-native */
BigInt.prototype['toJSON'] = function () {
  return this.toString();
};
