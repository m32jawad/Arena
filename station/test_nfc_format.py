#!/usr/bin/env python3
"""
Test script to verify NFC UID format conversion.

This script demonstrates the conversion from PN532 raw UID bytes
to USB format (decimal number, little-endian).
"""

def test_uid_conversion():
    """Test various UID conversions."""
    
    # Example UIDs (as they come from PN532)
    test_uids = [
        bytes([0x12, 0x34, 0x56, 0x78]),  # 4-byte UID
        bytes([0xAA, 0xBB, 0xCC, 0xDD]),  # Another 4-byte UID
        bytes([0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07]),  # 7-byte UID
    ]
    
    print("NFC UID Format Conversion Test")
    print("=" * 60)
    
    for uid in test_uids:
        # Convert to hex format (old way)
        hex_format = uid.hex().upper()
        
        # Convert to USB format (new way - decimal, little-endian)
        usb_format = int.from_bytes(uid, byteorder="little")
        
        print(f"\nRaw bytes: {uid.hex()}")
        print(f"  HEX format:  {hex_format}")
        print(f"  USB format:  {usb_format}")
    
    print("\n" + "=" * 60)
    print("✅ The station now uses USB format (decimal number)")
    print("   This matches the format from USB NFC readers")

if __name__ == "__main__":
    test_uid_conversion()
