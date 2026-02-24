# BricsCoin - PRD

## Architecture
- Main (bricscoin26.org / 5.161.254.163): Frontend, Backend, SOLO pool (3333)
- PPLNS (157.180.123.105): PPLNS pool (3334) + HTTP API (8080)

## All Fixes Deployed (Feb 24, 2026)

### Blockchain Page
1. Transactions navigation preserves tab=explorer
2. Mining tab removed

### P2Pool Miner Display
3. Miner tracking by miner_id (ip:port) - handles 2 Bitaxe behind same NAT
4. PPLNS blocks_found = 0 (block submission to main node not yet working)
5. "unknown" entries filtered and cleaned
6. Pool Hashrate = local SOLO + remote PPLNS (~15+ TH/s)
7. Active Miners = 3 SOLO + 2 PPLNS = 5

### Infrastructure
8. PPLNS HTTP API with real hashrate calculation
9. Pending TX fix (id/tx_id field handling)
10. Stale peer cleanup

## Known Issue
- PPLNS block submission uses wrong hash (single SHA-256 vs double). Blocks found by PPLNS miners aren't submitted to blockchain. Need to fix header reconstruction in submit_block_to_main().

## Backlog
### P1 - Miner Reward to PQC Address, Fix PPLNS block submission
### P2 - BricsID / BricsVault, Repository Cleanup
### P3 - Mobile Wallet
