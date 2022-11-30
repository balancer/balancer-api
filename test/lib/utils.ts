import { formatBytes32String } from "@ethersproject/strings";

export const formatAddress = (text: string): string => {
  if (text.match(/^(0x)?[0-9a-fA-F]{40}$/)) return text; // Return text if it's already a valid address
  return formatBytes32String(text).slice(0, 42);
};

export const formatId = (text: string): string => {
  if (text.match(/^(0x)?[0-9a-fA-F]{64}$/)) return text; // Return text if it's already a valid id
  return formatBytes32String(text);
};