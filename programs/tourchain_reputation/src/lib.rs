use anchor_lang::prelude::*;

declare_id!("BxgSbUELdL9cCj4hETtFJqyzDqFeRKAYefWBnVpDXk3L");

const GUIDE_NAME_LEN: usize = 64;

#[program]
pub mod tourchain_reputation {
    use super::*;

    pub fn initialize_guide(
        ctx: Context<InitializeGuide>,
        name: [u8; GUIDE_NAME_LEN],
    ) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let guide = &mut ctx.accounts.guide_reputation;

        guide.authority = ctx.accounts.authority.key();
        guide.admin = ctx.accounts.admin.key();
        guide.name = name;
        guide.total_reviews = 0;
        guide.total_score = 0;
        guide.completed_treks = 0;
        guide.active_since = now;
        guide.is_verified = true;
        guide.is_suspended = false;
        guide.last_updated = now;
        guide.bump = ctx.bumps.guide_reputation;

        emit!(GuideRegistered {
            guide: guide.authority,
            admin: guide.admin,
            timestamp: now,
        });

        Ok(())
    }

    pub fn update_reputation(ctx: Context<UpdateReputation>, score: u8) -> Result<()> {
        let weighted_score = score_to_weighted(score)?;
        let now = Clock::get()?.unix_timestamp;
        let guide = &mut ctx.accounts.guide_reputation;
        require!(!guide.is_suspended, ReputationError::GuideSuspended);

        guide.total_reviews = guide
            .total_reviews
            .checked_add(1)
            .ok_or(ReputationError::Overflow)?;
        guide.total_score = guide
            .total_score
            .checked_add(weighted_score)
            .ok_or(ReputationError::Overflow)?;
        guide.completed_treks = guide
            .completed_treks
            .checked_add(1)
            .ok_or(ReputationError::Overflow)?;
        guide.last_updated = now;

        emit!(ReputationUpdated {
            guide: guide.authority,
            score,
            total_reviews: guide.total_reviews,
            total_score: guide.total_score,
            timestamp: now,
        });

        Ok(())
    }

    pub fn suspend_guide(ctx: Context<SetSuspension>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let guide = &mut ctx.accounts.guide_reputation;
        guide.is_suspended = true;
        guide.last_updated = now;

        emit!(GuideSuspended {
            guide: guide.authority,
            admin: ctx.accounts.admin.key(),
            timestamp: now,
        });

        Ok(())
    }

    pub fn reinstate_guide(ctx: Context<SetSuspension>) -> Result<()> {
        let now = Clock::get()?.unix_timestamp;
        let guide = &mut ctx.accounts.guide_reputation;
        guide.is_suspended = false;
        guide.last_updated = now;

        emit!(GuideReinstated {
            guide: guide.authority,
            admin: ctx.accounts.admin.key(),
            timestamp: now,
        });

        Ok(())
    }
}

fn score_to_weighted(score: u8) -> Result<u64> {
    require!((1..=5).contains(&score), ReputationError::InvalidScore);
    (score as u64).checked_mul(100).ok_or_else(|| error!(ReputationError::Overflow))
}

#[account]
pub struct GuideReputation {
    pub authority: Pubkey,
    pub admin: Pubkey,
    pub name: [u8; GUIDE_NAME_LEN],
    pub total_reviews: u32,
    pub total_score: u64,
    pub completed_treks: u32,
    pub active_since: i64,
    pub is_verified: bool,
    pub is_suspended: bool,
    pub last_updated: i64,
    pub bump: u8,
}

impl GuideReputation {
    pub const LEN: usize = 8 + 32 + 32 + GUIDE_NAME_LEN + 4 + 8 + 4 + 8 + 1 + 1 + 8 + 1;
}

#[derive(Accounts)]
pub struct InitializeGuide<'info> {
    #[account(
        init,
        payer = admin,
        space = GuideReputation::LEN,
        seeds = [b"guide", authority.key().as_ref()],
        bump
    )]
    pub guide_reputation: Account<'info, GuideReputation>,
    /// CHECK: Wallet owner represented by PDA seeds.
    pub authority: UncheckedAccount<'info>,
    #[account(mut)]
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UpdateReputation<'info> {
    #[account(
        mut,
        has_one = admin @ ReputationError::UnauthorizedAdmin,
        seeds = [b"guide", guide_reputation.authority.as_ref()],
        bump = guide_reputation.bump
    )]
    pub guide_reputation: Account<'info, GuideReputation>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
pub struct SetSuspension<'info> {
    #[account(
        mut,
        has_one = admin @ ReputationError::UnauthorizedAdmin,
        seeds = [b"guide", guide_reputation.authority.as_ref()],
        bump = guide_reputation.bump
    )]
    pub guide_reputation: Account<'info, GuideReputation>,
    pub admin: Signer<'info>,
}

#[event]
pub struct GuideRegistered {
    pub guide: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ReputationUpdated {
    pub guide: Pubkey,
    pub score: u8,
    pub total_reviews: u32,
    pub total_score: u64,
    pub timestamp: i64,
}

#[event]
pub struct GuideSuspended {
    pub guide: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct GuideReinstated {
    pub guide: Pubkey,
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[error_code]
pub enum ReputationError {
    #[msg("Caller is not the registered admin")]
    UnauthorizedAdmin,
    #[msg("Guide is suspended")]
    GuideSuspended,
    #[msg("Score must be between 1 and 5")]
    InvalidScore,
    #[msg("Arithmetic overflow")]
    Overflow,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn weighted_score_happy_path() {
        let result = score_to_weighted(5).expect("score should be valid");
        assert_eq!(result, 500);
    }

    #[test]
    fn weighted_score_invalid_low() {
        assert!(score_to_weighted(0).is_err());
    }
}
