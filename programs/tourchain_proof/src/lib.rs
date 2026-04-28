use anchor_lang::prelude::*;
use anchor_lang::solana_program::instruction::{AccountMeta, Instruction};
use anchor_lang::solana_program::program::invoke;

declare_id!("EvRzd8MXqxojEmn4jViXv8NyxVXoU3X1gEuSv1tw9qML");

// sha256("global:mintV1")[0..8] — discriminator for deployed mpl-bubblegum v1
const BUBBLEGUM_MINT_V1_DISCRIMINATOR: [u8; 8] = [254, 205, 116, 98, 30, 28, 105, 59];

#[program]
pub mod tourchain_proof {
    use super::*;

    /// One-time setup after off-chain tree creation via init-merkle-tree.ts
    pub fn initialize_proof_authority(
        ctx: Context<InitializeProofAuthority>,
        merkle_tree: Pubkey,
    ) -> Result<()> {
        let auth = &mut ctx.accounts.proof_authority;
        auth.admin = ctx.accounts.admin.key();
        auth.merkle_tree = merkle_tree;
        auth.total_minted = 0;
        auth.bump = ctx.bumps.proof_authority;
        emit!(ProofAuthorityInitialized {
            admin: auth.admin,
            merkle_tree: auth.merkle_tree,
        });
        Ok(())
    }

    /// Admin-only: mint a compressed NFT completion proof via Bubblegum CPI
    pub fn mint_completion_proof(
        ctx: Context<MintCompletionProof>,
        name: String,
        symbol: String,
        uri: String,
    ) -> Result<()> {
        require!(name.len() <= 32, ProofError::NameTooLong);
        require!(symbol.len() <= 10, ProofError::SymbolTooLong);
        require!(uri.len() <= 200, ProofError::UriTooLong);

        let metadata = BubblegumMetadataArgs {
            name: name.clone(),
            symbol: symbol.clone(),
            uri: uri.clone(),
            seller_fee_basis_points: 0,
            primary_sale_happened: true,
            is_mutable: false,
            edition_nonce: None,
            // None defaults to NonFungible inside Bubblegum
            token_standard: None,
            collection: None,
            uses: None,
            token_program_version: BubblegumTokenProgramVersion::Original,
            creators: vec![],
        };

        let mut ix_data: Vec<u8> = BUBBLEGUM_MINT_V1_DISCRIMINATOR.to_vec();
        AnchorSerialize::serialize(&metadata, &mut ix_data)
            .map_err(|_| error!(ProofError::Overflow))?;

        // tree_creator_or_delegate = admin (admin created the tree via init-merkle-tree.ts)
        let ix_accounts = vec![
            AccountMeta::new(ctx.accounts.tree_config.key(), false),
            AccountMeta::new_readonly(ctx.accounts.leaf_owner.key(), false),
            AccountMeta::new_readonly(ctx.accounts.leaf_delegate.key(), false),
            AccountMeta::new(ctx.accounts.merkle_tree.key(), false),
            AccountMeta::new(ctx.accounts.admin.key(), true),
            AccountMeta::new_readonly(ctx.accounts.admin.key(), false),
            AccountMeta::new_readonly(ctx.accounts.log_wrapper.key(), false),
            AccountMeta::new_readonly(ctx.accounts.compression_program.key(), false),
            AccountMeta::new_readonly(ctx.accounts.system_program.key(), false),
        ];

        invoke(
            &Instruction {
                program_id: ctx.accounts.bubblegum_program.key(),
                accounts: ix_accounts,
                data: ix_data,
            },
            &[
                ctx.accounts.tree_config.to_account_info(),
                ctx.accounts.leaf_owner.to_account_info(),
                ctx.accounts.leaf_delegate.to_account_info(),
                ctx.accounts.merkle_tree.to_account_info(),
                ctx.accounts.admin.to_account_info(),
                ctx.accounts.log_wrapper.to_account_info(),
                ctx.accounts.compression_program.to_account_info(),
                ctx.accounts.system_program.to_account_info(),
                ctx.accounts.bubblegum_program.to_account_info(),
            ],
        )?;

        ctx.accounts.proof_authority.total_minted = ctx
            .accounts
            .proof_authority
            .total_minted
            .checked_add(1)
            .ok_or(error!(ProofError::Overflow))?;

        emit!(CompletionProofMinted {
            admin: ctx.accounts.admin.key(),
            leaf_owner: ctx.accounts.leaf_owner.key(),
            total_minted: ctx.accounts.proof_authority.total_minted,
        });

        Ok(())
    }
}

// 8 + 32 + 32 + 8 + 1 = 81 bytes
#[account]
pub struct ProofAuthority {
    pub admin: Pubkey,
    pub merkle_tree: Pubkey,
    pub total_minted: u64,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct InitializeProofAuthority<'info> {
    #[account(
        init,
        payer = admin,
        space = 8 + 32 + 32 + 8 + 1,
        seeds = [b"proof_authority"],
        bump
    )]
    pub proof_authority: Account<'info, ProofAuthority>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintCompletionProof<'info> {
    #[account(
        mut,
        seeds = [b"proof_authority"],
        bump = proof_authority.bump,
        constraint = proof_authority.admin == admin.key() @ ProofError::UnauthorizedAdmin
    )]
    pub proof_authority: Account<'info, ProofAuthority>,
    #[account(mut)]
    pub admin: Signer<'info>,
    /// CHECK: Bubblegum tree config PDA — validated by Bubblegum on CPI
    #[account(mut)]
    pub tree_config: UncheckedAccount<'info>,
    /// CHECK: NFT recipient — validated by Bubblegum on CPI
    pub leaf_owner: UncheckedAccount<'info>,
    /// CHECK: NFT delegate — validated by Bubblegum on CPI
    pub leaf_delegate: UncheckedAccount<'info>,
    /// CHECK: spl-account-compression merkle tree — validated by Bubblegum on CPI
    #[account(mut)]
    pub merkle_tree: UncheckedAccount<'info>,
    /// CHECK: spl-noop log wrapper program
    pub log_wrapper: UncheckedAccount<'info>,
    /// CHECK: spl-account-compression program
    pub compression_program: UncheckedAccount<'info>,
    /// CHECK: mpl-bubblegum program; admin-only instruction limits misuse risk
    pub bubblegum_program: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

/// Borsh layout matching mpl-bubblegum v1 MetadataArgs
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BubblegumMetadataArgs {
    pub name: String,
    pub symbol: String,
    pub uri: String,
    pub seller_fee_basis_points: u16,
    pub primary_sale_happened: bool,
    pub is_mutable: bool,
    pub edition_nonce: Option<u8>,
    /// Raw u8 to avoid enum index divergence; None = NonFungible default in Bubblegum
    pub token_standard: Option<u8>,
    pub collection: Option<BubblegumCollection>,
    pub uses: Option<BubblegumUses>,
    pub token_program_version: BubblegumTokenProgramVersion,
    pub creators: Vec<BubblegumCreator>,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BubblegumCollection {
    pub verified: bool,
    pub key: Pubkey,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BubblegumUses {
    pub use_method: u8,
    pub remaining: u64,
    pub total: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct BubblegumCreator {
    pub address: Pubkey,
    pub verified: bool,
    pub share: u8,
}

/// Borsh ordinal: Original=0, Token2022=1 — matches mpl-bubblegum TokenProgramVersion
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub enum BubblegumTokenProgramVersion {
    Original,
    Token2022,
}

#[event]
pub struct ProofAuthorityInitialized {
    pub admin: Pubkey,
    pub merkle_tree: Pubkey,
}

#[event]
pub struct CompletionProofMinted {
    pub admin: Pubkey,
    pub leaf_owner: Pubkey,
    pub total_minted: u64,
}

#[error_code]
pub enum ProofError {
    #[msg("Caller is not the registered admin")]
    UnauthorizedAdmin,
    #[msg("Name must be 32 characters or fewer")]
    NameTooLong,
    #[msg("Symbol must be 10 characters or fewer")]
    SymbolTooLong,
    #[msg("URI must be 200 characters or fewer")]
    UriTooLong,
    #[msg("Arithmetic overflow")]
    Overflow,
}
