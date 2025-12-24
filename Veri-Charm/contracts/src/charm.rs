//! Charm token implementation with embedded business logic

use super::*;

/// Charm Token representing a physical product
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct CharmToken {
    /// Unique identifier
    pub id: ProductId,
    /// Manufacturer address
    pub manufacturer: Address,
    /// Product data
    pub product_data: ProductData,
    /// Token metadata
    pub metadata: TokenMetadata,
    /// Current owner
    pub current_owner: Address,
    /// Block height when minted
    pub mint_time: u64,
    /// Warranty period in seconds
    pub warranty_period: u64,
    /// Whether token has been burned
    pub burned: bool,
    /// Transfer history
    pub transfer_history: Vec<TransferRecord>,
    /// Optional ZK proof for privacy
    pub zk_proof: Option<ZkProof>,
}

impl CharmToken {
    /// Verify if token is still within warranty period
    pub fn is_in_warranty(&self, current_time: u64) -> bool {
        current_time < self.mint_time + self.warranty_period
    }
    
    /// Verify supply chain integrity
    pub fn verify_supply_chain(&self) -> bool {
        // Must have at least manufacturer mint and one transfer
        if self.transfer_history.len() < 2 {
            return false;
        }
        
        // First transfer must be from manufacturer
        if self.transfer_history[0].from != self.manufacturer {
            return false;
        }
        
        // Check for continuous ownership chain
        let mut current_owner = self.manufacturer.clone();
        
        for transfer in &self.transfer_history {
            if transfer.from != current_owner {
                return false;
            }
            current_owner = transfer.to.clone();
        }
        
        true
    }
    
    /// Generate verification data for ZK proof
    pub fn generate_verification_data(&self) -> VerificationData {
        VerificationData {
            product_id: self.id.clone(),
            manufacturer: self.manufacturer.clone(),
            current_owner: self.current_owner.clone(),
            mint_time: self.mint_time,
            warranty_valid: self.is_in_warranty(get_current_block_height()),
            // Additional verification inputs
            verification_hash: self.calculate_verification_hash(),
        }
    }
    
    /// Calculate verification hash
    fn calculate_verification_hash(&self) -> Hash {
        let mut hasher = Sha256::new();
        hasher.update(&self.id);
        hasher.update(&self.manufacturer);
        hasher.update(&self.mint_time.to_be_bytes());
        hasher.update(&self.current_owner);
        hasher.finalize().into()
    }
}

/// Transfer record for provenance tracking
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct TransferRecord {
    pub from: Address,
    pub to: Address,
    pub timestamp: u64,
    pub tx_hash: Hash,
}

/// Burn reasons
#[derive(Serialize, Deserialize, Clone, Debug)]
pub enum BurnReason {
    RaffleEntry,
    ProductReturn,
    WarrantyClaim,
    Voluntary,
}

/// Burn receipt
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BurnReceipt {
    pub product_id: ProductId,
    pub burner: Address,
    pub burn_time: u64,
    pub raffle_entry: Option<RaffleEntry>,
}

/// Raffle entry for burned tokens
#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct RaffleEntry {
    pub participant: Address,
    pub product_id: ProductId,
    pub burn_time: u64,
    pub entry_id: Hash,
}
