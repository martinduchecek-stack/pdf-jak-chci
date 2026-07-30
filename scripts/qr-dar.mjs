/**
 * Vygeneruje QR platbu pro dobrovolný příspěvek do public/qr-dar.svg.
 *
 * Formát SPAYD (Short Payment Descriptor) je český standard QR platby
 * podle ČBA — přečte ho mobilní bankovnictví všech tuzemských bank.
 *
 * Spustit po každé změně čísla účtu:  node scripts/qr-dar.mjs
 */
import QRCode from "qrcode";
import fs from "node:fs";

const IBAN = "CZ8730300000001793428035";
// Bez diakritiky — SPAYD připouští jen omezenou znakovou sadu.
const ZPRAVA = "Dar - Pdf jak chci";

// Částku záměrně neuvádíme, aby si ji dárce zvolil sám.
const spayd = `SPD*1.0*ACC:${IBAN}*CC:CZK*MSG:${ZPRAVA}`;

const svg = await QRCode.toString(spayd, {
  type: "svg",
  errorCorrectionLevel: "M",
  margin: 1,
  color: { dark: "#16222c", light: "#ffffff" },
});

fs.writeFileSync("public/qr-dar.svg", svg);
console.log("SPAYD:", spayd);
console.log("zapsáno: public/qr-dar.svg", fs.statSync("public/qr-dar.svg").size, "B");
