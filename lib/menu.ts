// Orbéan menu — from the brand's own menu creatives (see ../04-Brand-Facts.md).
// Prices in ₹. Sizes: S (12oz) / M (16oz) / L (20oz). All available hot or iced.

export type Sizes = { s: number; m: number; l: number };
export type Drink = { name: string; note: string };
export type PricedDrink = Drink & { prices?: Sizes };

// ── Signature Matcha Collection — "Crafted for the Modern Connoisseur" ──
export const matchaPrices: Sizes = { s: 279, m: 329, l: 379 };
export const matchaCollection: Drink[] = [
  { name: "Emerald Hazelnut Reserve", note: "Nutty. Smooth. Perfectly balanced." },
  { name: "Sakura Berry", note: "Floral. Fruity. Refreshing bloom." },
  { name: "Velvet Vanilla", note: "Silky. Creamy. Timeless indulgence." },
  { name: "Rose Élixir", note: "Floral. Soothing. Beautifully balanced." },
  { name: "Coco Verde", note: "Tropical. Creamy. Island inspired." },
];

// ── Signature Lattes ──
export const signaturePrices: Sizes = { s: 240, m: 290, l: 340 };
export const signatureLattes: Drink[] = [
  { name: "Cheesecake", note: "Creamy cheesecake. Sweet strawberry." },
  { name: "Red Velvet", note: "Rich. Indulgent. Velvet-smooth." },
  { name: "Caramel Craze", note: "Golden caramel. Crunchy finish." },
  { name: "Cocomocha", note: "Cocoa. Mocha. Decadent." },
];

// ── Seasonal iced signatures (the launch heroes) ──
export const icedSignatures: Drink[] = [
  { name: "Iced Strawberry Latte", note: "Sweet. Creamy. Beautifully refreshing." },
  { name: "Blue Pea Tea Latte", note: "Floral. Smooth. Naturally stunning." },
];

// ── Classic & Flavoured Lattes ──
export const classicLattes: PricedDrink[] = [
  { name: "Classic Latte", note: "Smooth espresso, perfectly balanced.", prices: { s: 180, m: 220, l: 260 } },
  { name: "Caramel Latte", note: "Buttery caramel, silky milk.", prices: { s: 200, m: 240, l: 280 } },
  { name: "Hazelnut Latte", note: "Toasted hazelnut, warm and nutty.", prices: { s: 200, m: 240, l: 280 } },
  { name: "Irish Cream Latte", note: "A delightful fusion of creamy Irish cream.", prices: { s: 200, m: 240, l: 280 } },
];

// ── Macchiato Collection ──
export const macchiatos: PricedDrink[] = [
  { name: "Classic Macchiato", note: "Bold espresso, marked with milk foam.", prices: { s: 170, m: 210, l: 250 } },
  { name: "Caramel Macchiato", note: "Smooth espresso laced with caramel.", prices: { s: 190, m: 230, l: 270 } },
  { name: "Hazelnut Macchiato", note: "Nutty hazelnut, rich crema.", prices: { s: 190, m: 230, l: 270 } },
  { name: "Irish Cream Macchiato", note: "Creamy Irish cream, a bold shot.", prices: { s: 190, m: 230, l: 270 } },
];

// ── Coffee classics (single price — from the in-store menu board render) ──
export const coffeeClassics: { name: string; note: string; price: number }[] = [
  { name: "Espresso", note: "The shot everything else is judged against.", price: 120 },
  { name: "Americano", note: "Espresso, lengthened. Clean and bold.", price: 130 },
  { name: "Cappuccino", note: "Equal parts espresso, steam, foam.", price: 150 },
  { name: "Flat White", note: "Velvet microfoam, double shot.", price: 180 },
  { name: "Mocha", note: "Espresso meets dark chocolate.", price: 160 },
  { name: "Cold Brew", note: "18-hour steep. Smooth, never bitter.", price: 180 },
];

// ── Cold-pressed juices (Juice Bar) — prices from the board render ──
export const juices: string[] = [
  "Watermelon Fresh",
  "Mango Magic",
  "Detox Green",
  "Berry Blast",
  "Citrus Cooler",
  "Carrot Glow",
  "Mango Shake",
];

export const juicePrices: Record<string, number> = {
  "Watermelon Fresh": 150,
  "Mango Magic": 160,
  "Detox Green": 170,
  "Berry Blast": 170,
  "Citrus Cooler": 160,
  "Carrot Glow": 150,
  "Mango Shake": 180,
};

// ── Food & bakes (from the launch creatives; confirm prices) ──
export const foodItems: { name: string; note: string; price: number }[] = [
  { name: "Classic Croissant", note: "Flaky, buttery, golden-brown. Baked to perfection.", price: 160 },
  { name: "Avocado Toast", note: "Smashed avocado on sourdough, chilli flakes, olive oil.", price: 220 },
  { name: "Cheesecake Slice", note: "Velvety, with strawberry compote.", price: 180 },
];

// ── Tasting notes — how each item actually TASTES, sip by sip. Written in
// the house voice: first impression → body → finish. Shown in the menu
// expand panels and on order cards; indexed by the /order deep search. ──
export const TASTE: Record<string, string> = {
  // matcha collection
  "Emerald Hazelnut Reserve":
    "Opens with toasted hazelnut warmth, settles into deep ceremonial-matcha umami, and finishes clean with a praline-like sweetness that never turns sugary.",
  "Sakura Berry":
    "A bright berry first sip — strawberry and a whisper of cherry blossom — over grassy-sweet matcha. Finishes floral and cool, like spring in a glass.",
  "Velvet Vanilla":
    "Madagascar-style vanilla rounds the matcha's edges into pure silk. Soft, custardy mid-palate; the finish is gentle, creamy and quietly addictive.",
  "Rose Élixir":
    "Delicate rose lifts off the first sip, then matcha's earthiness grounds it. Ends soothing and perfumed — closer to a calm ritual than a drink.",
  "Coco Verde":
    "Coconut cream meets green tea — a tropical, faintly nutty sweetness up front, a smooth island-lassi body, and a fresh palm-breeze finish.",
  // signature lattes
  Cheesecake:
    "Tastes like the dessert: tangy cream-cheese richness, a biscuity base note, and ripe strawberry sweetness riding over smooth espresso.",
  "Red Velvet":
    "Cocoa-forward and plush — soft chocolate, a hint of buttermilk tang, and a velvet body that coats the palate before a sweet, rounded finish.",
  "Caramel Craze":
    "Burnt-gold caramel — toasty, buttery, edge-of-bitter — folded into milk and espresso. The crunchy brittle finish is the whole point.",
  Cocomocha:
    "Dark cocoa and espresso in a slow dance, with coconut keeping it tropical. Bittersweet start, indulgent middle, lingering chocolate finish.",
  // iced signatures
  "Iced Strawberry Latte":
    "Fresh strawberry purée swirled through cold milk and espresso — bright, creamy and clean, with a fruit-forward finish that begs another sip.",
  "Blue Pea Tea Latte":
    "Butterfly-pea florals — soft, tea-like, faintly herbal — over chilled milk. Light-bodied and barely sweet; finishes cool and stunningly blue.",
  // classic lattes
  "Classic Latte":
    "Our house espresso softened with steamed milk to its natural sweetness. Balanced, nutty-cocoa undertones, an honest everyday cup.",
  "Caramel Latte":
    "Buttery caramel melts into silky milk — sweet but composed, with the espresso keeping the finish toasty rather than sugary.",
  "Hazelnut Latte":
    "Toasted hazelnut through warm milk and espresso — like a praline you can drink. Cosy, nutty, with a soft roasted finish.",
  "Irish Cream Latte":
    "Irish-cream notes of vanilla, cocoa and a whisper of whiskey-barrel warmth (zero alcohol) wrapped around a smooth double shot.",
  // macchiatos
  "Classic Macchiato":
    "Espresso first, always — bold and syrupy — just 'marked' with foam. Short, intense, with a clean bittersweet snap at the end.",
  "Caramel Macchiato":
    "Vanilla-sweet milk under a bold shot, finished with caramel drizzle that sinks as you sip — every mouthful shifts sweeter to stronger.",
  "Hazelnut Macchiato":
    "Rich crema over nutty sweetness — the hazelnut sits low so the espresso speaks first and the praline warmth answers.",
  "Irish Cream Macchiato":
    "A bold shot cut with smooth Irish-cream sweetness — strong start, dessert-like middle, and a short cocoa finish.",
  // coffee classics
  Espresso:
    "Syrupy body, dark-chocolate bitterness, a citrus edge and a long caramel aftertaste — the 30ml everything else here is judged against.",
  Americano:
    "The same shot, lengthened with hot water — clean, bold and transparent, letting the roast's cocoa and toasted-nut notes stretch out.",
  Cappuccino:
    "A third each of espresso, steamed milk and foam — strong coffee up front, airy sweetness behind, and a dry, cocoa-dusted finish.",
  "Flat White":
    "Double shot under velvet microfoam — stronger and silkier than a latte, with the espresso's hazelnut-cocoa character front and centre.",
  Mocha:
    "Espresso meets real dark chocolate — bittersweet, fudgy and warming, finished with milk so it drinks like liquid tiramisu.",
  "Cold Brew":
    "Steeped 18 hours, never heated — naturally sweet, zero acidity, with smooth notes of cocoa, dates and a mellow, rounded finish.",
  // juices
  "Watermelon Fresh":
    "Pure pressed watermelon — light, cooling and faintly floral, with that fresh-cut sweetness and a mint-clean finish.",
  "Mango Magic":
    "Thick-pressed ripe mango — honeyed, sunny and full-bodied, finishing with the gentle tartness of skin-on fruit.",
  "Detox Green":
    "Green apple brightness, cucumber coolness, a spinach-soft body and a ginger-lemon kick on the way out. Tastes like a reset.",
  "Berry Blast":
    "A deep, jammy mix of berries — sweet up front, pleasantly sharp behind, with a long blackcurrant-like finish.",
  "Citrus Cooler":
    "Orange and lime pressed sharp — zesty, palate-waking acidity rounded with a touch of natural sweetness.",
  "Carrot Glow":
    "Sweet earth and sunshine — smooth pressed carrot lifted with orange and a warm thread of ginger.",
  // food & bakes
  "Classic Croissant":
    "Shatter-crisp outside, steam-soft lamination inside — pure butter sweetness with a toasty, caramelised finish.",
  "Avocado Toast":
    "Creamy smashed avocado, sour-tang sourdough crunch, grassy olive oil and a slow chilli-flake warmth at the end.",
  "Cheesecake Slice":
    "Dense, velvety and tangy-sweet, the strawberry compote cutting through the cream with bright, jammy acidity.",
  "Mango Shake":
    "Alphonso pulp blended thick and cold — ice-cream texture, honey-mango sweetness, real fruit chunks in the last third.",
};

// ── Allergen declarations (FSSAI-style "contains" labelling). Explicit map
// for the exceptions; everything else derives from its composition. ──
const ALLERGENS_EXPLICIT: Record<string, string[]> = {
  "Classic Croissant": ["gluten", "dairy"],
  "Avocado Toast": ["gluten"],
  "Cheesecake Slice": ["dairy", "gluten", "egg"],
  Cheesecake: ["dairy", "gluten"],
  "Red Velvet": ["dairy", "gluten"],
  "Caramel Craze": ["dairy", "tree nuts"],
  "Mango Shake": ["dairy"],
};

export function allergensFor(name: string): string[] {
  if (ALLERGENS_EXPLICIT[name]) return ALLERGENS_EXPLICIT[name];
  const set = new Set<string>();
  const n = name.toLowerCase();
  const layers = ingredientsFor(name).map((l) => l.name.toLowerCase()).join(" ");
  if (/milk|cream|foam|latte|cheese|velvet|custard/.test(layers + " " + n)) set.add("dairy");
  if (/hazelnut|almond|coco verde|praline/.test(layers + " " + n)) set.add("tree nuts");
  if (/coconut/.test(layers + " " + n)) set.add("coconut");
  return [...set];
}

/** Tasting notes for an item — falls back to its layer list read as flavour. */
export function tasteFor(name: string): string | null {
  if (TASTE[name]) return TASTE[name];
  const key = Object.keys(TASTE).find((k) => name.includes(k) || k.includes(name));
  return key ? TASTE[key] : null;
}

// ── Drink accent colours (muted-saturation, tuned for the dark canvas) ──
// Per-drink where it matters, category fallback otherwise.
export const DRINK_ACCENTS: Record<string, string> = {
  // matcha collection
  "Emerald Hazelnut Reserve": "#8FB573",
  "Sakura Berry": "#E58CA0",
  "Velvet Vanilla": "#E9D8A6",
  "Rose Élixir": "#D87093",
  "Coco Verde": "#7FC8A9",
  // signature lattes
  Cheesecake: "#F2B5C4",
  "Red Velvet": "#D14D5F",
  "Caramel Craze": "#E0A23C",
  Cocomocha: "#B07B53",
  // seasonal
  "Iced Strawberry Latte": "#ED6A85",
  "Blue Pea Tea Latte": "#8B9DE0",
  // food & bakes
  "Classic Croissant": "#E2B45A",
  "Avocado Toast": "#8FBF6F",
  "Cheesecake Slice": "#F2B5C4",
  "Mango Shake": "#F2A93B",
  // juices
  "Watermelon Fresh": "#F06A6A",
  "Mango Magic": "#F2A93B",
  "Detox Green": "#7CC25E",
  "Berry Blast": "#B873E8",
  "Citrus Cooler": "#EFD35C",
  "Carrot Glow": "#F08A3C",
};

export const CATEGORY_ACCENTS: Record<string, string> = {
  "Matcha Collection": "#8FB573",
  "Signature Lattes": "#E58CA0",
  "Coffee Classics": "#C99B6B",
  "Classic Lattes": "#D9A05B",
  Macchiatos: "#C98A6B",
  "Cold-Pressed Juices": "#F2A93B",
  "Food & Bakes": "#E2B45A",
};

export function accentFor(name: string, category?: string): string {
  return DRINK_ACCENTS[name] ?? (category ? CATEGORY_ACCENTS[category] : undefined) ?? "#B59556";
}

// ── Ingredient composition (layered bottom→top; pct ≈ glass share) ──
export type Ingredient = { name: string; pct: number; color: string };

export const INGREDIENTS: Record<string, Ingredient[]> = {
  "Emerald Hazelnut Reserve": [
    { name: "Steamed milk", pct: 45, color: "#F4ECDD" },
    { name: "Hazelnut syrup", pct: 15, color: "#C68B4E" },
    { name: "Ceremonial matcha", pct: 30, color: "#6F9E55" },
    { name: "Roasted hazelnut crumble", pct: 10, color: "#8A5A36" },
  ],
  "Sakura Berry": [
    { name: "Milk", pct: 40, color: "#F4ECDD" },
    { name: "Strawberry purée", pct: 25, color: "#E16A7E" },
    { name: "Ceremonial matcha", pct: 25, color: "#6F9E55" },
    { name: "Sakura cream foam", pct: 10, color: "#F2B5C4" },
  ],
  "Velvet Vanilla": [
    { name: "Milk", pct: 45, color: "#F4ECDD" },
    { name: "Vanilla bean syrup", pct: 15, color: "#E9D8A6" },
    { name: "Ceremonial matcha", pct: 30, color: "#6F9E55" },
    { name: "Vanilla cream", pct: 10, color: "#FBF3DC" },
  ],
  "Rose Élixir": [
    { name: "Milk", pct: 40, color: "#F4ECDD" },
    { name: "Rose syrup", pct: 20, color: "#D87093" },
    { name: "Ceremonial matcha", pct: 30, color: "#6F9E55" },
    { name: "Dried rose petals", pct: 10, color: "#C25B6E" },
  ],
  "Coco Verde": [
    { name: "Coconut milk", pct: 45, color: "#FBF7EE" },
    { name: "Ceremonial matcha", pct: 35, color: "#6F9E55" },
    { name: "Toasted coconut flakes", pct: 20, color: "#D9B98C" },
  ],
  Cheesecake: [
    { name: "Milk", pct: 40, color: "#F4ECDD" },
    { name: "Cheesecake base", pct: 20, color: "#F2E3C9" },
    { name: "Espresso", pct: 25, color: "#5C3A23" },
    { name: "Strawberry crumble", pct: 15, color: "#E16A7E" },
  ],
  "Red Velvet": [
    { name: "Milk", pct: 40, color: "#F4ECDD" },
    { name: "Red velvet cocoa", pct: 25, color: "#C9485B" },
    { name: "Espresso", pct: 25, color: "#5C3A23" },
    { name: "Cream-cheese foam", pct: 10, color: "#F7EFE2" },
  ],
  "Caramel Craze": [
    { name: "Milk", pct: 40, color: "#F4ECDD" },
    { name: "Golden caramel", pct: 25, color: "#D9913B" },
    { name: "Espresso", pct: 25, color: "#5C3A23" },
    { name: "Caramel brittle", pct: 10, color: "#B96F2E" },
  ],
  Cocomocha: [
    { name: "Coconut milk", pct: 40, color: "#FBF7EE" },
    { name: "Dark cocoa", pct: 25, color: "#6B4630" },
    { name: "Espresso", pct: 25, color: "#5C3A23" },
    { name: "Chocolate shavings", pct: 10, color: "#4A2F1F" },
  ],
  "Iced Strawberry Latte": [
    { name: "Ice", pct: 15, color: "#DDEBF2" },
    { name: "Milk", pct: 35, color: "#F4ECDD" },
    { name: "Strawberry purée", pct: 30, color: "#E16A7E" },
    { name: "Espresso", pct: 20, color: "#5C3A23" },
  ],
  "Blue Pea Tea Latte": [
    { name: "Ice", pct: 15, color: "#DDEBF2" },
    { name: "Milk", pct: 35, color: "#F4ECDD" },
    { name: "Butterfly-pea infusion", pct: 35, color: "#7D8FD0" },
    { name: "Citrus mist", pct: 15, color: "#DDE7F8" },
  ],
  "Classic Latte": [
    { name: "Steamed milk", pct: 70, color: "#F4ECDD" },
    { name: "Espresso", pct: 25, color: "#5C3A23" },
    { name: "Microfoam", pct: 5, color: "#FBF6EA" },
  ],
  "Caramel Latte": [
    { name: "Steamed milk", pct: 55, color: "#F4ECDD" },
    { name: "Buttery caramel", pct: 20, color: "#D9913B" },
    { name: "Espresso", pct: 25, color: "#5C3A23" },
  ],
  "Hazelnut Latte": [
    { name: "Steamed milk", pct: 55, color: "#F4ECDD" },
    { name: "Toasted hazelnut", pct: 20, color: "#C68B4E" },
    { name: "Espresso", pct: 25, color: "#5C3A23" },
  ],
  "Irish Cream Latte": [
    { name: "Steamed milk", pct: 55, color: "#F4ECDD" },
    { name: "Irish cream syrup", pct: 20, color: "#C7A06B" },
    { name: "Espresso", pct: 25, color: "#5C3A23" },
  ],
  "Classic Macchiato": [
    { name: "Bold espresso", pct: 70, color: "#5C3A23" },
    { name: "Milk foam mark", pct: 30, color: "#FBF6EA" },
  ],
  "Caramel Macchiato": [
    { name: "Espresso", pct: 60, color: "#5C3A23" },
    { name: "Caramel drizzle", pct: 15, color: "#D9913B" },
    { name: "Milk foam", pct: 25, color: "#FBF6EA" },
  ],
  "Hazelnut Macchiato": [
    { name: "Espresso", pct: 60, color: "#5C3A23" },
    { name: "Hazelnut drizzle", pct: 15, color: "#C68B4E" },
    { name: "Rich crema", pct: 25, color: "#E8CFA9" },
  ],
  "Irish Cream Macchiato": [
    { name: "Bold espresso", pct: 60, color: "#5C3A23" },
    { name: "Irish cream", pct: 15, color: "#C7A06B" },
    { name: "Milk foam", pct: 25, color: "#FBF6EA" },
  ],
  Espresso: [{ name: "Double-shot espresso", pct: 100, color: "#5C3A23" }],
  Americano: [
    { name: "Hot water", pct: 65, color: "#A9805C" },
    { name: "Espresso", pct: 35, color: "#5C3A23" },
  ],
  Cappuccino: [
    { name: "Steamed milk", pct: 35, color: "#F4ECDD" },
    { name: "Espresso", pct: 35, color: "#5C3A23" },
    { name: "Thick foam", pct: 30, color: "#FBF6EA" },
  ],
  "Flat White": [
    { name: "Steamed milk", pct: 40, color: "#F4ECDD" },
    { name: "Double espresso", pct: 35, color: "#5C3A23" },
    { name: "Velvet microfoam", pct: 25, color: "#FBF6EA" },
  ],
  Mocha: [
    { name: "Steamed milk", pct: 40, color: "#F4ECDD" },
    { name: "Dark chocolate", pct: 25, color: "#6B4630" },
    { name: "Espresso", pct: 35, color: "#5C3A23" },
  ],
  "Cold Brew": [
    { name: "18-hour cold brew", pct: 85, color: "#4A2F1F" },
    { name: "Ice", pct: 15, color: "#DDEBF2" },
  ],
  "Watermelon Fresh": [
    { name: "Cold-pressed watermelon", pct: 90, color: "#F06A6A" },
    { name: "Mint", pct: 10, color: "#6FAE5C" },
  ],
  "Mango Magic": [
    { name: "Alphonso mango", pct: 85, color: "#F2A93B" },
    { name: "Citrus squeeze", pct: 15, color: "#EFD35C" },
  ],
  "Detox Green": [
    { name: "Spinach + cucumber", pct: 60, color: "#7CC25E" },
    { name: "Green apple", pct: 30, color: "#C9E26F" },
    { name: "Ginger", pct: 10, color: "#E2C46B" },
  ],
  "Berry Blast": [
    { name: "Mixed berries", pct: 80, color: "#B873E8" },
    { name: "Apple base", pct: 20, color: "#C9E26F" },
  ],
  "Citrus Cooler": [
    { name: "Orange + lime", pct: 85, color: "#EFD35C" },
    { name: "Mint", pct: 10, color: "#6FAE5C" },
    { name: "Fizz", pct: 5, color: "#F4F1E4" },
  ],
  "Carrot Glow": [
    { name: "Cold-pressed carrot", pct: 75, color: "#F08A3C" },
    { name: "Orange", pct: 20, color: "#F2A93B" },
    { name: "Ginger", pct: 5, color: "#E2C46B" },
  ],
  "Mango Shake": [
    { name: "Ripe alphonso mango", pct: 55, color: "#F2A93B" },
    { name: "Chilled milk", pct: 30, color: "#F4ECDD" },
    { name: "Fresh mango chunks", pct: 15, color: "#E89A2F" },
  ],
  "Classic Croissant": [
    { name: "French butter", pct: 40, color: "#F2DFA8" },
    { name: "Laminated dough", pct: 50, color: "#E8C27A" },
    { name: "Golden glaze", pct: 10, color: "#C98A3B" },
  ],
  "Avocado Toast": [
    { name: "Smashed avocado", pct: 45, color: "#8FBF6F" },
    { name: "Sourdough", pct: 40, color: "#D9B98C" },
    { name: "Chilli flakes & olive oil", pct: 15, color: "#D96A4A" },
  ],
  "Cheesecake Slice": [
    { name: "Velvet cheesecake", pct: 65, color: "#F2E3C9" },
    { name: "Biscuit base", pct: 20, color: "#C99B6B" },
    { name: "Strawberry compote", pct: 15, color: "#E16A7E" },
  ],
};

/** Add-on names → pourable glass layers (cart visualisation). */
export const ADDON_LAYERS: Record<string, Ingredient> = {
  "Extra espresso shot": { name: "Extra shot", pct: 14, color: "#5C3A23" },
  "Whipped cream": { name: "Whipped cream", pct: 12, color: "#FBF3DC" },
  "Flavour syrup": { name: "Syrup", pct: 10, color: "#D9913B" },
  "Almond milk": { name: "Almond milk", pct: 12, color: "#EFE3CE" },
  "Oat milk": { name: "Oat milk", pct: 12, color: "#EADFC8" },
};

export function ingredientsFor(name: string): Ingredient[] {
  if (INGREDIENTS[name]) return INGREDIENTS[name];
  const key = Object.keys(INGREDIENTS).find((k) => name.includes(k) || k.includes(name));
  return key
    ? INGREDIENTS[key]
    : [
        { name: "Steamed milk", pct: 60, color: "#F4ECDD" },
        { name: "Espresso", pct: 40, color: "#5C3A23" },
      ];
}

// ── Customise your cup ──
export const addOns: { name: string; price: number }[] = [
  { name: "Extra espresso shot", price: 30 },
  { name: "Whipped cream", price: 30 },
  { name: "Flavour syrup", price: 30 },
  { name: "Almond milk", price: 40 },
  { name: "Oat milk", price: 40 },
];
