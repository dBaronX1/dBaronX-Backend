export type ManualCjCuratedProduct = {
  sku: string;
  title: string;
  handle: string;
  productUrl: string;
  imageUrl: string;
  videoUrl: string;
  label: string;
  category: "headphones" | "humidifier" | "apparel";
  inventory: number;
  supplierPriceMinorUsd: number;
  shippingCostMinorUsd: number;
  totalCostMinorUsd: number;
  sellingPriceMinorUsd: number;
  shippingWarehouse: string;
  shippingDestination: string;
  shippingCountries: string[];
  deliveryEstimate: string;
  supplier: "cj";
  realSupplierProduct: true;
  demo: false;
  manualCurated: true;
  supplierVerificationStatus:
    | "manual_verified_for_checkout"
    | "manual_draft_incomplete";
  buyable: boolean;
  blockers?: string[];
};

const BUYABLE_DEFAULTS = {
  supplier: "cj" as const,
  realSupplierProduct: true as const,
  demo: false as const,
  manualCurated: true as const,
  supplierVerificationStatus: "manual_verified_for_checkout" as const,
  buyable: true,
  shippingWarehouse: "china",
  shippingDestination: "U.A.E",
  shippingCountries: ["AE"],
  deliveryEstimate: "12-15 days",
};

export const manualCjCuratedProducts: ManualCjCuratedProduct[] = [
  {
    ...BUYABLE_DEFAULTS,
    sku: "CJDS212420104DW",
    title: "Men's Cotton Linen Long Sleeve Casual Shirt",
    handle: "mens-cotton-linen-long-sleeve-casual-shirt",
    productUrl:
      "https://cjdropshipping.com/product/new-mens-casual-blouse-cotton-linen-shirt-loose-tops-long-sleeve-tee-shirt-spring-autumn-casual-handsome-mens-shirts-p-2408300732091605000.html",
    imageUrl:
      "https://oss-cf.cjdropshipping.com/product/2024/08/30/07/ada82fd9-6efb-4629-86e8-1112d16a7a35.jpg?x-oss-process=image%2Fformat%2Cwebp",
    videoUrl: "",
    label: "Long Sleeve Shirt",
    category: "apparel",
    inventory: 32,
    supplierPriceMinorUsd: 419,
    shippingCostMinorUsd: 0,
    totalCostMinorUsd: 419,
    sellingPriceMinorUsd: 1999,
    shippingDestination: "United States",
    shippingCountries: ["US"],
    deliveryEstimate: "7-15 business days",
  },
  {
    ...BUYABLE_DEFAULTS,
    sku: "CJXFBXEJ00515",
    title: "Headphones",
    handle: "cj-headphones-cjxfbxej00515",
    productUrl:
      "https://www.cjdropshipping.com/product/headphones-p-13CC3784-4042-48B7-A514-92B51F62234B.html",
    imageUrl:
      "https://cf.cjdropshipping.com/15703776/734015087190.jpg?x-oss-process=image/format,webp,image/resize,m_fill,m_pad,w_60,h_60",
    videoUrl:
      "https://video-cf.cjdropshipping.com/e42f7800f06671edb8bb6733a78e0102/0a10223ab850420b9747945ce2721db5-f5105f76bbce82662d9a32eb776aa0fd-ld.mp4",
    label: "headphones",
    category: "headphones",
    inventory: 12146,
    supplierPriceMinorUsd: 574,
    shippingCostMinorUsd: 602,
    totalCostMinorUsd: 1176,
    sellingPriceMinorUsd: 1299,
  },
  {
    ...BUYABLE_DEFAULTS,
    sku: "CJXFBXEJ01350",
    title: "Waterproof Sports Bluetooth Wireless Headphones",
    handle: "cj-waterproof-sports-bluetooth-wireless-headphones-cjxfbxej01350",
    productUrl:
      "https://www.cjdropshipping.com/product/headphones-waterproof-sports-bluetooth-wireless-headphones-p-93E76E44-CF98-4CFE-A4FD-EF7D1D8CE263.html",
    imageUrl:
      "https://cf.cjdropshipping.com/15942240/2435993274459.jpg?x-oss-process=image/format,webp,image/resize,m_fill,m_pad,w_60,h_60",
    videoUrl:
      "https://video-cf.cjdropshipping.com/da49969fbcad48bca107ac0b1ac8a6e8/d7a57f2aa14b4c26b4df78720e66b491-ed02e1de0916afe7d24d6ab191a12b87-ld.mp4",
    label: "Headphones",
    category: "headphones",
    inventory: 11036,
    supplierPriceMinorUsd: 648,
    shippingCostMinorUsd: 398,
    totalCostMinorUsd: 1046,
    sellingPriceMinorUsd: 1200,
  },
  {
    ...BUYABLE_DEFAULTS,
    sku: "CJXFBXEJ00883",
    title: "A6S In-Ear Headphones",
    handle: "cj-a6s-in-ear-headphones-cjxfbxej00883",
    productUrl:
      "https://www.cjdropshipping.com/product/a6s-in-ear-headphones-p-7B81F00F-27AA-42D4-91C6-B750CEE69A66.html",
    imageUrl:
      "https://cf.cjdropshipping.com/20200306/790186669861.jpg?x-oss-process=image/resize,m_fill,m_pad,w_800,h_800",
    videoUrl: "",
    label: "Headphones",
    category: "headphones",
    inventory: 14774,
    supplierPriceMinorUsd: 257,
    shippingCostMinorUsd: 448,
    totalCostMinorUsd: 705,
    sellingPriceMinorUsd: 999,
  },
  {
    ...BUYABLE_DEFAULTS,
    sku: "CJSJ262871501AZ",
    title: "Laptop Gaming Infinite Surround Headphones",
    handle: "cj-laptop-gaming-infinite-surround-headphones-cjsj262871501az",
    productUrl:
      "https://www.cjdropshipping.com/product/headphones-laptop-gaming-infinite-surround-headphones-p-2512020547421600700.html",
    imageUrl:
      "https://cf.cjdropshipping.com/quick/product/b5af6d4a-2963-4cf7-b146-9243abb6c96e.jpg?x-oss-process=image/format,webp,image/resize,m_fill,m_pad,w_60,h_60",
    videoUrl: "",
    label: "headphones",
    category: "headphones",
    inventory: 6550,
    supplierPriceMinorUsd: 1376,
    shippingCostMinorUsd: 904,
    totalCostMinorUsd: 2280,
    sellingPriceMinorUsd: 4599,
  },
  {
    ...BUYABLE_DEFAULTS,
    sku: "CJXFBXEJ01605",
    title: "Gaming Headphones",
    handle: "cj-gaming-headphones-cjxfbxej01605",
    productUrl:
      "https://www.cjdropshipping.com/product/headphones-for-gaming-gaming-p-C99A5FAC-56BB-4B2E-93FC-F0558B3BF4B1.html",
    imageUrl:
      "https://cf.cjdropshipping.com/20200816/380714829141.jpg?x-oss-process=image/format,webp,image/resize,m_fill,m_pad,w_60,h_60",
    videoUrl:
      "https://video-cf.cjdropshipping.com/427e2190f06c71ed80416732b68e0102/3f5ae455379f423b9cd396d0d828a913-e74ab8a252854576d179c1ad3f075fac-ld.mp4",
    label: "Headphones",
    category: "headphones",
    inventory: 14107,
    supplierPriceMinorUsd: 882,
    shippingCostMinorUsd: 658,
    totalCostMinorUsd: 1540,
    sellingPriceMinorUsd: 2099,
  },
  {
    ...BUYABLE_DEFAULTS,
    sku: "CJJT185379711KP",
    title: "Raining Humidifier UFO Raindrop Aromatherapy Diffuser",
    handle: "cj-raining-humidifier-ufo-raindrop-aromatherapy-diffuser-cjjt185379711kp",
    productUrl:
      "https://www.cjdropshipping.com/product/raining-humidifier-ufo-raindrop-aromatherapy-ultrasonic-water-drop-air-rain-humidifier-350ml-7-colors-led-lamp-raindrop-aroma-diffuser-p-1705130914743209984.html",
    imageUrl:
      "https://cf.cjdropshipping.com/81c79dac-a4d3-42a3-9d5d-d19b23ee2075.jpg?x-oss-process=image/format,webp,image/resize,m_fill,m_pad,w_60,h_60",
    videoUrl: "",
    label: "Humidifier",
    category: "humidifier",
    inventory: 11017,
    supplierPriceMinorUsd: 1447,
    shippingCostMinorUsd: 808,
    totalCostMinorUsd: 2255,
    sellingPriceMinorUsd: 3299,
  },
  {
    ...BUYABLE_DEFAULTS,
    sku: "CJJT128133837KP",
    title: "Retro Kerosene Light Humidifier",
    handle: "cj-retro-kerosene-light-humidifier-cjjt128133837kp",
    productUrl:
      "https://www.cjdropshipping.com/product/retro-kerosene-light-humidifier-time-light-humidifier-essential-oil-diffuser-light-adjustable-night-light-humidifiers-p-1436147629946966016.html",
    imageUrl:
      "https://cf.cjdropshipping.com/fa37ee0e-883a-47d4-abc8-309caa992c9a.jpg?x-oss-process=image/format,webp,image/resize,m_fill,m_pad,w_60,h_60",
    videoUrl: "",
    label: "Humidifier",
    category: "humidifier",
    inventory: 46092,
    supplierPriceMinorUsd: 2037,
    shippingCostMinorUsd: 2615,
    totalCostMinorUsd: 4715,
    sellingPriceMinorUsd: 8799,
  },
  {
    sku: "CJYD181818302BY",
    title: "Anti-gravity Air Humidifier",
    handle: "cj-anti-gravity-air-humidifier-cjyd181818302by",
    productUrl:
      "https://www.cjdropshipping.com/product/anti-gravity-air-humidifier-mute-countercurrent-humidifier-levitating-water-drops-fogger-electric-humidifiers-p-1689166253681811456.html",
    imageUrl: "",
    videoUrl: "",
    label: "Humidifier",
    category: "humidifier",
    inventory: 0,
    supplierPriceMinorUsd: 0,
    shippingCostMinorUsd: 0,
    totalCostMinorUsd: 0,
    sellingPriceMinorUsd: 0,
    shippingWarehouse: "china",
    shippingDestination: "U.A.E",
    shippingCountries: ["AE"],
    deliveryEstimate: "",
    supplier: "cj",
    realSupplierProduct: true,
    demo: false,
    manualCurated: true,
    supplierVerificationStatus: "manual_draft_incomplete",
    buyable: false,
    blockers: [
      "missing_image",
      "missing_inventory",
      "missing_supplier_price",
      "missing_shipping_cost",
      "missing_selling_price",
    ],
  },
];

export const manualCjCuratedBuyableProducts = manualCjCuratedProducts.filter(
  (product) => product.buyable,
);

export const manualCjCuratedDraftProducts = manualCjCuratedProducts.filter(
  (product) => !product.buyable,
);
