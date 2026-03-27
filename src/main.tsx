import React from 'react';
import { createRoot } from 'react-dom/client';
import './setupThreeGlobal';
import App from './App.tsx';
import { MixEntry } from './data/MixEntry';
import { Crc32 } from './data/Crc32';
import { binaryStringToUint8Array } from './util/string';
console.log("--- Hashing Test Start (with debug logging) ---");
MixEntry.hashFilename("ART.INI", true);
console.log("---");
MixEntry.hashFilename("A", true);
console.log("---");
MixEntry.hashFilename("RULES.INI", true);
MixEntry.hashFilename("ABCDE", true);
console.log("---");
MixEntry.hashFilename("RA2.", true);
console.log("--- Standard CRC32 Test (for Crc32 class itself) ---");
const testData = binaryStringToUint8Array("123456789");
const crcDirect = Crc32.calculateCrc(testData);
const knownStandardCRC32 = 0xCBF43926;
console.log(`CRC32 for "123456789": ${crcDirect} (0x${crcDirect.toString(16).toUpperCase()})`);
console.log(`Expected Standard CRC32: ${knownStandardCRC32} (0x${knownStandardCRC32.toString(16).toUpperCase()})`);
if (crcDirect === knownStandardCRC32) {
    console.log("Crc32.calculateCrc matches known standard CRC32 value for \"123456789\"!");
}
else {
    console.error("Crc32.calculateCrc MISMATCH against known standard!");
}
console.log("--- Hashing Test End ---");
import { registerBuiltInBot } from './game/ai/thirdpartbot/builtIn/BuiltInBotAdapter';

// Register built-in third-party bots
registerBuiltInBot();

createRoot(document.getElementById('root')!).render(<React.StrictMode>
    <App />
  </React.StrictMode>);
