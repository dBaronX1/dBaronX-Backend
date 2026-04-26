import { JsonPanel } from "@/components/platform/JsonPanel";
import { LowBandwidthNotice } from "@/components/platform/LowBandwidthNotice";
import { OperationalTable } from "@/components/platform/OperationalTable";
import { SectionHeader } from "@/components/platform/SectionHeader";
import { StateTimeline } from "@/components/platform/StateTimeline";
import { StatusPill } from "@/components/platform/StatusPill";
import { SurfaceTabs } from "@/components/platform/SurfaceTabs";
import { getCommerceAdminDashboard } from "@/lib/platform/platform-api";
import { getOrderStateDescriptor } from "@/lib/orders/order-states";

export const dynamic = "force-dynamic";

export default async function OrdersPage() {
  const commerce = await getCommerceAdminDashboard();
  const orders = commerce.recentOrders.slice(0, 12);

  const firstOrderState = getOrderStateDescriptor(
    String(orders[0]?.order_status ?? orders[0]?.status ?? "created"),
  );

  return (
    <main className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 md:px-6 lg:px-8">
      <SectionHeader
        eyebrow="Orders"
        title="Order State and Fulfillment Surface"
        description="Frontend launch surface for operational order states, fulfillment progression, and reconciliation visibility."
      />

      <LowBandwidthNotice />

      <SurfaceTabs
        tabs={[
          { href: "/orders", label: "Orders" },
          { href: "/payments", label: "Payments" },
          { href: "/storefront-launch", label: "Storefront Launch" },
          { href: "/commerce-reconciliation", label: "Reconciliation" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <StateTimeline
          title="Reference Order Flow"
          items={[
            { label: "Created", helper: "Order is recorded.", complete: true },
            {
              label: "Paid",
              helper: "Payment capture/settlement completed.",
              complete: ["paid", "supplier_processing", "fulfilled", "delivered"].includes(firstOrderState.key),
            },
            {
              label: "Supplier Processing",
              helper: "Supplier accepted and is preparing shipment.",
              complete: ["supplier_processing", "fulfilled", "delivered"].includes(firstOrderState.key),
            },
            {
              label: "Fulfilled",
              helper: "Shipment/tracking is generated.",
              complete: ["fulfilled", "delivered"].includes(firstOrderState.key),
            },
            {
              label: "Delivered",
              helper: "Customer delivery confirmed.",
              active: firstOrderState.key === "delivered",
              complete: firstOrderState.key === "delivered",
            },
          ]}
        />

        <JsonPanel
          title="Recent Fulfillments"
          payload={commerce.recentFulfillments}
        />
      </div>

      <OperationalTable
        title="Recent Orders"
        rows={orders}
        columns={[
          {
            key: "id",
            title: "Order",
            render: (row) => <span>{String(row.id ?? row.medusa_order_id ?? "n/a")}</span>,
          },
          {
            key: "status",
            title: "Order Status",
            render: (row) => {
              const descriptor = getOrderStateDescriptor(
                String(row.order_status ?? row.status ?? "created"),
              );
              return (
                <div className="space-y-1">
                  <StatusPill ready={descriptor.ready} readyLabel={descriptor.label} blockedLabel={descriptor.label} />
                  <p className="text-xs text-neutral-500">{descriptor.description}</p>
                </div>
              );
            },
          },
          {
            key: "payment_status",
            title: "Payment",
            render: (row) => <span>{String(row.payment_status ?? "n/a")}</span>,
          },
          {
            key: "fulfillment_status",
            title: "Fulfillment",
            render: (row) => <span>{String(row.fulfillment_status ?? "n/a")}</span>,
          },
        ]}
      />
    </main>
  );
}
