export type CurrencyCode = string;

export type Address = {
  name?: string;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  stateProvinceCode?: string;
  postalCode: string;
  countryCode: string;
};

export type Package = {
  lengthIn: number;
  widthIn: number;
  heightIn: number;
  weightLb: number;
};

export type RateRequest = {
  carrier: "UPS";
  origin: Address;
  destination: Address;
  packages: Package[];
  serviceLevel?: string;
  shipDateISO?: string;
};

export type RateQuote = {
  carrier: "UPS";
  serviceCode: string;
  serviceName?: string;
  total: {
    currency: CurrencyCode;
    amount: string;
  };
  raw?: unknown;
};

export type RateShopResponse = {
  quotes: RateQuote[];
};
