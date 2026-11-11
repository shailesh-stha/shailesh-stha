import { profile } from "./profile";

// Legal page data. The gate (`npm run check:content:strict`) fails while any value still says TODO, so the site cannot be deployed incomplete.
export const legal = {
  imprint: {
    name: profile.name,
    address: "TODO: postal address for the Impressum",
    emails: [profile.contact.personalEmail, profile.contact.workEmail],
  },
  privacy: {
    controller: "TODO: same details as the Impressum",
    hosting: "TODO: confirm host (Cloudflare) and what its logs record before launch",
  },
} as const;
