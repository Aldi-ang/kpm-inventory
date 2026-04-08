import { doc, collection, serverTimestamp, runTransaction, addDoc } from 'firebase/firestore';
import { getCurrentDate } from '../utils/helpers';

export default function useTransactionEngine({
    db, appId, userId, userRole, agentProfileId, adminSalesMode,
    logAudit, triggerCapy, setCart, customers
}) {

    // --- CORE TRANSACTION ENGINE ---
    const processTransaction = async (e, manualData = null) => { 
        if (e) e.preventDefault(); 
        
        const customerName = manualData ? manualData.customerName : new FormData(e.target).get('customerName')?.trim(); 
        const paymentType = manualData ? manualData.paymentType : new FormData(e.target).get('paymentType'); 
        const activeCart = manualData ? manualData.cart : []; // Cart passed from hook config or manual
        const newStoreData = manualData ? manualData.newStoreData : null; 
        const proofPayload = manualData ? manualData.proofPayload : null; 
        const totalRevenue = activeCart.reduce((acc, item) => acc + (item.calculatedPrice * item.qty), 0); 
        
        if(!customerName) { alert("Customer Name is required!"); return; } 

        let finalAgentName = 'Admin'; // Default to admin, overwritten if agent is found

        try { 
            await runTransaction(db, async (firestoreTrans) => { 
                const updatesToPerform = [];
                const transactionItems = []; 
                let totalProfit = 0; 

                let currentAgentProfileId = agentProfileId;
                if (userRole === 'ADMIN' && adminSalesMode === 'VEHICLE') currentAgentProfileId = 'ADMIN_VEHICLE';
                else if (userRole === 'ADMIN') currentAgentProfileId = null;

                for (const item of activeCart) { 
                    const prodRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId); 
                    const prodDoc = await firestoreTrans.get(prodRef); 
                    
                    if(!prodDoc.exists()) throw `Product ${item.name} not found`; 
                    const prodData = prodDoc.data(); 
                    
                    let mult = 1; 
                    if (item.unit === 'Slop') mult = prodData.packsPerSlop || 10; 
                    if (item.unit === 'Bal') mult = (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); 
                    if (item.unit === 'Karton') mult = (prodData.balsPerCarton || 4) * (prodData.slopsPerBal || 20) * (prodData.packsPerSlop || 10); 
                    
                    const qtyToDeduct = item.qty * mult; 
                    
                    if (!currentAgentProfileId && !proofPayload?.isRetur) {
                        if(prodData.stock < qtyToDeduct) throw `Not enough stock in Vault for ${item.name}`;
                        updatesToPerform.push({ ref: prodRef, newStock: prodData.stock - qtyToDeduct });
                    }

                    if (proofPayload?.isRetur) {
                        updatesToPerform.push({ ref: prodRef, newStock: (prodData.badStock || 0) + qtyToDeduct, isReturUpdate: true });
                    }
                    
                    const distributorPrice = prodData.priceDistributor || 0; 
                    const itemProfit = (item.calculatedPrice * item.qty) - (distributorPrice * qtyToDeduct); 
                    
                    totalProfit += itemProfit;
                    transactionItems.push({ ...item, distributorPriceSnapshot: distributorPrice, profitSnapshot: itemProfit, prodData }); 
                } 

                let agentDoc = null;
                let agentRef = null;
                
                if (currentAgentProfileId) {
                    agentRef = doc(db, `artifacts/${appId}/users/${userId}/motorists`, currentAgentProfileId);
                    agentDoc = await firestoreTrans.get(agentRef);
                }

                for (const update of updatesToPerform) {
                    if (update.isReturUpdate) {
                        firestoreTrans.update(update.ref, { badStock: update.newStock });
                    } else {
                        firestoreTrans.update(update.ref, { stock: update.newStock });
                    }
                }
                
                if (agentDoc && agentDoc.exists()) {
                    let currentCanvas = agentDoc.data().activeCanvas || [];
                    let updatedCanvas = currentCanvas.map(c => {
                        const soldItem = transactionItems.find(cartItem => cartItem.productId === c.productId);
                        if (soldItem) {
                            const pData = soldItem.prodData || {};
                            let mSold = soldItem.unit === 'Slop' ? (pData.packsPerSlop || 10) : soldItem.unit === 'Bal' ? ((pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : soldItem.unit === 'Karton' ? ((pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : 1;
                            let mCanvas = c.unit === 'Slop' ? (pData.packsPerSlop || 10) : c.unit === 'Bal' ? ((pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : c.unit === 'Karton' ? ((pData.balsPerCarton || 4) * (pData.slopsPerBal || 20) * (pData.packsPerSlop || 10)) : 1;
                            
                            const soldBks = soldItem.qty * mSold;
                            const currentCanvasBks = (c.qty * mCanvas) - soldBks;
                            
                            if (proofPayload?.isRetur) return c;
                            if (currentCanvasBks < 0) throw `Vehicle doesn't have enough ${soldItem.name} left!`;

                            return { ...c, qty: currentCanvasBks / mCanvas }; 
                        }
                        return c;
                    });
                    firestoreTrans.update(agentRef, { activeCanvas: updatedCanvas.filter(c => c.qty > 0) });
                }

                const finalTransItems = transactionItems.map(i => {
                    const copy = {...i};
                    delete copy.prodData;
                    return copy;
                });

                if (userRole === 'ADMIN') {
                    finalAgentName = "Admin"; 
                } else if (agentDoc && agentDoc.exists() && agentDoc.data().name) {
                    finalAgentName = agentDoc.data().name; 
                }

                const transRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`)); 
                firestoreTrans.set(transRef, { 
                    date: getCurrentDate(), 
                    customerName, 
                    paymentType, 
                    items: finalTransItems, 
                    total: totalRevenue, 
                    totalProfit: totalProfit, 
                    type: 'SALE', 
                    timestamp: serverTimestamp(),
                    agentId: currentAgentProfileId || 'ADMIN',
                    agentName: finalAgentName,
                    deliveryProof: proofPayload ? {
                        photo: proofPayload.photoData,
                        latitude: proofPayload.latitude,
                        longitude: proofPayload.longitude,
                        capturedAt: proofPayload.timestamp
                    } : null
                }); 

                if (newStoreData) {
                    const custRef = doc(collection(db, `artifacts/${appId}/users/${userId}/customers`));
                    if (newStoreData.isNooRegistration) {
                        firestoreTrans.set(custRef, {
                            name: customerName,
                            phone: newStoreData.phone,
                            address: newStoreData.address,
                            pricingTier: newStoreData.requestedTier, 
                            latitude: newStoreData.latitude,
                            longitude: newStoreData.longitude,
                            status: 'NOO_ACTIVE', 
                            mappedBy: finalAgentName,
                            mappedAt: serverTimestamp(),
                            hasPhotoProof: true,
                            storeImage: newStoreData.photoUrl || ''
                        });
                    } else {
                        firestoreTrans.set(custRef, {
                            name: customerName,
                            latitude: newStoreData.latitude || null,
                            longitude: newStoreData.longitude || null,
                            pricingTier: 'Ecer', 
                            status: 'WALK_IN',
                            mappedBy: finalAgentName,
                            mappedAt: serverTimestamp()
                        });
                    }
                }
            }); 

            await logAudit("SALE", `Sold to ${customerName} via ${paymentType}`); 
            if (!manualData && setCart) setCart([]); 
            triggerCapy("Sale Recorded! Database & Vehicle Updated. 💰"); 
            return finalAgentName; 
        } catch(err) { 
            console.error("TRANSACTION ERROR:", err);
            alert("Transaction Failed: " + err); 
            throw err; 
        } 
    };

    const handleMerchantSale = async (custName, payMethod, cartItems, newStoreData = null, proofPayload = null) => { 
        const inputTrimmed = custName ? custName.trim().toLowerCase() : "Walk-in Customer";
        const existingProfile = customers.find(c => c.name.toLowerCase() === inputTrimmed || c.name.toLowerCase().includes(inputTrimmed));
        
        let finalName = existingProfile ? existingProfile.name : (custName || "Walk-in Customer").replace(/\b\w/g, l => l.toUpperCase());

        if (!existingProfile && finalName !== "Walk-in Customer") {
            const hasEcer = cartItems.some(i => i.priceTier === 'Ecer');
            const hasGrosir = cartItems.some(i => i.priceTier === 'Grosir');
            
            if (hasEcer) finalName += " (Individual)";
            else if (hasGrosir) finalName += " (Wholesale)";
            else finalName += " (Retail)";
        }

        return await processTransaction(null, { customerName: finalName, paymentType: payMethod, cart: cartItems, newStoreData, proofPayload });
    };

    const handleConsignmentPayment = async (customerName, itemsPaid, amountPaid) => { 
        try { 
            await addDoc(collection(db, `artifacts/${appId}/users/${userId}/transactions`), { 
                date: getCurrentDate(), customerName, paymentType: "Cash", itemsPaid, amountPaid, type: 'CONSIGNMENT_PAYMENT', timestamp: serverTimestamp() 
            }); 
            triggerCapy("Payment recorded!"); 
        } catch (err) { console.error(err); } 
    };

    const handleConsignmentReturn = async (customerName, itemsReturned, refundValue) => { 
        try { 
            await runTransaction(db, async (t) => { 
                for(const item of itemsReturned) { 
                    const prodRef = doc(db, `artifacts/${appId}/users/${userId}/products`, item.productId); 
                    const prodDoc = await t.get(prodRef); 
                    if(prodDoc.exists()) t.update(prodRef, { stock: prodDoc.data().stock + (item.qty * 1) }); 
                } 
                const returnRef = doc(collection(db, `artifacts/${appId}/users/${userId}/transactions`)); 
                t.set(returnRef, { date: getCurrentDate(), customerName, items: itemsReturned, total: -refundValue, type: 'RETURN', timestamp: serverTimestamp() }); 
            }); 
            triggerCapy("Return Processed!"); 
        } catch (err) { console.error(err); } 
    };

    return {
        processTransaction,
        handleMerchantSale,
        handleConsignmentPayment,
        handleConsignmentReturn
    };
}