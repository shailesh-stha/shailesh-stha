// Legal page data. The gate (`npm run check:content:strict`) fails while any value still says TODO, so the site cannot be deployed incomplete.
export const legal = {
  imprint: {
    name: "Shailesh Shrestha",
    address: "TODO: postal address for the Impressum",
    email: "TODO: contact email for the Impressum",
    phone: "TODO: decide whether a phone number is needed",
  },
  privacy: {
    controller: "TODO: same details as the Impressum",
    hosting: "TODO: confirm host (Cloudflare) and what its logs record before launch",
  },
} as const;
