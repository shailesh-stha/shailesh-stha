import { profile } from "./profile";

// Legal page data. `npm run check:content:strict` fails while any open-item marker is left in app/, so the site cannot be launched incomplete.
// TODO: add street and house number below. A full postal address is required for the Impressum; the postcode and city are what is known so far.
const address = "70193 Stuttgart, Germany";

export const legal = {
  imprint: {
    name: profile.name,
    address,
    emails: [profile.contact.personalEmail, profile.contact.workEmail],
  },
  privacy: {
    controller: `${profile.name}, ${address}`,
    // TODO: have this text reviewed and update it when the host changes (for example to Cloudflare).
    hosting:
      "This site is hosted on GitHub Pages by GitHub, Inc. When you open a page, GitHub processes technical data such as your IP address in its server logs. See GitHub's privacy statement for details.",
  },
} as const;
