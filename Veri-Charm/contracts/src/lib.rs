//! Veri-Charm Protocol: Anti-counterfeiting solution using Charms SDK
//! Main contract handling Charm token lifecycle

#![no_std]

extern crate alloc;
use alloc::{vec::Vec, string::String, format};
use charms_sdk::prelude::*;
use serde::{Deserialize, Serialize};

mod types;
mod charm;
mod verification;
mod errors;

use types::*;
use charm::CharmToken;
use verification::VerificationCircuit;
use errors::VeriCharmError;

/// Main contract state
#[derive(Serialize, Deserialize, Default)]
pub struct VeriCharmContract {
    /// Mapping of product IDs to their Charm tokens
    pub products: Map<ProductId, CharmToken>,
    /// Manufacturer registry
    pub manufacturers: Map<Address, Manufacturer>,
    /// Retailer registry  
    pub retailers: Map<Address, Retailer>,
    /// Cross-chain beam records
    pub beam_records: Map<BeamId, CrossChainBeam>,
    /// Verification circuit parameters
    pub circuit_params: VerificationCircuit,
    /// Total tokens minted counter
    pub total_minted: u64,
}

/// Contract implementation
impl Contract for VeriCharmContract {
    type Error = VeriCharmError;

    /// Initialize contract with manufacturer
    fn init(&mut self, ctx: &Context) -> Result<(), Self::Error> {
        // Ensure only authorized manufacturers can initialize
        let manufacturer = Manufacturer {
            address: ctx.sender.clone(),
            name: String::from("Initial Manufacturer"),
            verified: true,
            products_minted: 0,
        };
        
        self.manufacturers.insert(ctx.sender.clone(), manufacturer);
        
        // Initialize ZK circuit parameters
        self.circuit_params = VerificationCircuit::default();
        
        log!("Veri-Charm contract initialized by {}", ctx.sender);
        Ok(())
    }

    /// Mint a new Charm token for a physical product
    #[payable]
    fn mint_charm(
        &mut self, 
        ctx: &Context,
        product_data: ProductData,
        metadata: TokenMetadata,
    ) -> Result<CharmToken, Self::Error> {
        // Verify caller is registered manufacturer
        let manufacturer = self.manufacturers.get(&ctx.sender)
            .ok_or(VeriCharmError::UnauthorizedManufacturer)?;
        
        if !manufacturer.verified {
            return Err(VeriCharmError::ManufacturerNotVerified);
        }

        // Generate unique product ID
        self.total_minted += 1;
        let product_id = format!("{}-{:06}", manufacturer.address, self.total_minted);
        
        // Create Charm token
        let charm_token = CharmToken {
            id: product_id.clone(),
            manufacturer: ctx.sender.clone(),
            product_data,
            metadata,
            current_owner: ctx.sender.clone(),
            mint_time: ctx.block_height,
            warranty_period: 1209600, // 14 days in seconds
            burned: false,
            transfer_history: Vec::new(),
            zk_proof: None,
        };

        // Store token
        self.products.insert(product_id, charm_token.clone());
        
        // Update manufacturer stats
        let mut updated_manufacturer = manufacturer.clone();
        updated_manufacturer.products_minted += 1;
        self.manufacturers.insert(ctx.sender.clone(), updated_manufacturer);
        
        log!("Charm token minted: {} for product: {}", 
             product_id, charm_token.product_data.name);
        
        Ok(charm_token)
    }

    /// Transfer Charm token to new owner (retailer or consumer)
    fn transfer_charm(
        &mut self,
        ctx: &Context,
        product_id: ProductId,
        new_owner: Address,
        zk_proof: Option<ZkProof>,
    ) -> Result<(), Self::Error> {
        let mut charm_token = self.products.get(&product_id)
            .ok_or(VeriCharmError::ProductNotFound)?;
        
        // Verify current owner is the sender
        if charm_token.current_owner != ctx.sender {
            return Err(VeriCharmError::NotTokenOwner);
        }
        
        // Check if token is burned
        if charm_token.burned {
            return Err(VeriCharmError::TokenBurned);
        }
        
        // Verify warranty period hasn't expired if transferring from consumer
        let current_time = ctx.block_height;
        if charm_token.is_in_warranty(current_time) {
            // Additional checks for warranty period transfers
        }
        
        // Update token ownership
        let transfer_record = TransferRecord {
            from: charm_token.current_owner.clone(),
            to: new_owner.clone(),
            timestamp: current_time,
            tx_hash: ctx.tx_hash.clone(),
        };
        
        charm_token.transfer_history.push(transfer_record);
        charm_token.current_owner = new_owner.clone();
        charm_token.zk_proof = zk_proof;
        
        self.products.insert(product_id, charm_token);
        
        log!("Charm token {} transferred to {}", product_id, new_owner);
        Ok(())
    }

    /// Burn Charm token for rewards/raffle entry
    fn burn_charm(
        &mut self,
        ctx: &Context,
        product_id: ProductId,
        burn_reason: BurnReason,
    ) -> Result<BurnReceipt, Self::Error> {
        let mut charm_token = self.products.get(&product_id)
            .ok_or(VeriCharmError::ProductNotFound)?;
        
        // Verify ownership
        if charm_token.current_owner != ctx.sender {
            return Err(VeriCharmError::NotTokenOwner);
        }
        
        // Check warranty period has expired
        if charm_token.is_in_warranty(ctx.block_height) {
            return Err(VeriCharmError::WarrantyActive);
        }
        
        // Mark as burned
        charm_token.burned = true;
        self.products.insert(product_id.clone(), charm_token);
        
        // Generate raffle entry if applicable
        let raffle_entry = match burn_reason {
            BurnReason::RaffleEntry => Some(RaffleEntry {
                participant: ctx.sender.clone(),
                product_id: product_id.clone(),
                burn_time: ctx.block_height,
                entry_id: hash(&[&ctx.sender, &product_id, &ctx.block_height.to_be_bytes()]),
            }),
            _ => None,
        };
        
        let receipt = BurnReceipt {
            product_id,
            burner: ctx.sender.clone(),
            burn_time: ctx.block_height,
            raffle_entry,
        };
        
        log!("Charm token burned for raffle entry by {}", ctx.sender);
        Ok(receipt)
    }

    /// Verify product authenticity using ZK proofs
    fn verify_product(
        &self,
        ctx: &Context,
        product_id: ProductId,
        verification_data: VerificationData,
    ) -> Result<VerificationResult, Self::Error> {
        let charm_token = self.products.get(&product_id)
            .ok_or(VeriCharmError::ProductNotFound)?;
        
        // If ZK proof provided, verify it
        if let Some(zk_proof) = &verification_data.zk_proof {
            let is_valid = self.circuit_params.verify_proof(
                zk_proof,
                &verification_data.public_inputs,
            )?;
            
            if !is_valid {
                return Err(VeriCharmError::InvalidProof);
            }
        }
        
        // Verify manufacturer signature
        let manufacturer = self.manufacturers.get(&charm_token.manufacturer)
            .ok_or(VeriCharmError::ManufacturerNotFound)?;
        
        if !manufacturer.verified {
            return Err(VeriCharmError::ManufacturerNotVerified);
        }
        
        // Check supply chain integrity
        let is_supply_chain_valid = charm_token.verify_supply_chain();
        
        Ok(VerificationResult {
            product_id,
            is_authentic: is_supply_chain_valid,
            manufacturer: charm_token.manufacturer.clone(),
            current_owner: charm_token.current_owner.clone(),
            warranty_valid: charm_token.is_in_warranty(ctx.block_height),
            verification_time: ctx.block_height,
        })
    }

    /// Beam Charm token across UTXO chains
    fn cross_chain_beam(
        &mut self,
        ctx: &Context,
        product_id: ProductId,
        target_chain: ChainId,
        beam_data: BeamData,
    ) -> Result<BeamReceipt, Self::Error> {
        // Verify token exists and is owned by sender
        let charm_token = self.products.get(&product_id)
            .ok_or(VeriCharmError::ProductNotFound)?;
        
        if charm_token.current_owner != ctx.sender {
            return Err(VeriCharmError::NotTokenOwner);
        }
        
        // Create beam record
        let beam_id = hash(&[
            &product_id,
            &target_chain,
            &ctx.block_height.to_be_bytes(),
        ]);
        
        let beam_record = CrossChainBeam {
            beam_id: beam_id.clone(),
            product_id: product_id.clone(),
            source_chain: ctx.chain_id.clone(),
            target_chain: target_chain.clone(),
            sender: ctx.sender.clone(),
            beam_time: ctx.block_height,
            status: BeamStatus::Initiated,
            lock_tx_hash: None,
            unlock_tx_hash: None,
        };
        
        self.beam_records.insert(beam_id.clone(), beam_record);
        
        // Generate lock transaction for source chain
        let lock_script = generate_lock_script(&beam_id, &target_chain);
        
        log!("Cross-chain beam initiated for {} to {}", product_id, target_chain);
        
        Ok(BeamReceipt {
            beam_id,
            lock_script,
            timeout_height: ctx.block_height + 100, // 100 blocks to complete
        })
    }
}

// Entry point for WASM compilation
#[no_mangle]
pub extern "C" fn _start() {
    contract::run(VeriCharmContract::default());
}
