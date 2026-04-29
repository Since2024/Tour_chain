use litesvm::LiteSVM;
use solana_instruction::{AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_pubkey::Pubkey;
use solana_sha256_hasher::hashv;
use solana_signer::Signer;
use solana_transaction::Transaction;

const PROGRAM_ID: &str = "B1M6gHx7W2tKPWwEEuKaumyk2H8zdETZGoBCDt9yamrt";
const SYSTEM_PROGRAM: &str = "11111111111111111111111111111111";

fn disc(name: &str) -> [u8; 8] {
    hashv(&[format!("global:{name}").as_bytes()]).as_ref()[..8]
        .try_into()
        .unwrap()
}

fn pid() -> Pubkey { PROGRAM_ID.parse().unwrap() }
fn sys() -> Pubkey { SYSTEM_PROGRAM.parse().unwrap() }

fn escrow_pda(tourist: &Pubkey, guide: &Pubkey, created_at: i64) -> (Pubkey, u8) {
    Pubkey::find_program_address(
        &[b"escrow", tourist.as_ref(), guide.as_ref(), &created_at.to_le_bytes()],
        &pid(),
    )
}

fn vault_pda(escrow: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"vault", escrow.as_ref()], &pid())
}

fn make_svm() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program(pid(), include_bytes!("../../../target/deploy/tourchain_escrow.so"));
    svm
}

fn send(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair, extras: &[&Keypair]) {
    let bh = svm.latest_blockhash();
    let mut signers = vec![payer];
    signers.extend_from_slice(extras);
    svm.send_transaction(Transaction::new_signed_with_payer(
        &[ix], Some(&payer.pubkey()), &signers, bh,
    )).expect("tx should succeed");
}

fn send_fail(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair, extras: &[&Keypair]) {
    let bh = svm.latest_blockhash();
    let mut signers = vec![payer];
    signers.extend_from_slice(extras);
    assert!(
        svm.send_transaction(Transaction::new_signed_with_payer(
            &[ix], Some(&payer.pubkey()), &signers, bh,
        )).is_err(),
        "expected tx to fail"
    );
}

fn ix_create(tourist: &Pubkey, guide: &Pubkey, admin: &Pubkey, escrow: Pubkey, vault: Pubkey, amount: u64, milestones: u8, created_at: i64) -> Instruction {
    let mut data = disc("create_escrow").to_vec();
    data.extend_from_slice(&amount.to_le_bytes());
    data.push(milestones);
    data.extend_from_slice(&created_at.to_le_bytes());
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(escrow, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(*tourist, true),
            AccountMeta::new_readonly(*guide, false),
            AccountMeta::new_readonly(*admin, false),
            AccountMeta::new_readonly(sys(), false),
        ],
        data,
    }
}

fn ix_activate(escrow: Pubkey, guide: &Pubkey) -> Instruction {
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(escrow, false),
            AccountMeta::new_readonly(*guide, true),
        ],
        data: disc("activate").to_vec(),
    }
}

fn ix_release(escrow: Pubkey, vault: Pubkey, tourist: &Pubkey, guide: &Pubkey) -> Instruction {
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(escrow, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(*tourist, true),
            AccountMeta::new(*guide, true),
            AccountMeta::new_readonly(sys(), false),
        ],
        data: disc("release_milestone").to_vec(),
    }
}

fn ix_complete(escrow: Pubkey, vault: Pubkey, tourist: &Pubkey, guide: &Pubkey) -> Instruction {
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(escrow, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(*tourist, true),
            AccountMeta::new(*guide, true),
            AccountMeta::new_readonly(sys(), false),
        ],
        data: disc("complete_booking").to_vec(),
    }
}

fn ix_cancel(escrow: Pubkey, vault: Pubkey, tourist: &Pubkey) -> Instruction {
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(escrow, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(*tourist, true),
            AccountMeta::new_readonly(sys(), false),
        ],
        data: disc("cancel_booking").to_vec(),
    }
}

fn ix_dispute(escrow: Pubkey, caller: &Pubkey) -> Instruction {
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(escrow, false),
            AccountMeta::new_readonly(*caller, true),
        ],
        data: disc("open_dispute").to_vec(),
    }
}

fn ix_resolve(escrow: Pubkey, vault: Pubkey, tourist: &Pubkey, guide: &Pubkey, admin: &Pubkey, bps: u16) -> Instruction {
    let mut data = disc("resolve_dispute").to_vec();
    data.extend_from_slice(&bps.to_le_bytes());
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(escrow, false),
            AccountMeta::new(vault, false),
            AccountMeta::new(*tourist, false),
            AccountMeta::new(*guide, false),
            AccountMeta::new(*admin, true),
            AccountMeta::new_readonly(sys(), false),
        ],
        data,
    }
}

struct Actors {
    tourist: Keypair,
    guide: Keypair,
    admin: Keypair,
    escrow: Pubkey,
    vault: Pubkey,
    created_at: i64,
}

fn setup(svm: &mut LiteSVM, amount: u64, milestones: u8) -> Actors {
    let tourist = Keypair::new();
    let guide = Keypair::new();
    let admin = Keypair::new();
    let created_at: i64 = 1_700_000_000;
    svm.airdrop(&tourist.pubkey(), amount + 100_000_000).unwrap();
    svm.airdrop(&guide.pubkey(), 10_000_000).unwrap();
    svm.airdrop(&admin.pubkey(), 10_000_000).unwrap();

    let (escrow, _) = escrow_pda(&tourist.pubkey(), &guide.pubkey(), created_at);
    let (vault, _) = vault_pda(&escrow);

    send(
        svm,
        ix_create(&tourist.pubkey(), &guide.pubkey(), &admin.pubkey(), escrow, vault, amount, milestones, created_at),
        &tourist, &[],
    );
    Actors { tourist, guide, admin, escrow, vault, created_at }
}

// ── create_escrow ─────────────────────────────────────────────────────────────

#[test]
fn create_escrow_happy_path() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 1_000_000_000, 2);
    let account = svm.get_account(&a.escrow).expect("escrow must exist");
    assert_eq!(account.owner, pid());
}

#[test]
fn create_escrow_zero_milestones_rejected() {
    let mut svm = make_svm();
    let tourist = Keypair::new();
    let guide = Keypair::new();
    let admin = Keypair::new();
    let created_at: i64 = 1_700_000_001;
    svm.airdrop(&tourist.pubkey(), 2_000_000_000).unwrap();
    let (escrow, _) = escrow_pda(&tourist.pubkey(), &guide.pubkey(), created_at);
    let (vault, _) = vault_pda(&escrow);
    send_fail(
        &mut svm,
        ix_create(&tourist.pubkey(), &guide.pubkey(), &admin.pubkey(), escrow, vault, 1_000_000, 0, created_at),
        &tourist, &[],
    );
}

// ── activate ──────────────────────────────────────────────────────────────────

#[test]
fn activate_by_guide() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 1_000_000_000, 1);
    send(&mut svm, ix_activate(a.escrow, &a.guide.pubkey()), &a.guide, &[]);
}

#[test]
fn activate_wrong_guide_rejected() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 1_000_000_000, 1);
    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 1_000_000).unwrap();
    send_fail(&mut svm, ix_activate(a.escrow, &impostor.pubkey()), &impostor, &[]);
}

// ── full lifecycle: create → activate → release × 2 → complete ───────────────

#[test]
fn full_lifecycle_two_milestones() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 2_000_000_000, 2);
    let guide_before = svm.get_account(&a.guide.pubkey()).map(|acc| acc.lamports).unwrap_or(0);

    send(&mut svm, ix_activate(a.escrow, &a.guide.pubkey()), &a.guide, &[]);
    send(&mut svm, ix_release(a.escrow, a.vault, &a.tourist.pubkey(), &a.guide.pubkey()), &a.tourist, &[&a.guide]);
    send(&mut svm, ix_complete(a.escrow, a.vault, &a.tourist.pubkey(), &a.guide.pubkey()), &a.tourist, &[&a.guide]);

    let guide_after = svm.get_account(&a.guide.pubkey()).map(|acc| acc.lamports).unwrap_or(0);
    assert!(guide_after > guide_before, "guide should have received SOL");
}

// ── cancel ────────────────────────────────────────────────────────────────────

#[test]
fn cancel_funded_refunds_tourist() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 1_000_000_000, 1);
    let before = svm.get_account(&a.tourist.pubkey()).map(|acc| acc.lamports).unwrap_or(0);
    send(&mut svm, ix_cancel(a.escrow, a.vault, &a.tourist.pubkey()), &a.tourist, &[]);
    let after = svm.get_account(&a.tourist.pubkey()).map(|acc| acc.lamports).unwrap_or(0);
    assert!(after > before, "tourist should be refunded after cancel");
}

#[test]
fn cancel_active_escrow_rejected() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 1_000_000_000, 1);
    send(&mut svm, ix_activate(a.escrow, &a.guide.pubkey()), &a.guide, &[]);
    send_fail(&mut svm, ix_cancel(a.escrow, a.vault, &a.tourist.pubkey()), &a.tourist, &[]);
}

// ── dispute ───────────────────────────────────────────────────────────────────

#[test]
fn dispute_and_resolve_full_tourist_refund() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 1_000_000_000, 1);
    send(&mut svm, ix_activate(a.escrow, &a.guide.pubkey()), &a.guide, &[]);
    send(&mut svm, ix_dispute(a.escrow, &a.tourist.pubkey()), &a.tourist, &[]);

    let tourist_before = svm.get_account(&a.tourist.pubkey()).map(|acc| acc.lamports).unwrap_or(0);
    send(&mut svm,
        ix_resolve(a.escrow, a.vault, &a.tourist.pubkey(), &a.guide.pubkey(), &a.admin.pubkey(), 10000),
        &a.admin, &[],
    );
    let tourist_after = svm.get_account(&a.tourist.pubkey()).map(|acc| acc.lamports).unwrap_or(0);
    assert!(tourist_after > tourist_before, "tourist should be fully refunded");
}

#[test]
fn resolve_dispute_wrong_admin_rejected() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 1_000_000_000, 1);
    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 1_000_000).unwrap();
    send(&mut svm, ix_activate(a.escrow, &a.guide.pubkey()), &a.guide, &[]);
    send(&mut svm, ix_dispute(a.escrow, &a.tourist.pubkey()), &a.tourist, &[]);
    send_fail(&mut svm,
        ix_resolve(a.escrow, a.vault, &a.tourist.pubkey(), &a.guide.pubkey(), &impostor.pubkey(), 5000),
        &impostor, &[],
    );
}

#[test]
fn resolve_bps_over_10000_rejected() {
    let mut svm = make_svm();
    let a = setup(&mut svm, 1_000_000_000, 1);
    send(&mut svm, ix_activate(a.escrow, &a.guide.pubkey()), &a.guide, &[]);
    send(&mut svm, ix_dispute(a.escrow, &a.tourist.pubkey()), &a.tourist, &[]);
    send_fail(&mut svm,
        ix_resolve(a.escrow, a.vault, &a.tourist.pubkey(), &a.guide.pubkey(), &a.admin.pubkey(), 10001),
        &a.admin, &[],
    );
}
