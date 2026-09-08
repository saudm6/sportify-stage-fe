export interface OrderResponse {
  id: string;
  orderNumber: number;
  placedByUserId: string;
  status: string;
  subTotal: number;
  discountTotal: number;
  grandTotal: number;
  createdAt: string;
}
