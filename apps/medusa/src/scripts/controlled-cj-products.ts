export type ControlledCjProduct = {
  title: string
  handle: string
  supplier: "cj"
  supplierSku: string
  supplierProductId?: string
  sourceUrl?: string
  imageUrl?: string
  description: string
  material?: string
  productAttributes?: string
  packageSize?: string
  certification?: string
  costMinorUnits?: number
  sellingPriceMinorUnits?: number
  inventory?: number
  shipFrom?: string
  shipTo?: string[]
  deliveryEstimate?: string
  processingTime?: string
  verificationStatus: "draft_pending_verification" | "verified_for_checkout"
}

export const controlledCjProducts: ControlledCjProduct[] = [
  {
    title: "Wireless Charger Dual Mobile Phone Charger",
    handle: "wireless-charger-dual-mobile-phone-charger",
    supplier: "cj",
    supplierSku: "CJSJSJSJ00900-Black-10W",
    imageUrl: "https://cf.cjdropshipping.com/203102/424353541934.jpg?x-oss-process=image/format,webp,image/resize,m_fill,m_pad,w_60,h_60",
    description: "Dual mobile wireless charger with stable charging, intelligent temperature control, Type-C interface, CE/FCC/ROHS certification.",
    material: "Plastic",
    productAttributes: "Ordinary",
    packageSize: "180*100*10(mm)",
    certification: "CE FCC ROHS",
    verificationStatus: "draft_pending_verification",
  },
  {
    title: "New Bluetooth 5.1 Headset Wireless Earbuds Earphones Stereo Headphones Ear Hook",
    handle: "bluetooth-51-wireless-earbuds-ear-hook",
    supplier: "cj",
    supplierSku: "CJEJ242056602BY",
    costMinorUnits: 659,
    inventory: 230,
    shipFrom: "United States",
    shipTo: ["US"],
    deliveryEstimate: "3-5 days",
    processingTime: "1-3 days for 80% orders",
    productAttributes: "Battery Contains",
    description: "Bluetooth 5.1 wireless ear hook earbuds candidate with US shipping signal, pending source/image/selling-price verification.",
    verificationStatus: "draft_pending_verification",
  },
  {
    title: "6blade Portable Blender Mini Juicer Cup",
    handle: "portable-blender-mini-juicer-cup",
    supplier: "cj",
    supplierSku: "CJCF106586805EV",
    productAttributes: "Battery Contains",
    description: "Portable mini juicer cup candidate. Inventory and delivery estimate are unverified.",
    verificationStatus: "draft_pending_verification",
  },
  {
    title: "Pet Hair Remover Mitt Pet Hair Remover Gloves",
    handle: "pet-hair-remover-mitt-glove",
    supplier: "cj",
    supplierSku: "CJYD233200837KP",
    imageUrl: "https://oss-cf.cjdropshipping.com/product/2025/03/19/11/3ed56e63-d2f1-44cd-b383-c471c984be9f_trans.jpeg?x-oss-process=image%2Fformat%2Cwebp",
    productAttributes: "Clothes",
    description: "Pet hair remover glove candidate pending cost, stock, shipping, and source URL verification.",
    verificationStatus: "draft_pending_verification",
  },
  {
    title: "Round Handle Pet Passage Comb",
    handle: "round-handle-pet-passage-comb",
    supplier: "cj",
    supplierSku: "CJJJCWGY02609-3color set",
    productAttributes: "Ordinary",
    material: "ABS, stainless steel needle",
    description: "Round handle pet passage comb candidate pending source, image, cost, stock, and shipping verification.",
    verificationStatus: "draft_pending_verification",
  },
  {
    title: "Jewelry Box Door Rotating Large Capacity",
    handle: "jewelry-box-door-rotating-large-capacity",
    supplier: "cj",
    supplierSku: "CJYD234085101AZ",
    imageUrl: "https://oss-cf.cjdropshipping.com/product/2025/03/30/05/7584695e-8620-4c69-9e20-4710f852b419_trans.jpeg?x-oss-process=image%2Fformat%2Cwebp",
    productAttributes: "Ordinary",
    description: "Large capacity rotating door jewelry box candidate pending cost, stock, shipping, and source URL verification.",
    verificationStatus: "draft_pending_verification",
  },
]

export function controlledProductBlockers(product: ControlledCjProduct): string[] {
  const blockers: string[] = []
  if (!product.sourceUrl) blockers.push("source_url_missing")
  if (!product.imageUrl) blockers.push("image_missing")
  if (!product.costMinorUnits || product.costMinorUnits <= 0) blockers.push("supplier_cost_missing")
  if (!product.sellingPriceMinorUnits || product.sellingPriceMinorUnits <= 0) blockers.push("selling_price_missing")
  if (!product.inventory || product.inventory <= 0) blockers.push("stock_missing")
  if (!product.shipTo?.length) blockers.push("shipping_countries_missing")
  if (!product.deliveryEstimate) blockers.push("delivery_estimate_missing")
  return blockers
}

export function complianceReviewRequired(product: ControlledCjProduct): boolean {
  return /battery|electronic|charger|wireless|type-c|bluetooth/i.test(`${product.title} ${product.description} ${product.productAttributes || ""}`) && product.verificationStatus !== "verified_for_checkout"
}
