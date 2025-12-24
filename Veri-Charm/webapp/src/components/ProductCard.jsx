// ProductCard.jsx - UI component for displaying products
import React, { useState } from 'react';
import { walletService } from '../services/wallet';
import { charmsService } from '../services/charms';
import { scrollsAPI } from '../services/scrolls-api';

const ProductCard = ({ product, onPurchaseComplete }) => {
    const [isPurchasing, setIsPurchasing] = useState(false);
    const [verificationStatus, setVerificationStatus] = useState(null);
    const [error, setError] = useState(null);
    
    const handlePurchase = async () => {
        if (!walletService.isConnected()) {
            setError('Please connect your wallet first');
            return;
        }
        
        setIsPurchasing(true);
        setError(null);
        
        try {
            // Step 1: Get retailer address from product
            const retailerAddress = product.retailerAddress;
            
            // Step 2: Verify retailer is trusted
            const verification = await scrollsAPI.verifyRetailer(retailerAddress);
            
            if (!verification.is_trusted) {
                throw new Error('Retailer not in trusted directory');
            }
            
            // Step 3: Create payment transaction
            const walletInfo = walletService.getWalletInfo();
            const paymentTx = await charmsService.createPaymentTransaction({
                from: walletInfo.address,
                to: retailerAddress,
                amount: product.price,
                productId: product.id,
                chain: walletInfo.network
            });
            
            // Step 4: Sign transaction with wallet
            const signedTx = await walletService.signTransaction(paymentTx);
            
            // Step 5: Submit transaction
            const txResult = await scrollsAPI.submitTransaction(signedTx, walletInfo.network);
            
            // Step 6: Wait for token transfer
            const tokenTransfer = await charmsService.waitForTokenTransfer({
                productId: product.id,
                retailer: retailerAddress,
                customer: walletInfo.address,
                txHash: txResult.transaction_hash
            });
            
            // Step 7: Verify token receipt
            const token = await scrollsAPI.getCharmToken(tokenTransfer.tokenId);
            setVerificationStatus({
                status: 'success',
                tokenId: token.id,
                transactionHash: txResult.transaction_hash
            });
            
            // Notify parent component
            if (onPurchaseComplete) {
                onPurchaseComplete(token);
            }
            
        } catch (err) {
            setError(err.message || 'Purchase failed');
            console.error('Purchase error:', err);
        } finally {
            setIsPurchasing(false);
        }
    };
    
    const handleVerify = async () => {
        try {
            setVerificationStatus({ status: 'verifying' });
            
            const verification = await scrollsAPI.verifyProduct(product.id, {
                verification_method: 'quick_check'
            });
            
            setVerificationStatus({
                status: 'verified',
                isAuthentic: verification.is_authentic,
                details: verification
            });
        } catch (err) {
            setError('Verification failed: ' + err.message);
            setVerificationStatus(null);
        }
    };
    
    const formatPrice = (price) => {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2
        }).format(price);
    };
    
    const getVerificationBadge = () => {
        if (!verificationStatus) return null;
        
        switch (verificationStatus.status) {
            case 'verifying':
                return (
                    <span className="badge badge-warning">
                        <i className="fas fa-sync fa-spin"></i> Verifying...
                    </span>
                );
            case 'verified':
                return verificationStatus.isAuthentic ? (
                    <span className="badge badge-success">
                        <i className="fas fa-check-circle"></i> Authentic
                    </span>
                ) : (
                    <span className="badge badge-danger">
                        <i className="fas fa-exclamation-triangle"></i> Suspect
                    </span>
                );
            case 'success':
                return (
                    <span className="badge badge-success">
                        <i className="fas fa-gem"></i> Token Received
                    </span>
                );
            default:
                return null;
        }
    };
    
    const getProductIcon = (category) => {
        switch (category.toLowerCase()) {
            case 'luxury':
                return 'fas fa-gem';
            case 'pharmaceutical':
                return 'fas fa-prescription-bottle';
            case 'organic':
                return 'fas fa-seedling';
            case 'renewable':
                return 'fas fa-solar-panel';
            default:
                return 'fas fa-box';
        }
    };
    
    return (
        <div className="product-card">
            <div className="product-card-header">
                <div className="product-category">
                    <i className={getProductIcon(product.category)}></i>
                    {product.category}
                </div>
                {getVerificationBadge()}
            </div>
            
            <div className="product-image">
                {/* Product image would go here */}
                <div className="image-placeholder">
                    <i className="fas fa-cube"></i>
                </div>
            </div>
            
            <div className="product-info">
                <h3 className="product-name">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                
                <div className="product-retailer">
                    <i className="fas fa-store"></i>
                    <span>{product.retailer}</span>
                    {product.isCertified && (
                        <span className="certification-badge">
                            <i className="fas fa-certificate"></i> Certified
                        </span>
                    )}
                </div>
                
                {product.carbonFootprint && (
                    <div className="carbon-info">
                        <i className="fas fa-leaf"></i>
                        <span>Carbon: {product.carbonFootprint}</span>
                    </div>
                )}
                
                <div className="product-price">
                    <span className="price-amount">{formatPrice(product.price)}</span>
                    <span className="price-currency">USD</span>
                </div>
                
                <div className="product-actions">
                    <button
                        className="btn btn-verify"
                        onClick={handleVerify}
                        disabled={isPurchasing}
                    >
                        <i className="fas fa-shield-check"></i>
                        Verify Authenticity
                    </button>
                    
                    <button
                        className="btn btn-purchase"
                        onClick={handlePurchase}
                        disabled={isPurchasing || !walletService.isConnected()}
                    >
                        {isPurchasing ? (
                            <>
                                <i className="fas fa-spinner fa-spin"></i>
                                Processing...
                            </>
                        ) : (
                            <>
                                <i className="fas fa-shopping-cart"></i>
                                Buy with Verification
                            </>
                        )}
                    </button>
                </div>
                
                {error && (
                    <div className="error-message">
                        <i className="fas fa-exclamation-circle"></i>
                        {error}
                    </div>
                )}
                
                {verificationStatus?.status === 'verified' && (
                    <div className="verification-details">
                        <h4>Verification Results:</h4>
                        <ul>
                            <li>
                                <i className="fas fa-factory"></i>
                                Manufacturer: {verificationStatus.details.manufacturer}
                            </li>
                            <li>
                                <i className="fas fa-check-circle"></i>
                                Supply Chain: {verificationStatus.details.supply_chain_valid ? 'Valid' : 'Invalid'}
                            </li>
                            <li>
                                <i className="fas fa-calendar-check"></i>
                                Warranty: {verificationStatus.details.warranty_valid ? 'Active' : 'Expired'}
                            </li>
                        </ul>
                    </div>
                )}
                
                {verificationStatus?.status === 'success' && (
                    <div className="success-message">
                        <i className="fas fa-gift"></i>
                        <div>
                            <strong>Purchase Complete!</strong>
                            <p>Token ID: {verificationStatus.tokenId}</p>
                            <a 
                                href={`https://explorer.bitcoinos.org/tx/${verificationStatus.transactionHash}`}
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                View Transaction
                            </a>
                        </div>
                    </div>
                )}
            </div>
            
            <style jsx>{`
                .product-card {
                    background: white;
                    border-radius: 16px;
                    box-shadow: 0 4px 20px rgba(0,0,0,0.08);
                    overflow: hidden;
                    transition: all 0.3s ease;
                    border: 1px solid #e2e8f0;
                }
                
                .product-card:hover {
                    transform: translateY(-4px);
                    box-shadow: 0 8px 30px rgba(0,0,0,0.12);
                }
                
                .product-card-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 16px;
                    background: #f7fafc;
                    border-bottom: 1px solid #e2e8f0;
                }
                
                .product-category {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #4a5568;
                    font-weight: 500;
                    font-size: 14px;
                }
                
                .badge {
                    padding: 4px 12px;
                    border-radius: 20px;
                    font-size: 12px;
                    font-weight: 600;
                }
                
                .badge-warning {
                    background: #fffaf0;
                    color: #d69e2e;
                    border: 1px solid #fbd38d;
                }
                
                .badge-success {
                    background: #f0fff4;
                    color: #38a169;
                    border: 1px solid #9ae6b4;
                }
                
                .badge-danger {
                    background: #fff5f5;
                    color: #e53e3e;
                    border: 1px solid #fc8181;
                }
                
                .product-image {
                    height: 200px;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: white;
                    font-size: 48px;
                }
                
                .product-info {
                    padding: 20px;
                }
                
                .product-name {
                    font-size: 20px;
                    font-weight: 600;
                    color: #2d3748;
                    margin-bottom: 8px;
                }
                
                .product-description {
                    color: #718096;
                    font-size: 14px;
                    line-height: 1.5;
                    margin-bottom: 16px;
                }
                
                .product-retailer {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #4a5568;
                    font-size: 14px;
                    margin-bottom: 12px;
                }
                
                .certification-badge {
                    background: #e6fffa;
                    color: #234e52;
                    padding: 2px 8px;
                    border-radius: 12px;
                    font-size: 12px;
                }
                
                .carbon-info {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #38a169;
                    font-size: 14px;
                    margin-bottom: 16px;
                }
                
                .product-price {
                    display: flex;
                    align-items: baseline;
                    gap: 4px;
                    margin-bottom: 20px;
                }
                
                .price-amount {
                    font-size: 24px;
                    font-weight: 700;
                    color: #2d3748;
                }
                
                .price-currency {
                    color: #718096;
                    font-size: 16px;
                }
                
                .product-actions {
                    display: flex;
                    gap: 12px;
                    margin-bottom: 16px;
                }
                
                .btn {
                    flex: 1;
                    padding: 12px 16px;
                    border-radius: 12px;
                    border: none;
                    font-weight: 600;
                    font-size: 14px;
                    cursor: pointer;
                    transition: all 0.2s ease;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    gap: 8px;
                }
                
                .btn:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }
                
                .btn-verify {
                    background: #edf2f7;
                    color: #4a5568;
                }
                
                .btn-verify:hover:not(:disabled) {
                    background: #e2e8f0;
                }
                
                .btn-purchase {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }
                
                .btn-purchase:hover:not(:disabled) {
                    transform: translateY(-2px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }
                
                .error-message {
                    background: #fff5f5;
                    color: #c53030;
                    padding: 12px;
                    border-radius: 8px;
                    font-size: 14px;
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    margin-top: 12px;
                }
                
                .verification-details {
                    background: #f0fff4;
                    border: 1px solid #9ae6b4;
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 16px;
                }
                
                .verification-details h4 {
                    color: #276749;
                    margin-bottom: 12px;
                    font-size: 16px;
                }
                
                .verification-details ul {
                    list-style: none;
                    padding: 0;
                    margin: 0;
                }
                
                .verification-details li {
                    display: flex;
                    align-items: center;
                    gap: 8px;
                    color: #2d3748;
                    font-size: 14px;
                    margin-bottom: 8px;
                }
                
                .success-message {
                    background: #f0fff4;
                    border: 1px solid #9ae6b4;
                    border-radius: 8px;
                    padding: 16px;
                    margin-top: 16px;
                    display: flex;
                    align-items: center;
                    gap: 12px;
                }
                
                .success-message i {
                    color: #38a169;
                    font-size: 24px;
                }
                
                .success-message strong {
                    color: #276749;
                    display: block;
                    margin-bottom: 4px;
                }
                
                .success-message p {
                    color: #4a5568;
                    font-size: 14px;
                    margin-bottom: 8px;
                }
                
                .success-message a {
                    color: #3182ce;
                    text-decoration: none;
                    font-size: 14px;
                }
                
                .success-message a:hover {
                    text-decoration: underline;
                }
            `}</style>
        </div>
    );
};

export default ProductCard;
