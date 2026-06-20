export type OrderStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Shipped' | 'Delivered';

export interface OrderItem {
  productId: number;
  productTitle: string;
  productThumbnail: string;
  quantity: number;
  price: number;
}

export interface Order {
  id: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  items: OrderItem[];
  subtotal: number;
  tax: number;
  total: number;
  status: OrderStatus;
  createdAt: string;
  deliveryAddress: Record<string, string>;
}
