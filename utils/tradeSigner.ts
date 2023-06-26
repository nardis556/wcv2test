import { ethers } from "ethers";

export async function createSigArray(orderParams) {
    try {
      if (!orderParams || typeof orderParams !== "object") {
        console.error("Invalid orderParams");
        return null;
      }

      const nonceAsByteArray = ethers.utils.arrayify(
        `0x${orderParams.nonce.replace(/-/g, "")}`
      );

      return [
        ["uint8", 4],
        ["uint128", nonceAsByteArray],
        ["address", orderParams.wallet],
        ["string", orderParams.market],
        ["uint8", 0],
        ["uint8", 0],
        ["string", orderParams.quantity],
        ["bool", false],
        ["string", ""],
        ["string", ""],
        ["string", ""],
        ["uint8", 0],
        ["uint8", 0],
        ["uint64", 0],
      ];
    } catch (e) {
      console.error(e);
      return e;
    }
  }

export const buildSigHashParams = async (signatureParameters) => {
    try {
      let fields = signatureParameters.map((param) => param[0]);
      let values = signatureParameters.map((param) => param[1]);
      return ethers.utils.solidityKeccak256(fields, values);
    } catch (e) {
      console.error(e);
      return e;
    }
  };