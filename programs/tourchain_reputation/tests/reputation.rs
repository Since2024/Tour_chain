use litesvm::LiteSVM;
use solana_instruction::{AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_pubkey::Pubkey;
use solana_sha256_hasher::hashv;
use solana_signer::Signer;
use solana_transaction::Transaction;

const PROGRAM_ID: &str = "BxgSbUELdL9cCj4hETtFJqyzDqFeRKAYefWBnVpDXk3L";
const SYSTEM_PROGRAM: &str = "11111111111111111111111111111111";

fn disc(name: &str) -> [u8; 8] {
    let hash = hashv(&[format!("global:{name}").as_bytes()]);
    hash.as_ref()[..8].try_into().unwrap()
}

fn program_id() -> Pubkey {
    PROGRAM_ID.parse().unwrap()
}

fn system_id() -> Pubkey {
    SYSTEM_PROGRAM.parse().unwrap()
}

fn guide_pda(authority: &Pubkey) -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"guide", authority.as_ref()], &program_id())
}

fn make_svm() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program(
        program_id(),
        include_bytes!("../../../target/deploy/tourchain_reputation.so"),
    );
    svm
}

fn ix_init(pda: Pubkey, authority: Pubkey, admin: Pubkey, name: [u8; 64]) -> Instruction {
    let mut data = disc("initialize_guide").to_vec();
    data.extend_from_slice(&name);
    Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(pda, false),
            AccountMeta::new_readonly(authority, false),
            AccountMeta::new(admin, true),
            AccountMeta::new_readonly(system_id(), false),
        ],
        data,
    }
}

fn ix_update(pda: Pubkey, admin: Pubkey, score: u8) -> Instruction {
    let mut data = disc("update_reputation").to_vec();
    data.push(score);
    Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(pda, false),
            AccountMeta::new_readonly(admin, true),
        ],
        data,
    }
}

fn ix_suspend(action: &str, pda: Pubkey, admin: Pubkey) -> Instruction {
    Instruction {
        program_id: program_id(),
        accounts: vec![
            AccountMeta::new(pda, false),
            AccountMeta::new_readonly(admin, true),
        ],
        data: disc(action).to_vec(),
    }
}

fn send_err(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair, signers: &[&Keypair]) {
    let bh = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), signers, bh);
    assert!(svm.send_transaction(tx).is_err(), "expected transaction to fail");
}

fn send_ok(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair, signers: &[&Keypair]) {
    let bh = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(&[ix], Some(&payer.pubkey()), signers, bh);
    svm.send_transaction(tx).expect("transaction should succeed");
}

fn setup_guide(svm: &mut LiteSVM) -> (Keypair, Keypair, Pubkey) {
    let admin = Keypair::new();
    let authority = Keypair::new();
    svm.airdrop(&admin.pubkey(), 10_000_000_000).unwrap();
    let (pda, _) = guide_pda(&authority.pubkey());
    let mut name = [0u8; 64];
    name[..11].copy_from_slice(b"Test Guide!");
    send_ok(svm, ix_init(pda, authority.pubkey(), admin.pubkey(), name), &admin, &[&admin]);
    (admin, authority, pda)
}

// ── initialize_guide ─────────────────────────────────────────────────────────

#[test]
fn initialize_guide_happy_path() {
    let mut svm = make_svm();
    let (_, _, pda) = setup_guide(&mut svm);
    let account = svm.get_account(&pda).expect("PDA must exist after init");
    assert_eq!(account.owner, program_id());
    assert!(account.data.len() > 8);
}

#[test]
fn initialize_guide_duplicate_fails() {
    let mut svm = make_svm();
    let (admin, authority, pda) = setup_guide(&mut svm);
    let mut name = [0u8; 64];
    name[..3].copy_from_slice(b"dup");
    // Second init on the same PDA must fail — account already exists
    let bh = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(
        &[ix_init(pda, authority.pubkey(), admin.pubkey(), name)],
        Some(&admin.pubkey()),
        &[&admin],
        bh,
    );
    assert!(svm.send_transaction(tx).is_err(), "duplicate init must fail");
}

// ── update_reputation ─────────────────────────────────────────────────────────

#[test]
fn update_reputation_happy_path() {
    let mut svm = make_svm();
    let (admin, _, pda) = setup_guide(&mut svm);
    send_ok(&mut svm, ix_update(pda, admin.pubkey(), 5), &admin, &[&admin]);
}

#[test]
fn update_reputation_score_zero_rejected() {
    let mut svm = make_svm();
    let (admin, _, pda) = setup_guide(&mut svm);
    let bh = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(
        &[ix_update(pda, admin.pubkey(), 0)],
        Some(&admin.pubkey()),
        &[&admin],
        bh,
    );
    assert!(svm.send_transaction(tx).is_err(), "score=0 must be rejected");
}

// ── suspend_guide + reinstate_guide ──────────────────────────────────────────

#[test]
fn suspend_blocks_update_reinstate_unblocks() {
    let mut svm = make_svm();
    let (admin, _, pda) = setup_guide(&mut svm);

    send_ok(&mut svm, ix_suspend("suspend_guide", pda, admin.pubkey()), &admin, &[&admin]);

    // update on suspended guide must fail
    let bh = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(
        &[ix_update(pda, admin.pubkey(), 4)],
        Some(&admin.pubkey()), &[&admin], bh,
    );
    assert!(svm.send_transaction(tx).is_err(), "update on suspended guide must fail");

    send_ok(&mut svm, ix_suspend("reinstate_guide", pda, admin.pubkey()), &admin, &[&admin]);
    send_ok(&mut svm, ix_update(pda, admin.pubkey(), 3), &admin, &[&admin]);
}

// ── wrong admin ───────────────────────────────────────────────────────────────

#[test]
fn wrong_admin_rejected() {
    let mut svm = make_svm();
    let (_, _, pda) = setup_guide(&mut svm);
    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 1_000_000_000).unwrap();

    let bh = svm.latest_blockhash();
    let tx = Transaction::new_signed_with_payer(
        &[ix_update(pda, impostor.pubkey(), 3)],
        Some(&impostor.pubkey()), &[&impostor], bh,
    );
    assert!(svm.send_transaction(tx).is_err(), "wrong admin must be rejected");
}
