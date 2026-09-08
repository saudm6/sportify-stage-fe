export interface OrderStatusRequest {
    orderId: string,
    orderStatus: 'Confirm' | 'Cancel',
}
