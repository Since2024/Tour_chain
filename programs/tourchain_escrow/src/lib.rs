use anchor_lang::prelude::*;
use anchor_lang::system_program;

declare_id!("B1M6gHx7W2tKPWwEEuKaumyk2H8zdETZGoBCDt9yamrt");

#[program]
pub mod tourchain_escrow {
    use super::*;

    pub fn create_escrow(
        ctx: Context<CreateEscrow>,
        amount: u64,
        milestones: u8,
        created_at: i64,
    ) -> Result<()> {
        require!(milestones >= 1 && milestones <= 10, EscrowError::InvalidMilestones);

        let escrow_key = ctx.accounts.booking_escrow.key();
        let escrow = &mut ctx.accounts.booking_escrow;
        escrow.tourist = ctx.accounts.tourist.key();
        escrow.guide = ctx.accounts.guide.key();
        escrow.admin = ctx.accounts.admin.key();
        escrow.amount = amount;
        escrow.released = 0;
        escrow.milestones = milestones;
        escrow.milestones_completed = 0;
        escrow.status = BookingStatus::Funded;
        escrow.created_at = created_at;
        escrow.dispute_deadline = 0;
        escrow.bump = ctx.bumps.booking_escrow;

        system_program::transfer(
            CpiContext::new(
                ctx.accounts.system_program.key(),
                system_program::Transfer {
                    from: ctx.accounts.tourist.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                },
            ),
            amount,
        )?;

        emit!(EscrowCreated {
            escrow: escrow_key,
            tourist: escrow.tourist,
            guide: escrow.guide,
            amount,
            milestones,
        });
        Ok(())
    }

    pub fn activate(ctx: Context<GuideAction>) -> Result<()> {
        let escrow = &mut ctx.accounts.booking_escrow;
        require!(escrow.status == BookingStatus::Funded, EscrowError::InvalidStatus);
        escrow.status = BookingStatus::Active;
        emit!(EscrowActivated { escrow: ctx.accounts.booking_escrow.key() });
        Ok(())
    }

    pub fn release_milestone(ctx: Context<DualSigAction>) -> Result<()> {
        let escrow_key = ctx.accounts.booking_escrow.key();
        let vault_bump = ctx.bumps.vault;
        let escrow = &mut ctx.accounts.booking_escrow;
        require!(escrow.status == BookingStatus::Active, EscrowError::InvalidStatus);
        require!(
            escrow.milestones_completed < escrow.milestones,
            EscrowError::InvalidStatus
        );

        let per_ms = escrow
            .amount
            .checked_div(escrow.milestones as u64)
            .ok_or(EscrowError::Overflow)?;

        require!(ctx.accounts.vault.lamports() >= per_ms, EscrowError::InsufficientVault);

        let vault_seeds: &[&[u8]] = &[b"vault", escrow_key.as_ref(), &[vault_bump]];
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.guide.to_account_info(),
                },
                &[vault_seeds],
            ),
            per_ms,
        )?;

        escrow.released = escrow.released.checked_add(per_ms).ok_or(EscrowError::Overflow)?;
        escrow.milestones_completed = escrow
            .milestones_completed
            .checked_add(1)
            .ok_or(EscrowError::Overflow)?;

        emit!(MilestoneReleased {
            escrow: escrow_key,
            milestone: escrow.milestones_completed,
            amount: per_ms,
        });
        Ok(())
    }

    pub fn complete_booking(ctx: Context<DualSigAction>) -> Result<()> {
        let escrow_key = ctx.accounts.booking_escrow.key();
        let vault_bump = ctx.bumps.vault;
        let escrow = &mut ctx.accounts.booking_escrow;
        require!(escrow.status == BookingStatus::Active, EscrowError::InvalidStatus);

        let remaining = escrow.amount.checked_sub(escrow.released).ok_or(EscrowError::Overflow)?;
        require!(ctx.accounts.vault.lamports() >= remaining, EscrowError::InsufficientVault);

        if remaining > 0 {
            let vault_seeds: &[&[u8]] = &[b"vault", escrow_key.as_ref(), &[vault_bump]];
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.guide.to_account_info(),
                    },
                    &[vault_seeds],
                ),
                remaining,
            )?;
        }

        escrow.released = escrow.released.checked_add(remaining).ok_or(EscrowError::Overflow)?;
        escrow.status = BookingStatus::Completed;

        emit!(BookingCompleted { escrow: escrow_key });
        Ok(())
    }

    pub fn cancel_booking(ctx: Context<CancelBooking>) -> Result<()> {
        let escrow_key = ctx.accounts.booking_escrow.key();
        let vault_bump = ctx.bumps.vault;
        let escrow = &mut ctx.accounts.booking_escrow;
        require!(escrow.status == BookingStatus::Funded, EscrowError::InvalidStatus);

        let refund = ctx.accounts.vault.lamports();
        require!(refund >= escrow.amount, EscrowError::InsufficientVault);

        let vault_seeds: &[&[u8]] = &[b"vault", escrow_key.as_ref(), &[vault_bump]];
        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.key(),
                system_program::Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.tourist.to_account_info(),
                },
                &[vault_seeds],
            ),
            refund,
        )?;

        escrow.status = BookingStatus::Cancelled;
        emit!(BookingCancelled { escrow: escrow_key });
        Ok(())
    }

    pub fn open_dispute(ctx: Context<ParticipantAction>) -> Result<()> {
        let escrow = &mut ctx.accounts.booking_escrow;
        require!(escrow.status == BookingStatus::Active, EscrowError::InvalidStatus);
        escrow.status = BookingStatus::Disputed;
        emit!(DisputeOpened { escrow: ctx.accounts.booking_escrow.key() });
        Ok(())
    }

    pub fn resolve_dispute(ctx: Context<ResolveDispute>, tourist_refund_bps: u16) -> Result<()> {
        require!(tourist_refund_bps <= 10000, EscrowError::DisputeBpsOutOfRange);
        let escrow_key = ctx.accounts.booking_escrow.key();
        let vault_bump = ctx.bumps.vault;
        let escrow = &mut ctx.accounts.booking_escrow;
        require!(escrow.status == BookingStatus::Disputed, EscrowError::InvalidStatus);

        let remaining = escrow.amount.checked_sub(escrow.released).ok_or(EscrowError::Overflow)?;
        let to_tourist = remaining
            .checked_mul(tourist_refund_bps as u64)
            .ok_or(EscrowError::Overflow)?
            .checked_div(10000)
            .ok_or(EscrowError::Overflow)?;
        let to_guide = remaining.checked_sub(to_tourist).ok_or(EscrowError::Overflow)?;

        require!(ctx.accounts.vault.lamports() >= remaining, EscrowError::InsufficientVault);

        let vault_seeds: &[&[u8]] = &[b"vault", escrow_key.as_ref(), &[vault_bump]];

        if to_tourist > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.tourist.to_account_info(),
                    },
                    &[vault_seeds],
                ),
                to_tourist,
            )?;
        }
        if to_guide > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.key(),
                    system_program::Transfer {
                        from: ctx.accounts.vault.to_account_info(),
                        to: ctx.accounts.guide.to_account_info(),
                    },
                    &[vault_seeds],
                ),
                to_guide,
            )?;
        }

        escrow.released = escrow.amount;
        escrow.status = BookingStatus::Refunded;

        emit!(DisputeResolved {
            escrow: escrow_key,
            to_tourist,
            to_guide,
        });
        Ok(())
    }
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, PartialEq, Eq)]
pub enum BookingStatus {
    Funded,
    Active,
    Completed,
    Disputed,
    Refunded,
    Cancelled,
}

#[account]
pub struct BookingEscrow {
    pub tourist: Pubkey,
    pub guide: Pubkey,
    pub admin: Pubkey,
    pub amount: u64,
    pub released: u64,
    pub milestones: u8,
    pub milestones_completed: u8,
    pub status: BookingStatus,
    pub created_at: i64,
    pub dispute_deadline: i64,
    pub bump: u8,
}

#[derive(Accounts)]
#[instruction(amount: u64, milestones: u8, created_at: i64)]
pub struct CreateEscrow<'info> {
    #[account(
        init,
        payer = tourist,
        space = 8 + 32 + 32 + 32 + 8 + 8 + 1 + 1 + 1 + 8 + 8 + 1,
        seeds = [b"escrow", tourist.key().as_ref(), guide.key().as_ref(), &created_at.to_le_bytes()],
        bump
    )]
    pub booking_escrow: Account<'info, BookingEscrow>,
    /// CHECK: vault PDA seeded from escrow key — holds native SOL
    #[account(
        mut,
        seeds = [b"vault", booking_escrow.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    #[account(mut)]
    pub tourist: Signer<'info>,
    /// CHECK: guide wallet public key
    pub guide: AccountInfo<'info>,
    /// CHECK: admin public key stored on escrow
    pub admin: AccountInfo<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct GuideAction<'info> {
    #[account(
        mut,
        seeds = [b"escrow", booking_escrow.tourist.as_ref(), booking_escrow.guide.as_ref(), &booking_escrow.created_at.to_le_bytes()],
        bump = booking_escrow.bump,
        constraint = booking_escrow.guide == guide.key() @ EscrowError::InvalidStatus
    )]
    pub booking_escrow: Account<'info, BookingEscrow>,
    pub guide: Signer<'info>,
}

#[derive(Accounts)]
pub struct DualSigAction<'info> {
    #[account(
        mut,
        seeds = [b"escrow", booking_escrow.tourist.as_ref(), booking_escrow.guide.as_ref(), &booking_escrow.created_at.to_le_bytes()],
        bump = booking_escrow.bump,
        constraint = booking_escrow.tourist == tourist.key() @ EscrowError::InvalidStatus,
        constraint = booking_escrow.guide == guide.key() @ EscrowError::InvalidStatus
    )]
    pub booking_escrow: Account<'info, BookingEscrow>,
    /// CHECK: vault PDA — SOL will be transferred from here via CPI
    #[account(
        mut,
        seeds = [b"vault", booking_escrow.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    #[account(mut)]
    pub tourist: Signer<'info>,
    #[account(mut)]
    pub guide: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CancelBooking<'info> {
    #[account(
        mut,
        seeds = [b"escrow", booking_escrow.tourist.as_ref(), booking_escrow.guide.as_ref(), &booking_escrow.created_at.to_le_bytes()],
        bump = booking_escrow.bump,
        constraint = booking_escrow.tourist == tourist.key() @ EscrowError::InvalidStatus
    )]
    pub booking_escrow: Account<'info, BookingEscrow>,
    /// CHECK: vault PDA — refund SOL source
    #[account(
        mut,
        seeds = [b"vault", booking_escrow.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    #[account(mut)]
    pub tourist: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ParticipantAction<'info> {
    #[account(
        mut,
        seeds = [b"escrow", booking_escrow.tourist.as_ref(), booking_escrow.guide.as_ref(), &booking_escrow.created_at.to_le_bytes()],
        bump = booking_escrow.bump
    )]
    pub booking_escrow: Account<'info, BookingEscrow>,
    pub caller: Signer<'info>,
}

#[derive(Accounts)]
pub struct ResolveDispute<'info> {
    #[account(
        mut,
        seeds = [b"escrow", booking_escrow.tourist.as_ref(), booking_escrow.guide.as_ref(), &booking_escrow.created_at.to_le_bytes()],
        bump = booking_escrow.bump,
        constraint = booking_escrow.admin == admin.key() @ EscrowError::UnauthorizedAdmin
    )]
    pub booking_escrow: Account<'info, BookingEscrow>,
    /// CHECK: vault PDA — dispute resolution source
    #[account(
        mut,
        seeds = [b"vault", booking_escrow.key().as_ref()],
        bump
    )]
    pub vault: AccountInfo<'info>,
    /// CHECK: tourist receives refund portion
    #[account(mut, constraint = booking_escrow.tourist == tourist.key())]
    pub tourist: AccountInfo<'info>,
    /// CHECK: guide receives remaining portion
    #[account(mut, constraint = booking_escrow.guide == guide.key())]
    pub guide: AccountInfo<'info>,
    pub admin: Signer<'info>,
    pub system_program: Program<'info, System>,
}

#[event]
pub struct EscrowCreated {
    pub escrow: Pubkey,
    pub tourist: Pubkey,
    pub guide: Pubkey,
    pub amount: u64,
    pub milestones: u8,
}

#[event]
pub struct EscrowActivated {
    pub escrow: Pubkey,
}

#[event]
pub struct MilestoneReleased {
    pub escrow: Pubkey,
    pub milestone: u8,
    pub amount: u64,
}

#[event]
pub struct BookingCompleted {
    pub escrow: Pubkey,
}

#[event]
pub struct BookingCancelled {
    pub escrow: Pubkey,
}

#[event]
pub struct DisputeOpened {
    pub escrow: Pubkey,
}

#[event]
pub struct DisputeResolved {
    pub escrow: Pubkey,
    pub to_tourist: u64,
    pub to_guide: u64,
}

#[error_code]
pub enum EscrowError {
    #[msg("Invalid booking status for this operation")]
    InvalidStatus,
    #[msg("Milestones must be between 1 and 10")]
    InvalidMilestones,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Caller is not the admin")]
    UnauthorizedAdmin,
    #[msg("Refund bps must be <= 10000")]
    DisputeBpsOutOfRange,
    #[msg("Vault has insufficient balance")]
    InsufficientVault,
}
