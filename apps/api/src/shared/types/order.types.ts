export type OrderStatus =
  | "created"
  | "pending"
  | "processing"
  | "shipped"
  | "completed"
  | "cancelled";

export type PaymentStatus = "pending" | "paid" | "failed";

export interface OrderItemEntity {
  productId?: string | null;
  variantId?: string | null;
  quantity: number;
  price?: number;
  expectedUnitPrice?: number;
}

export interface AddressEntity {
  firstName: string;
  lastName: string;
  company?: string | null;
  address1: string;
  address2?: string | null;
  city: string;
  province?: string | null;
  postalCode: string;
  countryCode: string;
  phone?: string | null;
}

export interface OrderEntity {
  id?: string;
  orderId: string;
  medusaOrderId?: string | null;
  cartId?: string | null;
  customerId?: string | null;
  guestReference?: string | null;
  email: string;
  fullName?: string | null;
  currency: string;
  subtotal?: number;
  discountTotal?: number;
  shippingTotal?: number;
  taxTotal?: number;
  total: number;
  paymentMethod?: string | null;
  paymentStatus: PaymentStatus;
  fulfillmentStatus?: string | null;
  status: OrderStatus;
  riskScore?: number | null;
  riskLevel?: string | null;
  items?: OrderItemEntity[];
  shippingAddress?: AddressEntity | null;
  billingAddress?: AddressEntity | null;
  createdAt?: string;
  updatedAt?: string;
}
