# AXI4 Slave Interface Specification

## Overview

This document specifies the verification requirements for an AXI4 slave interface module.

## Protocol

The design implements an AXI4 slave interface compliant with the AMBA AXI4 specification.

## Transactions

### Write Transaction

A write transaction consists of:

- Write address phase (AWVALID, AWREADY, AWADDR)
- Write data phase (WVALID, WREADY, WDATA, WSTRB)
- Write response phase (BVALID, BREADY, BRESP)

Fields:

- Address: 32-bit address
- Data: 32-bit data
- Strobe: 4-bit write strobe
- Response: 2-bit response (OKAY, EXOKAY, SLVERR, DECERR)

### Read Transaction

A read transaction consists of:

- Read address phase (ARVALID, ARREADY, ARADDR)
- Read data phase (RVALID, RREADY, RDATA, RRESP)

Fields:

- Address: 32-bit address
- Data: 32-bit data
- Response: 2-bit response (OKAY, EXOKAY, SLVERR, DECERR)

## Timing Constraints

- Clock frequency: 100 MHz
- Reset: Active-low asynchronous reset (aresetn)
- Setup time: 1ns
- Hold time: 1ns

## Coverage Goals

1. All valid addresses should be accessed
2. All write strobes combinations should be tested
3. All response types should be generated
4. Back-to-back transactions should be tested
5. Outstanding transactions should be tested

## Error Scenarios

1. Invalid address access should return DECERR
2. Write to read-only location should return SLVERR
3. Timeout on slave response
4. Protocol violations (VALID without READY)
