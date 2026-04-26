export type FrontendOrderState =
  | "created"
  | "payment_pending"
  | "paid"
  | "supplier_processing"
  | "fulfillment_pending"
  | "fulfilled"
  | "delivered"
  | "cancelled"
  | "failed";

export interface OrderStateDescriptor {
  key: FrontendOrderState;
  label: string;
  description: string;
  ready: boolean;
}

export const ORDER_STATE_DESCRIPTORS: OrderStateDescriptor[] = [
  {
    key: "created",
    label: "Created",
    description: "Order record exists but payment confirmation is incomplete.",
    ready: false,
  },
  {
    key: "payment_pending",
    label: "Payment Pending",
    description: "Awaiting payment authorization or settlement confirmation.",
    ready: false,
  },
  {
    key: "paid",
    label: "Paid",
    description: "Payment succeeded and order is ready for supplier flow.",
    ready: true,
  },
  {
    key: "supplier_processing",
    label: "Supplier Processing",
    description: "Supplier accepted the order and is preparing fulfillment.",
    ready: true,
  },
  {
    key: "fulfillment_pending",
    label: "Fulfillment Pending",
    description: "Order is waiting for shipment or tracking confirmation.",
    ready: false,
  },
  {
    key: "fulfilled",
    label: "Fulfilled",
    description: "Shipment was created and fulfillment is marked complete.",
    ready: true,
  },
  {
    key: "delivered",
    label: "Delivered",
    description: "Customer delivery was confirmed.",
    ready: true,
  },
  {
    key: "cancelled",
    label: "Cancelled",
    description: "Order was cancelled before completion.",
    ready: false,
  },
  {
    key: "failed",
    label: "Failed",
    description: "Order entered a failed operational state requiring review.",
    ready: false,
  },
];

export function getOrderStateDescriptor(
  state: string | null | undefined,
): OrderStateDescriptor {
  return (
    ORDER_STATE_DESCRIPTORS.find((item) => item.key === state) ??
    {
      key: "failed",
      label: String(state || "Unknown"),
      description: "Unknown order state returned by backend.",
      ready: false,
    }
  );
}
