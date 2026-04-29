use litesvm::LiteSVM;
use solana_instruction::{AccountMeta, Instruction};
use solana_keypair::Keypair;
use solana_pubkey::Pubkey;
use solana_sha256_hasher::hashv;
use solana_signer::Signer;
use solana_transaction::Transaction;

const PROGRAM_ID: &str = "EvRzd8MXqxojEmn4jViXv8NyxVXoU3X1gEuSv1tw9qML";
const SYSTEM_PROGRAM: &str = "11111111111111111111111111111111";

fn disc(name: &str) -> [u8; 8] {
    hashv(&[format!("global:{name}").as_bytes()]).as_ref()[..8]
        .try_into()
        .unwrap()
}

fn pid() -> Pubkey { PROGRAM_ID.parse().unwrap() }
fn sys() -> Pubkey { SYSTEM_PROGRAM.parse().unwrap() }

fn authority_pda() -> (Pubkey, u8) {
    Pubkey::find_program_address(&[b"proof_authority"], &pid())
}

fn make_svm() -> LiteSVM {
    let mut svm = LiteSVM::new();
    svm.add_program(pid(), include_bytes!("../../../target/deploy/tourchain_proof.so"));
    svm
}

fn send(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair) {
    let bh = svm.latest_blockhash();
    svm.send_transaction(Transaction::new_signed_with_payer(
        &[ix], Some(&payer.pubkey()), &[payer], bh,
    )).expect("tx should succeed");
}

fn send_fail(svm: &mut LiteSVM, ix: Instruction, payer: &Keypair) {
    let bh = svm.latest_blockhash();
    assert!(
        svm.send_transaction(Transaction::new_signed_with_payer(
            &[ix], Some(&payer.pubkey()), &[payer], bh,
        )).is_err(),
        "expected tx to fail"
    );
}

fn ix_init(pda: Pubkey, admin: &Pubkey, merkle_tree: Pubkey) -> Instruction {
    let mut data = disc("initialize_proof_authority").to_vec();
    data.extend_from_slice(merkle_tree.as_ref());
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(pda, false),
            AccountMeta::new(*admin, true),
            AccountMeta::new_readonly(sys(), false),
        ],
        data,
    }
}

/// Builds a mint_completion_proof ix with arbitrary accounts (for constraint-rejection tests).
fn ix_mint(
    authority_pda: Pubkey,
    admin: &Pubkey,
    leaf_owner: Pubkey,
    name: &str,
    symbol: &str,
    uri: &str,
) -> Instruction {
    // Borsh-encode: disc + BubblegumMetadataArgs (string fields + fixed fields)
    let mut data = disc("mint_completion_proof").to_vec();
    // name (string = 4-byte len prefix + bytes)
    let name_bytes = name.as_bytes();
    data.extend_from_slice(&(name_bytes.len() as u32).to_le_bytes());
    data.extend_from_slice(name_bytes);
    // symbol
    let sym_bytes = symbol.as_bytes();
    data.extend_from_slice(&(sym_bytes.len() as u32).to_le_bytes());
    data.extend_from_slice(sym_bytes);
    // uri
    let uri_bytes = uri.as_bytes();
    data.extend_from_slice(&(uri_bytes.len() as u32).to_le_bytes());
    data.extend_from_slice(uri_bytes);
    // seller_fee_basis_points (u16)
    data.extend_from_slice(&0u16.to_le_bytes());
    // primary_sale_happened (bool)
    data.push(1u8);
    // is_mutable (bool)
    data.push(0u8);
    // edition_nonce: Option<u8> = None
    data.push(0u8);
    // token_standard: Option<u8> = None
    data.push(0u8);
    // collection: Option<BubblegumCollection> = None
    data.push(0u8);
    // uses: Option<BubblegumUses> = None
    data.push(0u8);
    // token_program_version: Original = 0
    data.push(0u8);
    // creators: Vec<BubblegumCreator> = empty
    data.extend_from_slice(&0u32.to_le_bytes());

    let dummy = Pubkey::new_unique();
    Instruction {
        program_id: pid(),
        accounts: vec![
            AccountMeta::new(authority_pda, false),
            AccountMeta::new(*admin, true),
            AccountMeta::new(dummy, false),        // tree_config
            AccountMeta::new_readonly(leaf_owner, false),
            AccountMeta::new_readonly(leaf_owner, false), // leaf_delegate
            AccountMeta::new(dummy, false),        // merkle_tree
            AccountMeta::new_readonly(dummy, false), // log_wrapper
            AccountMeta::new_readonly(dummy, false), // compression_program
            AccountMeta::new_readonly(dummy, false), // bubblegum_program
            AccountMeta::new_readonly(sys(), false),
        ],
        data,
    }
}

// ── initialize_proof_authority ────────────────────────────────────────────────

#[test]
fn initialize_proof_authority_happy_path() {
    let mut svm = make_svm();
    let admin = Keypair::new();
    svm.airdrop(&admin.pubkey(), 10_000_000_000).unwrap();

    let (pda, _) = authority_pda();
    let tree = Pubkey::new_unique();
    send(&mut svm, ix_init(pda, &admin.pubkey(), tree), &admin);

    let account = svm.get_account(&pda).expect("proof_authority PDA must exist");
    assert_eq!(account.owner, pid());
    assert!(account.data.len() >= 8 + 32 + 32 + 8 + 1);
}

#[test]
fn initialize_proof_authority_duplicate_fails() {
    let mut svm = make_svm();
    let admin = Keypair::new();
    svm.airdrop(&admin.pubkey(), 10_000_000_000).unwrap();

    let (pda, _) = authority_pda();
    let tree = Pubkey::new_unique();
    send(&mut svm, ix_init(pda, &admin.pubkey(), tree), &admin);
    send_fail(&mut svm, ix_init(pda, &admin.pubkey(), tree), &admin);
}

// ── mint_completion_proof ─────────────────────────────────────────────────────

#[test]
fn mint_wrong_admin_rejected() {
    let mut svm = make_svm();
    let admin = Keypair::new();
    svm.airdrop(&admin.pubkey(), 10_000_000_000).unwrap();

    let (pda, _) = authority_pda();
    let tree = Pubkey::new_unique();
    send(&mut svm, ix_init(pda, &admin.pubkey(), tree), &admin);

    // Impostor tries to mint — constraint check fires before any CPI
    let impostor = Keypair::new();
    svm.airdrop(&impostor.pubkey(), 10_000_000_000).unwrap();
    let leaf = Pubkey::new_unique();
    send_fail(
        &mut svm,
        ix_mint(pda, &impostor.pubkey(), leaf, "Peak NFT", "PEAK", "https://example.com/meta.json"),
        &impostor,
    );
}
