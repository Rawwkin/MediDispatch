export type ICreatePayment = {
  tripId: string;
};

export type IPaymentIntent = {
  paymentId: string;
  sessionId: string;
  checkoutUrl: string;
  amount: number;
  currency: string;
};