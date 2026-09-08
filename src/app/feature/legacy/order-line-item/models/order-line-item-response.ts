export interface OrderLineItemResponse {
    id: string,
    orderId: string | null,
    productId: string,
    PlacedByUser: string,
    unitPrice: number,
    quantity: number,
    lineDiscount: number,
    lineTotal: number,
}
