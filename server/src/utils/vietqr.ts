import * as QRCode from "qrcode";

function crc16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) crc = (crc << 1) ^ 0x1021;
      else crc <<= 1;
      crc &= 0xffff;
    }
  }
  return (crc & 0xffff).toString(16).toUpperCase().padStart(4, "0");
}

export interface VietQRResult {
  qrDataUrl: string;
  bankAccount: string;
  bankName: string;
  bankHolder: string;
  amount: number;
  content: string;
}

export async function generateVietQR(
  amount: number,
  referenceId: string
): Promise<VietQRResult> {
  const bankAccount = process.env.BANK_ACCOUNT || "19036667778888";
  const bankName = process.env.BANK_NAME || "Techcombank";
  const bankHolder = process.env.BANK_HOLDER || "CTCP QUAN LY GIAN HANG";
  const bankBin = process.env.BANK_BIN || "970416";

  const content = `Thanh toan ${referenceId}`;
  const amountStr = Math.round(amount).toString();

  const merchantInfo = `00A000000727${bankBin.length.toString().padStart(2, "0")}${bankBin}${bankAccount.length.toString().padStart(2, "0")}${bankAccount}`;
  const merchantData = `38${(merchantInfo.length + 2).toString().padStart(2, "0")}${merchantInfo}`;

  const addData = `08${referenceId.length.toString().padStart(2, "0")}${referenceId}`;
  const addDataField = `62${(addData.length + 2).toString().padStart(2, "0")}${addData}`;

  let payload = `000201` + merchantData + `5303704` + `54${amountStr.length.toString().padStart(2, "0")}${amountStr}` + `5802VN` + addDataField;

  const crc = crc16(payload + "6304");
  payload += "63" + crc;

  const qrDataUrl = await QRCode.toDataURL(payload, {
    width: 400,
    margin: 2,
    color: { dark: "#000000", light: "#ffffff" }
  });

  return {
    qrDataUrl,
    bankAccount,
    bankName,
    bankHolder,
    amount,
    content
  };
}
