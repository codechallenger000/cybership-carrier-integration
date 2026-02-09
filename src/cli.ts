import { buildService } from "./index.js";

async function main() {
  const svc = buildService();

  const resp = await svc.rateShop({
    carrier: "UPS",
    origin: {
      name: "ShipperName",
      addressLine1: "5 Woodbine Rd",
      city: "Alpharetta",
      stateProvinceCode: "GA",
      postalCode: "30005",
      countryCode: "US"
    },
    destination: {
      name: "ShipToName",
      addressLine1: "103 avenue des Champs-Elysees",
      city: "STARZACH",
      stateProvinceCode: "GA",
      postalCode: "30005",
      countryCode: "US"
    },
    packages: [{ lengthIn: 5, widthIn: 5, heightIn: 5, weightLb: 1 }]
  });

  console.log(JSON.stringify(resp, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
